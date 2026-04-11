import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AICOS } from '../lib/aicos'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import { Shield, DollarSign, AlertTriangle, Activity, Users, ArrowRight, Settings, BarChart3, ReceiptText, FileText, ClipboardList } from 'lucide-react'

const MODULES = [
  {
    title: 'Command Center',
    path: '/admin/control',
    description: 'Manage auth roles, client-manager mappings, and infrastructure assignments.',
    icon: Settings,
  },
  {
    title: 'Finance Dashboard',
    path: '/admin/finance',
    description: 'Review monthly revenue, margins, and burn against target.',
    icon: BarChart3,
  },
  {
    title: 'Capital Flow',
    path: '/admin/income',
    description: 'Track ledger entries and daily cash movement.',
    icon: ReceiptText,
  },
  {
    title: 'Templates',
    path: '/templates',
    description: 'Open the role-aware template library.',
    icon: FileText,
  },
  {
    title: 'SOPs',
    path: '/sops',
    description: 'Open the role-aware SOP library.',
    icon: ClipboardList,
  },
]

export default function AdminConsole() {
  const [ops, setOps] = useState<any[]>([])
  const [finance, setFinance] = useState<any[]>([])
  const [alerts, setAlerts] = useState({ approvals: 0, exceptions: 0, integrations: 0 })
  const db = supabase as any

  useEffect(() => { load() }, [])

  async function load() {
    const [opsRes, financeRes, approvalsRes, exceptionsRes, integrationsRes] = await Promise.all([
      db.from(AICOS.views.opsManagerStatus).select('*').order('name', { ascending: true }),
      db.from(AICOS.tables.financialSnapshots).select('*').order('month', { ascending: false }).limit(6),
      db.from(AICOS.tables.approvalLogs).select('id', { count: 'exact', head: true }),
      db.from(AICOS.tables.exceptionLogs).select('id', { count: 'exact', head: true }),
      db.from(AICOS.tables.integrationEvents).select('id', { count: 'exact', head: true }),
    ])

    setOps(opsRes.data || [])
    setFinance(financeRes.data || [])
    setAlerts({
      approvals: approvalsRes.count || 0,
      exceptions: exceptionsRes.count || 0,
      integrations: integrationsRes.count || 0,
    })
  }

  return (
    <ConsoleShell
      badge="AIOS / Admin"
      title="Admin Console"
      subtitle="System health, finance, governance, and live operational control."
      stats={[
        { label: 'Operators', value: ops.length, icon: Users },
        { label: 'Approvals', value: alerts.approvals, icon: Shield },
        { label: 'Exceptions', value: alerts.exceptions, icon: AlertTriangle },
        { label: 'Integrations', value: alerts.integrations, icon: Activity },
      ]}
    >
      <Panel title="Control Room Launchpad">
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
          <MiniMetric label="View" value={AICOS.views.opsManagerStatus} />
          <MiniMetric label="Table" value={AICOS.tables.financialSnapshots} />
          <MiniMetric label="Table" value={AICOS.tables.ledgerEntries} />
          <MiniMetric label="Table" value={AICOS.tables.approvalLogs} />
          <MiniMetric label="Table" value={AICOS.tables.exceptionLogs} />
          <MiniMetric label="Table" value={AICOS.tables.integrationEvents} />
        </div>
      </Panel>

      <Panel title="Ops Manager Status">
        <div style={{ display: 'grid', gap: 10 }}>
          {ops.map(o => (
            <Row key={o.manager_id} left={o.name || o.manager_id} right={`${o.role || 'role'} · ${o.tasks_completed || 0}/${o.total_tasks_assigned || 0} tasks · ${o.last_active || 'no activity'}`} />
          ))}
          {ops.length === 0 && <Empty label="No ops rows yet" />}
        </div>
      </Panel>

      <Panel title="Recent Financial Snapshots">
        <div style={{ display: 'grid', gap: 10 }}>
          {finance.map(f => (
            <Row key={f.id} left={f.month} right={`MRR ${f.gross_mrr || 0} · Profit ${f.net_profit || 0} · Margin ${f.profit_margin || 0}%`} />
          ))}
          {finance.length === 0 && <Empty label="No financial snapshots yet" />}
        </div>
      </Panel>
    </ConsoleShell>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg2)' }}>
      <DollarSign size={14} color="var(--teal)" />
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
