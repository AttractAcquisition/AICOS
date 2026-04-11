import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AICOS } from '../lib/aicos'
import { getVisibleSopCategories, getVisibleTemplateCategories } from '../lib/library'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import ConsoleLibraryPanel from '../components/ConsoleLibraryPanel'
import { FolderOpen, MessageSquare, CheckSquare, FileText, Briefcase, CalendarDays } from 'lucide-react'

export default function ClientPortal() {
  const { metadata_id, role } = useAuth()
  const [client, setClient] = useState<any | null>(null)
  const [sprint, setSprint] = useState<any | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [sops, setSops] = useState<any[]>([])
  const db = supabase as any
  const scope = 'client' as const

  useEffect(() => { if (metadata_id) load() }, [metadata_id, role])

  async function load() {
    if (!metadata_id) return
    const templateCategories = getVisibleTemplateCategories(scope)
    const sopCategories = getVisibleSopCategories(scope)
    const templateQuery = templateCategories.length > 0
      ? db.from(AICOS.tables.templates).select('id, title, category, updated_at').in('category', templateCategories).order('updated_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] })
    const sopQuery = sopCategories.length > 0
      ? db.from(AICOS.tables.sops).select('id, title, category, status, sop_number, updated_at').in('category', sopCategories).eq('status', 'active').order('sop_number', { ascending: true })
      : Promise.resolve({ data: [] as any[] })

    const [clientRes, sprintRes, taskRes, messageRes, documentRes] = await Promise.all([
      db.from(AICOS.tables.clients).select('*').eq('id', metadata_id).maybeSingle(),
      db.from(AICOS.tables.sprints).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from(AICOS.tables.portalTasks).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(10),
      db.from(AICOS.tables.portalMessages).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(10),
      db.from(AICOS.tables.portalDocuments).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(10),
    ])

    const [templateRes, sopRes] = await Promise.all([templateQuery, sopQuery])

    setClient(clientRes.data || null)
    setSprint(sprintRes.data || null)
    setTasks(taskRes.data || [])
    setMessages(messageRes.data || [])
    setDocuments(documentRes.data || [])
    setTemplates(templateRes.data || [])
    setSops(sopRes.data || [])
  }

  return (
    <ConsoleShell
      badge="AIOS / Client Dashboard"
      title="Client Dashboard"
      subtitle="Client-facing delivery progress, messages, and shared assets."
      stats={[
        { label: 'Client', value: client?.business_name || 'Pending', icon: Briefcase },
        { label: 'Sprint', value: sprint?.status || '—', icon: FolderOpen },
        { label: 'Tasks', value: tasks.length, icon: CheckSquare },
        { label: 'Messages', value: messages.length, icon: MessageSquare },
      ]}
    >
      <Panel title="Dashboard Overview">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MiniMetric label="Client" value={client?.business_name || 'Pending'} icon={Briefcase} />
          <MiniMetric label="Current Sprint" value={sprint ? `#${sprint.sprint_number || 1} · ${sprint.status || 'setup'}` : 'No active sprint'} icon={CalendarDays} />
          <MiniMetric label="Tasks" value={tasks.length} icon={CheckSquare} />
          <MiniMetric label="Messages" value={messages.length} icon={MessageSquare} />
          <MiniMetric label="Documents" value={documents.length} icon={FileText} />
        </div>
      </Panel>

      <Panel title="Current Sprint">
        {sprint ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <Row left="Sprint Status" right={sprint.status || 'setup'} />
            <Row left="Start Date" right={sprint.start_date || '—'} />
            <Row left="Leads Generated" right={`${sprint.leads_generated || 0}`} />
            <Row left="Revenue Attributed" right={`R${Number(sprint.revenue_attributed || 0).toLocaleString('en-ZA')}`} />
          </div>
        ) : (
          <Empty label="No active sprint found for this client" />
        )}
      </Panel>

      <Panel title="Mapped Backend Objects">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MiniMetric label="Table" value={AICOS.tables.clients} icon={Briefcase} />
          <MiniMetric label="Table" value={AICOS.tables.sprints} icon={FolderOpen} />
          <MiniMetric label="Table" value={AICOS.tables.portalTasks} icon={CheckSquare} />
          <MiniMetric label="Table" value={AICOS.tables.portalMessages} icon={MessageSquare} />
          <MiniMetric label="Table" value={AICOS.tables.portalDocuments} icon={FileText} />
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

      <ConsoleLibraryPanel templates={templates} sops={sops} scopeLabel="Client Scope" />

      <Panel title="Portal Tasks">
        <div style={{ display: 'grid', gap: 10 }}>
          {tasks.map(t => (
            <Row key={t.id} left={t.title} right={`${t.status || 'pending'} · ${t.due_date || 'no due date'}`} />
          ))}
          {tasks.length === 0 && <Empty label="No tasks yet" />}
        </div>
      </Panel>

      <Panel title="Latest Messages">
        <div style={{ display: 'grid', gap: 10 }}>
          {messages.map(m => (
            <Row key={m.id} left={m.message_text} right={`${m.sender_kind || 'internal'} · ${m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}`} />
          ))}
          {messages.length === 0 && <Empty label="No messages yet" />}
        </div>
      </Panel>
    </ConsoleShell>
  )
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg2)' }}>
      <Icon size={14} color="var(--teal)" />
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
