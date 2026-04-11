import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AICOS } from '../lib/aicos'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import { Brain, FileText, Search, Layers3, Paperclip, BookOpen, FolderOpen, MessageSquare, ArrowRight } from 'lucide-react'

const MODULES = [
  {
    title: 'Brain Chat',
    path: '/brain/chat',
    description: 'Ask the knowledge relay to draft, audit, or explain systems.',
    icon: MessageSquare,
  },
  {
    title: 'Prompt Assistant',
    path: '/brain/prompts',
    description: 'Use quick prompts for SOPs, funnels, objections, and workflows.',
    icon: Layers3,
  },
  {
    title: 'Knowledge Repository',
    path: '/brain/repository',
    description: 'Browse the local asset tree and raw reference files.',
    icon: FolderOpen,
  },
  {
    title: 'Template Library',
    path: '/brain/templates',
    description: 'Manage template content, linked files, and rendered previews.',
    icon: FileText,
  },
  {
    title: 'SOP Library',
    path: '/brain/sops',
    description: 'Keep the operational playbook clean and current.',
    icon: BookOpen,
  },
  {
    title: 'Template Viewer',
    path: '/template-view',
    description: 'Preview raw HTML templates in a separate viewer.',
    icon: Paperclip,
  },
]

export default function BrainConsole() {
  const [docs, setDocs] = useState<any[]>([])
  const [queries, setQueries] = useState<any[]>([])
  const [chunks, setChunks] = useState<any[]>([])
  const db = supabase as any

  useEffect(() => { load() }, [])

  async function load() {
    const [docRes, queryRes, chunkRes] = await Promise.all([
      db.from(AICOS.tables.knowledgeDocuments).select('id, title, source_type, status, indexed_at').order('created_at', { ascending: false }).limit(8),
      db.from(AICOS.tables.knowledgeQueries).select('id, query_text, created_at, model_name').order('created_at', { ascending: false }).limit(8),
      db.from(AICOS.tables.knowledgeChunks).select('id, chunk_index, document_id').order('created_at', { ascending: false }).limit(8),
    ])

    setDocs(docRes.data || [])
    setQueries(queryRes.data || [])
    setChunks(chunkRes.data || [])
  }

  return (
    <ConsoleShell
      badge="AIOS / Brain"
      title="Brain / Knowledge Console"
      subtitle="Canonical documents, vector chunks, retrieval logs, SOPs, templates, and file assets."
      stats={[
        { label: 'Docs', value: docs.length, icon: FileText },
        { label: 'Queries', value: queries.length, icon: Search },
        { label: 'Chunks', value: chunks.length, icon: Layers3 },
        { label: 'Assets', value: AICOS.tables.assets, icon: Paperclip },
      ]}
    >
      <Panel title="Knowledge Launchpad">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {MODULES.map(module => {
            const Icon = module.icon
            return (
              <Link
                key={module.path}
                to={module.path}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid var(--border2)',
                  borderRadius: 12,
                  background: 'var(--bg2)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  minHeight: 150,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{module.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, lineHeight: 1.5 }}>{module.description}</div>
                  </div>
                  <Icon size={16} color="var(--teal)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--teal)', fontFamily: 'DM Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'auto' }}>
                  Open module <ArrowRight size={12} />
                </div>
              </Link>
            )
          })}
        </div>
      </Panel>

      <Panel title="Mapped Backend Objects">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MiniMetric label="Table" value={AICOS.tables.knowledgeDocuments} />
          <MiniMetric label="Table" value={AICOS.tables.knowledgeChunks} />
          <MiniMetric label="Table" value={AICOS.tables.knowledgeQueries} />
          <MiniMetric label="Table" value={AICOS.tables.templates} />
        </div>
      </Panel>

      <Panel title="Knowledge Documents">
        <div style={{ display: 'grid', gap: 10 }}>
          {docs.map(d => (
            <Row key={d.id} left={d.title} right={`${d.source_type || 'doc'} · ${d.status || 'draft'}`} />
          ))}
          {docs.length === 0 && <Empty label="No knowledge documents yet" />}
        </div>
      </Panel>

      <Panel title="Recent Queries">
        <div style={{ display: 'grid', gap: 10 }}>
          {queries.map(q => (
            <Row key={q.id} left={q.query_text} right={`${q.model_name || 'model'} · ${q.created_at || ''}`} />
          ))}
          {queries.length === 0 && <Empty label="No queries yet" />}
        </div>
      </Panel>

      <Panel title="Recent Chunks">
        <div style={{ display: 'grid', gap: 10 }}>
          {chunks.map(c => (
            <Row key={c.id} left={`Document ${c.document_id}`} right={`Chunk ${c.chunk_index}`} />
          ))}
          {chunks.length === 0 && <Empty label="No chunks yet" />}
        </div>
      </Panel>
    </ConsoleShell>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg2)' }}>
      <Brain size={14} color="var(--teal)" />
      <div>
        <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--white)' }}>{value}</div>
      </div>
    </div>
  )
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10 }}>
      <strong style={{ fontSize: 14 }}>{left}</strong>
      <span style={{ fontSize: 12, color: 'var(--grey)' }}>{right}</span>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: 18, color: 'var(--grey)', fontSize: 13, border: '1px dashed var(--border2)', borderRadius: 10 }}>{label}</div>
}
