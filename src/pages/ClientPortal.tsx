import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AICOS } from '../lib/aicos'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import { FolderOpen, MessageSquare, CheckSquare, FileText, Briefcase } from 'lucide-react'

export default function ClientPortal() {
  const { metadata_id, role } = useAuth()
  const [client, setClient] = useState<any | null>(null)
  const [sprint, setSprint] = useState<any | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const db = supabase as any

  useEffect(() => { if (metadata_id) load() }, [metadata_id, role])

  async function load() {
    if (!metadata_id) return
    const [clientRes, sprintRes, taskRes, messageRes, documentRes] = await Promise.all([
      db.from(AICOS.tables.clients).select('*').eq('id', metadata_id).maybeSingle(),
      db.from(AICOS.tables.sprints).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from(AICOS.tables.portalTasks).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(10),
      db.from(AICOS.tables.portalMessages).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(10),
      db.from(AICOS.tables.portalDocuments).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(10),
    ])

    setClient(clientRes.data || null)
    setSprint(sprintRes.data || null)
    setTasks(taskRes.data || [])
    setMessages(messageRes.data || [])
    setDocuments(documentRes.data || [])
  }

  return (
    <ConsoleShell
      badge="AICOS / Client Portal"
      title="Client Portal"
      subtitle="Client-facing delivery, proof sprint progress, messages, and shared assets."
      stats={[
        { label: 'Client', value: client?.business_name || 'Pending', icon: Briefcase },
        { label: 'Sprint', value: sprint?.status || '—', icon: FolderOpen },
        { label: 'Tasks', value: tasks.length, icon: CheckSquare },
        { label: 'Messages', value: messages.length, icon: MessageSquare },
      ]}
    >
      <Panel title="Mapped Backend Objects">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MiniMetric label="Table" value={AICOS.tables.clients} />
          <MiniMetric label="Table" value={AICOS.tables.sprints} />
          <MiniMetric label="Table" value={AICOS.tables.portalTasks} />
          <MiniMetric label="Table" value={AICOS.tables.portalMessages} />
        </div>
      </Panel>

      <Panel title="Shared Documents">
        <div style={{ display: 'grid', gap: 10 }}>
          {documents.map(d => (
            <Row key={d.id} left={d.file_name} right={`${d.status || 'shared'} · ${d.bucket_name || 'portal-documents'}`} />
          ))}
          {documents.length === 0 && <Empty label="No shared documents yet" />}
        </div>
      </Panel>

      <Panel title="Portal Tasks">
        <div style={{ display: 'grid', gap: 10 }}>
          {tasks.map(t => (
            <Row key={t.id} left={t.title} right={`${t.status || 'pending'} · ${t.due_date || 'no due date'}`} />
          ))}
          {tasks.length === 0 && <Empty label="No portal tasks yet" />}
        </div>
      </Panel>

      <Panel title="Latest Messages">
        <div style={{ display: 'grid', gap: 10 }}>
          {messages.map(m => (
            <Row key={m.id} left={m.message_text} right={m.sender_kind || 'internal'} />
          ))}
          {messages.length === 0 && <Empty label="No portal messages yet" />}
        </div>
      </Panel>
    </ConsoleShell>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg2)' }}>
      <FileText size={14} color="var(--teal)" />
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
