import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AICOS } from '../lib/aicos'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import { Users, Target, CheckSquare, FileText, Search } from 'lucide-react'

export default function DistributionConsole() {
  const { role, metadata_id } = useAuth()
  const [prospects, setProspects] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, won: 0, progress: 0 })
  const [metrics, setMetrics] = useState<any[]>([])
  const db = supabase as any

  useEffect(() => { load() }, [role, metadata_id])

  async function load() {
    const [{ data: prospectRows }, { data: metricRows }, { data: progressRows }] = await Promise.all([
      db.from(AICOS.tables.prospects).select('id, business_name, status, pipeline_stage, icp_tier, vertical, updated_at').order('updated_at', { ascending: false }).limit(8),
      db.from(AICOS.tables.distributionMetrics).select('*').order('date_key', { ascending: false }).limit(7),
      db.from(AICOS.tables.distributionProgress).select('*').limit(40),
    ])

    const allProspects = prospectRows || []
    const active = allProspects.filter((p: any) => p.status !== 'archived').length
    const won = allProspects.filter((p: any) => p.status === 'closed_won').length
    const completed = (progressRows || []).filter((p: any) => p.is_completed).length
    const totalProgress = progressRows?.length || 0

    setProspects(allProspects)
    setStats({ total: allProspects.length, active, won, progress: totalProgress ? Math.round((completed / totalProgress) * 100) : 0 })
    setMetrics(metricRows || [])
  }

  return (
    <ConsoleShell
      badge="AICOS / Distribution"
      title="Distribution Console"
      subtitle="Prospect flow, outreach execution, scoring, and daily acquisition performance."
      stats={[
        { label: 'Prospects', value: stats.total, icon: Users },
        { label: 'Active', value: stats.active, icon: Target },
        { label: 'Closed Won', value: stats.won, icon: CheckSquare },
        { label: 'Progress', value: `${stats.progress}%`, icon: FileText },
      ]}
    >
      <Panel title="Operational Focus">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MiniMetric label="Table" value={AICOS.tables.prospects} />
          <MiniMetric label="Table" value={AICOS.tables.distributionMetrics} />
          <MiniMetric label="Table" value={AICOS.tables.distributionProgress} />
          <MiniMetric label="Table" value={AICOS.tables.templates} />
        </div>
      </Panel>

      <Panel title="Latest Prospects">
        <div style={{ display: 'grid', gap: 10 }}>
          {prospects.map(p => (
            <Row key={p.id} left={p.business_name} right={`${p.pipeline_stage || 'First Touch'} · ${p.icp_tier || 'UNSCORED'}`} />
          ))}
          {prospects.length === 0 && <Empty label="No prospects yet" />}
        </div>
      </Panel>

      <Panel title="Recent Distribution Metrics">
        <div style={{ display: 'grid', gap: 10 }}>
          {metrics.map(m => (
            <Row key={m.id} left={m.date_key} right={`MJRs: ${m.mjrs_sent || 0} · Calls: ${m.calls_booked || 0} · Outreach: ${m.outreach_sent || 0}`} />
          ))}
          {metrics.length === 0 && <Empty label="No metrics yet" />}
        </div>
      </Panel>
    </ConsoleShell>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg2)' }}>
      <Search size={14} color="var(--teal)" />
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
