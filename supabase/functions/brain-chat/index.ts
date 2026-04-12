import { createUserClient, corsHeaders, jsonResponse, requireRole } from '../_shared/supabase.ts'

type KnowledgeDocument = {
  id: string
  title: string
  source_path: string | null
  file_path: string | null
  source_type: string | null
  body: string | null
}

type KnowledgeChunk = {
  id: string
  document_id: string
  chunk_index: number
  content: string
  content_hash: string | null
  metadata: Record<string, unknown> | null
}

type CorpusItem = KnowledgeChunk & {
  document_title: string
  source_path: string | null
  file_path: string | null
  source_type: string | null
}

type BrainQueryBody = {
  query?: string
  conversation_id?: string | null
}

const OPENAI_MODEL = 'gpt-5.4-mini'
const SYSTEM_PROMPT = `You are the internal AICOS Brain for Attract Acquisition.

Rules:
- Answer only from the provided context.
- Be concise, operational, and accurate.
- If the context is insufficient, say what is missing.
- Cite sources inline using [Document Title, chunk #].
- Prefer actionable next steps over generic advice.`

let corpusCache: Promise<CorpusItem[]> | null = null

function normalizeWords(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'what', 'how', 'why', 'when', 'where', 'who', 'a', 'an', 'to', 'of', 'in', 'on', 'is', 'are'].includes(word))
}

function scoreItem(queryWords: string[], query: string, item: CorpusItem) {
  const title = item.document_title.toLowerCase()
  const content = item.content.toLowerCase()
  let score = 0

  for (const word of queryWords) {
    if (title.includes(word)) score += 4
    if (content.includes(word)) score += 1
  }

  if (queryWords.length) {
    const uniqueMatches = new Set(queryWords.filter(word => content.includes(word) || title.includes(word)))
    score += uniqueMatches.size * 1.5
  }

  const phrase = query.toLowerCase().trim()
  if (phrase && content.includes(phrase)) score += 6
  if (phrase && title.includes(phrase)) score += 8

  const lengthPenalty = Math.min(3, Math.max(0, item.content.length / 10000))
  return score - lengthPenalty
}

function buildContext(items: CorpusItem[]) {
  return items.map(item => {
    const source = item.source_path || item.file_path || 'unknown source'
    return `### ${item.document_title} (chunk ${item.chunk_index + 1})\nSource: ${source}\n\n${item.content}`
  }).join('\n\n---\n\n')
}

async function loadCorpus(authHeader: string) {
  if (!corpusCache) {
    corpusCache = (async () => {
      const supabase = createUserClient(authHeader)
      const [docsRes, chunksRes] = await Promise.all([
        supabase
          .from('knowledge_documents')
          .select('id, title, source_path, file_path, source_type, body')
          .order('updated_at', { ascending: false }),
        supabase
          .from('knowledge_chunks')
          .select('id, document_id, chunk_index, content, content_hash, metadata')
          .order('document_id', { ascending: true })
          .order('chunk_index', { ascending: true }),
      ])

      const docs = (docsRes.data ?? []) as KnowledgeDocument[]
      const chunks = (chunksRes.data ?? []) as KnowledgeChunk[]
      const docsById = new Map(docs.map(doc => [doc.id, doc]))

      return chunks.map(chunk => {
        const doc = docsById.get(chunk.document_id)
        return {
          ...chunk,
          document_title: doc?.title ?? 'Unknown Document',
          source_path: doc?.source_path ?? null,
          file_path: doc?.file_path ?? null,
          source_type: doc?.source_type ?? null,
        }
      })
    })()
  }

  return corpusCache
}

async function generateAnswer(query: string, context: string) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      max_output_tokens: 1200,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI request failed: ${text}`)
  }

  const data = await response.json()
  const answer = data.output_text || data.output?.[0]?.content?.[0]?.text || ''
  return String(answer)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  try {
    const gate = await requireRole(req, ['admin'])
    if ('error' in gate) return gate.error

    const body = (await req.json()) as BrainQueryBody
    const query = String(body.query || '').trim()
    if (!query) return jsonResponse({ success: false, error: 'query is required' }, 400)

    const corpus = await loadCorpus(gate.authHeader)
    if (!corpus.length) {
      return jsonResponse({ success: false, error: 'Knowledge base is empty. Import the corpus first.' }, 400)
    }

    const queryWords = normalizeWords(query)
    const scored = corpus
      .map(item => {
        const lexical = scoreItem(queryWords, query, item)
        return { item, score: lexical }
      })
      .sort((a, b) => b.score - a.score)
      .filter(entry => entry.score > 0)
      .slice(0, 8)

    const topItems = scored.length ? scored : corpus.slice(0, 5).map(item => ({ item, score: 0 }))
    const selectedItems = topItems.map(entry => entry.item)
    const context = buildContext(selectedItems)
    const answer = await generateAnswer(query, context)

    const citations = topItems.map(({ item, score }) => ({
      document_id: item.document_id,
      document_title: item.document_title,
      source_path: item.source_path,
      file_path: item.file_path,
      chunk_index: item.chunk_index,
      score,
    }))

    const supabase = createServiceClient()
    const { data: queryRow, error: insertError } = await supabase
      .from('knowledge_queries')
      .insert({
        user_profile_id: null,
        query_text: query,
        answer_text: answer,
        model_name: OPENAI_MODEL,
        citations,
        retrieved_chunk_ids: selectedItems.map(item => item.id),
        response_meta: {
          conversation_id: body.conversation_id ?? null,
          source_count: selectedItems.length,
          retrieval_mode: 'lexical',
        },
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[brain-chat] query log insert failed', insertError)
    }

    return jsonResponse({
      success: true,
      answer,
      sources: citations,
      model_name: OPENAI_MODEL,
      query_id: queryRow?.id ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[brain-chat]', message)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
