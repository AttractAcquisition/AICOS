import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const ROOT = '/Users/alex/.openclaw/workspace'
const ZIP_PATH = path.join(ROOT, 'aa-ai', 'AttractAcquisition-Docs.zip')
const ENV_PATH = path.join(ROOT, 'AICOS_repo', '.env.local')

function readEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return env
}

function stripHtml(html) {
  return sanitizeUnicode(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeText(text) {
  return sanitizeUnicode(text)
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function titleFromPath(filePath) {
  const base = path.basename(filePath, path.extname(filePath))
  return sanitizeUnicode(base)
    .replace(/^\d+[a-z]?[_\-\s]*/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || base
}

function slugFromPath(filePath) {
  return filePath
    .replace(/^Current\/Documents\//, '')
    .replace(/\.[^.]+$/, '')
    .replace(/\/+/g, '/')
}

function chunkText(text, size = 1000, overlap = 180) {
  const cleaned = normalizeText(text)
  if (!cleaned) return []
  const chunks = []
  let index = 0
  let start = 0
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + size)
    const slice = cleaned.slice(start, end).trim()
    if (slice) chunks.push({ index, content: slice })
    if (end >= cleaned.length) break
    start = Math.max(0, end - overlap)
    index += 1
  }
  return chunks
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function sanitizeUnicode(value) {
  return String(value ?? '').replace(/[\uD800-\uDFFF]/g, '')
}

function shouldImport(filePath) {
  return /Current\/Documents\//.test(filePath) && /\.(html?|md|txt|csv)$/i.test(filePath)
}

async function main() {
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`Missing corpus zip at ${ZIP_PATH}`)
  }

  const env = readEnvFile(ENV_PATH)
  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: login, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'attractacquisition@gmail.com',
    password: 'Admin@Acq123',
  })
  if (loginError) throw loginError

  const admin = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${login.session.access_token}` } },
    auth: { persistSession: false },
  })

  console.log('Clearing existing knowledge corpus...')
  await admin.from('knowledge_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('knowledge_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const fileList = execFileSync('unzip', ['-Z1', ZIP_PATH], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 })
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(shouldImport)

  console.log(`Found ${fileList.length} importable files`)

  const docs = []
  for (const filePath of fileList) {
    const raw = execFileSync('unzip', ['-p', ZIP_PATH, filePath], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 })
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const text = ext === 'html' || ext === 'htm' ? stripHtml(raw) : normalizeText(raw)
    if (!text) continue

    docs.push({
      title: titleFromPath(filePath),
      slug: slugFromPath(filePath).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      source_type: ext,
      source_path: filePath,
      file_path: filePath,
      body: text,
      status: 'indexed',
      version: '1.0',
      tags: filePath.split('/').slice(0, 4).filter(Boolean),
      metadata: {
        source: 'aa-ai-zip',
        original_path: sanitizeUnicode(filePath),
        extension: sanitizeUnicode(ext),
      },
      chunks: chunkText(text),
    })
  }

  console.log(`Prepared ${docs.length} documents`)

  const docRows = docs.map(doc => ({
    title: doc.title,
    slug: doc.slug,
    source_type: doc.source_type,
    source_path: doc.source_path,
    file_path: doc.file_path,
    body: doc.body,
    status: doc.status,
    version: doc.version,
    tags: doc.tags,
    metadata: doc.metadata,
    created_by_profile_id: login.user?.id ?? null,
    indexed_at: new Date().toISOString(),
  }))

  const insertedDocs = []
  for (let i = 0; i < docRows.length; i += 25) {
    const batch = docRows.slice(i, i + 25)
    const { data, error } = await admin.from('knowledge_documents').insert(batch).select('id, slug, title')
    if (error) throw error
    insertedDocs.push(...(data ?? []))
    console.log(`Inserted doc batch ${i / 25 + 1}/${Math.ceil(docRows.length / 25)}`)
  }

  const docsBySlug = new Map(insertedDocs.map(doc => [doc.slug, doc.id]))
  const chunkRows = []
  for (const doc of docs) {
    const docId = docsBySlug.get(doc.slug)
    if (!docId) continue
    doc.chunks.forEach(chunk => {
      chunkRows.push({
        document_id: docId,
        chunk_index: chunk.index,
        content: chunk.content,
        content_hash: sha256(`${doc.slug}:${chunk.index}:${chunk.content}`),
        metadata: {
          title: doc.title,
          source_path: doc.source_path,
          file_path: doc.file_path,
          source_type: doc.source_type,
          tags: doc.tags,
        },
      })
    })
  }

  console.log(`Prepared ${chunkRows.length} chunks`)

  for (let i = 0; i < chunkRows.length; i += 100) {
    const batch = chunkRows.slice(i, i + 100)
    const { error } = await admin.from('knowledge_chunks').insert(batch)
    if (error) throw error
    console.log(`Inserted chunk batch ${i / 100 + 1}/${Math.ceil(chunkRows.length / 100)}`)
  }

  console.log('Knowledge corpus import complete.')
  console.log({ documents: docs.length, chunks: chunkRows.length })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
