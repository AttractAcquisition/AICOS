import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AICOS } from '../lib/aicos'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import { Briefcase, Activity, MessageSquare, FileText, CheckCircle2, Users, ArrowRight, ShieldCheck, Layers3 } from 'lucide-react'

const MODULES = [
  {
    title: 'Clients',
    path: '/delivery/clients',
    description: 'Manage client records, account managers, tiers, and notes.',
    icon: Briefcase,
  },
  {
    title: 'Proof Sprint',
    path: '/delivery/sprints',
    description: 'Run the sprint workflow and drill into daily performance.',
    icon: Layers3,
  },
  {
    title: 'Delivery Portal',
    path: '/delivery/portal',
    description: 'Assign portal tasks, upload files, and keep the delivery thread active.',
    icon: MessageSquare,
  },
  {
    title: 'Client Portal',
    path: '/portal',
    description: 'Open the client-facing portal surface.',
    icon: ShieldCheck,
  },
  {
    title: 'Proof Brand',
    path: '/delivery/proof-brand',
    description: 'Work the Proof Brand install and upgrade path.',
    icon: FileText,
  },
  {
    title: 'Authority Brand',
    path: '/delivery/authority-brand',
    description: 'Move clients into the authority layer.',
    icon: Activity,
  },
]

export default function DeliveryConsole() {
  const { role, metadata_id } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [sprints, setSprints] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [summary, setSummary] = useState({ total: 0, active: 0, portal: 0, complete: 0, docs: 0 })
  const db = supabase as any

  useEffect(() => { load() }, [role, metadata_id])

  async function load() {
    const [clientRes, sprintRes, metricRes, portalRes, msgRes, docRes, progressRes] = await Promise.all([
      db.from(AICOS.tables.clients).select('id, business_name, status, tier, monthly_retainer, upsell_ready_flag, account_manager').order('created_at', { ascending: false }).limit(8),
      db.from(AICOS.tables.sprints).select('id, client_name, status, sprint_number, start_date, revenue_attributed, leads_generated').order('created_at', { ascending: false }).limit(8),
      db.from(AICOS.tables.deliveryMetrics).select('*').order('date_key', { ascending: false }).limit(7),
      db.from(AICOS.tables.portalTasks).select('id, status').limit(50),
      db.from(AICOS.tables.portalMessages).select('id').limit(50),
      db.from(AICOS.tables.portalDocuments).select('id').limit(50),
      db.from(AICOS.tables.deliveryProgress).select('*').limit(40),
    ])

    const clientRows = clientRes.data || []
    const sprintRows = sprintRes.data || []
    const metricRows = metricRes.data || []
    const portalRows = portalRes.data || []
    const messageRows = msgRes.data || []
    const documentRows = docRes.data || []
    const progressRows = progressRes.data || []

    setClients(clientRows)
    setSprints(sprintRows)
    setMetrics(metricRows)
    setSummary({
      total: clientRows.length,
      active: clientRows.filter((c: any) => c.status === 'active').length,
      portal: portalRows.length + messageRows.length + documentRows.length + progressRows.length,
      complete: sprintRows.filter((s: any) => s.status === 'complete').length,
      docs: documentRows.length,
    })
  }

  return (
    <ConsoleShell
      badge="AIOS / Delivery"
      title="Delivery Console"
      subtitle="Client delivery, sprint execution, portal work, and retention systems."
      stats={[
        { label: 'Clients', value: summary.total, icon: Users },
        { label: 'Active', value: summary.active, icon: Briefcase },
        { label: 'Portal Work', value: summary.portal, icon: MessageSquare },
        { label: 'Completed Sprints', value: summary.complete, icon: CheckCircle2 },
      ]}
    >
      <Panel title="Functionality Launchpad">
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
          <MiniMetric label="Table" value={AICOS.tables.clients} />
          <MiniMetric label="Table" value={AICOS.tables.sprints} />
          <MiniMetric label="Table" value={AICOS.tables.deliveryMetrics} />
          <MiniMetric label="Table" value={AICOS.tables.deliveryProgress} />
          <MiniMetric label="Table" value={AICOS.tables.portalTasks} />
          <MiniMetric label="Table" value={AICOS.tables.portalMessages} />
        </div>
      </Panel>

      <Panel title="Latest Clients">
        <div style={{ display: 'grid', gap: 10 }}>
          {clients.map(c => (
            <Row key={c.id} left={c.business_name} right={`${c.tier || 'Tier'} · ${c.status || 'active'} · ${c.monthly_retainer ? `R${c.monthly_retainer}` : 'no retainer yet'}`} />
          ))}
          {clients.length === 0 && <Empty label="No clients yet" />}
        </div>
      </Panel>

      <Panel title="Active Sprints">
        <div style={{ display: 'grid', gap: 10 }}>
          {sprints.map(s => (
            <Row key={s.id} left={`${s.client_name || 'Client'} · Sprint ${s.sprint_number || 1}`} right={`${s.status || 'setup'} · Leads ${s.leads_generated || 0} · Revenue ${s.revenue_attributed || 0}`} />
          ))}
          {sprints.length === 0 && <Empty label="No sprints yet" />}
        </div>
      </Panel>

      <Panel title="Delivery Metrics">
        <div style={{ display: 'grid', gap: 10 }}>
          {metrics.map(m => (
            <Row key={m.id} left={m.date_key} right={`Profile visits ${m.profile_visits || 0} · Bookings ${m.appointments_booked || 0} · Cash ${m.cash_collected || 0}`} />
          ))}
          {metrics.length === 0 && <Empty label="No delivery metrics yet" />}
        </div>
      </Panel>
    </ConsoleShell>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
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
