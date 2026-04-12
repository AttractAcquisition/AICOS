import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AICOS } from '../lib/aicos'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import { Shield, DollarSign, AlertTriangle, Activity, ArrowRight, Settings, BarChart3, ReceiptText, FileText, ClipboardList } from 'lucide-react'
import ExternalLinksGrid from '../components/ExternalLinksGrid'
import { getExternalLinksForConsole } from '../lib/external-links'

const MODULES = [
  {
    title: 'Command Center',
    path: '/admin/control',
    description: 'Manage auth roles, client-manager mappings, and infrastructure assignments.',
    icon: Settings,
  },
  {
    title: 'Capital Flow',
    path: '/admin/income',
    description: 'Track transaction movement and cash flow.',
    icon: ReceiptText,
  },
  {
    title: 'Finance Dashboard',
    path: '/admin/finance',
    description: 'Review monthly revenue, margins, and burn against target.',
    icon: BarChart3,
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
  const [alerts, setAlerts] = useState({ approvals: 0, exceptions: 0, integrations: 0 })
  const db = supabase as any

  useEffect(() => { load() }, [])

  async function load() {
    const [approvalsRes, exceptionsRes, integrationsRes] = await Promise.all([
      db.from(AICOS.tables.approvalLogs).select('id', { count: 'exact', head: true }),
      db.from(AICOS.tables.exceptionLogs).select('id', { count: 'exact', head: true }),
      db.from(AICOS.tables.integrationEvents).select('id', { count: 'exact', head: true }),
    ])

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

      <Panel title="External Software Links">
        <ExternalLinksGrid links={getExternalLinksForConsole('admin')} />
      </Panel>

      <Panel title="Mapped Backend Objects">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MiniMetric label="Table" value={AICOS.tables.financialSnapshots} />
          <MiniMetric label="Table" value={AICOS.tables.ledgerEntries} />
          <MiniMetric label="Table" value={AICOS.tables.approvalLogs} />
          <MiniMetric label="Table" value={AICOS.tables.exceptionLogs} />
          <MiniMetric label="Table" value={AICOS.tables.integrationEvents} />
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
