import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AICOS } from '../lib/aicos'
import { getVisibleSopCategories, getVisibleTemplateCategories } from '../lib/library'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
import ConsoleLibraryPanel from '../components/ConsoleLibraryPanel'
import { Users, Target, CheckSquare, FileText, Search, ArrowRight, Bot, Library, ClipboardList, MessageSquare } from 'lucide-react'

const MODULES = [
  {
    title: 'Scraper',
    path: '/distribution/scraper',
    description: 'Start Apify runs, collect businesses, and push clean prospects into the CRM.',
    icon: Bot,
  },
  {
    title: 'Prospects',
    path: '/distribution/prospects',
    description: 'Score, stage, batch, and manage daily prospect movement.',
    icon: Users,
  },
  {
    title: 'Outreach',
    path: '/distribution/outreach',
    description: 'Draft and send templated outreach from the daily batch.',
    icon: MessageSquare,
  },
  {
    title: 'CRM Pipeline',
    path: '/distribution/crm',
    description: 'Move prospects through the pipeline and manage follow-up state.',
    icon: ClipboardList,
  },
  {
    title: 'MJR Studio',
    path: '/distribution/studio',
    description: 'Generate Missed Jobs Reports for prospects and leads.',
    icon: FileText,
  },
  {
    title: 'Templates',
    path: '/distribution/templates',
    description: 'Maintain outreach templates and attached files.',
    icon: Library,
  },
  {
    title: 'SOPs',
    path: '/distribution/sops',
    description: 'Keep the acquisition playbook, rules, and process docs in order.',
    icon: CheckSquare,
  },
]

export default function DistributionConsole() {
  const { metadata_id } = useAuth()
  const scope = 'distribution' as const
  const [prospects, setProspects] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [sops, setSops] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, won: 0, progress: 0 })
  const [metrics, setMetrics] = useState<any[]>([])
  const db = supabase as any

  useEffect(() => { load() }, [metadata_id])

  async function load() {
    const templateCategories = getVisibleTemplateCategories(scope)
    const sopCategories = getVisibleSopCategories(scope)

    const templateQuery = templateCategories.length > 0
      ? db.from(AICOS.tables.templates).select('id, title, category, updated_at').in('category', templateCategories).order('updated_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] })

    const sopQuery = sopCategories.length > 0
      ? db.from(AICOS.tables.sops).select('id, title, category, status, sop_number, updated_at').in('category', sopCategories).eq('status', 'active').order('sop_number', { ascending: true })
      : Promise.resolve({ data: [] as any[] })

    const [{ data: prospectRows }, { data: metricRows }, { data: progressRows }, { data: templateRows }, { data: sopRows }] = await Promise.all([
      db.from(AICOS.tables.prospects).select('id, business_name, status, pipeline_stage, icp_tier, vertical, updated_at').order('updated_at', { ascending: false }).limit(8),
      db.from(AICOS.tables.distributionMetrics).select('*').order('date_key', { ascending: false }).limit(7),
      db.from(AICOS.tables.distributionProgress).select('*').limit(40),
      templateQuery,
      sopQuery,
    ])

    const allProspects = prospectRows || []
    const active = allProspects.filter((p: any) => p.status !== 'archived').length
    const won = allProspects.filter((p: any) => p.status === 'closed_won').length
    const completed = (progressRows || []).filter((p: any) => p.is_completed).length
    const totalProgress = progressRows?.length || 0

    setProspects(allProspects)
    setTemplates(templateRows || [])
    setSops(sopRows || [])
    setStats({ total: allProspects.length, active, won, progress: totalProgress ? Math.round((completed / totalProgress) * 100) : 0 })
    setMetrics(metricRows || [])
  }

  return (
    <ConsoleShell
      badge="AIOS / Distribution"
      title="Distribution Console"
      subtitle="Prospect flow, outreach execution, scoring, and daily acquisition performance."
      stats={[
        { label: 'Prospects', value: stats.total, icon: Users },
        { label: 'Active', value: stats.active, icon: Target },
        { label: 'Closed Won', value: stats.won, icon: CheckSquare },
        { label: 'Progress', value: `${stats.progress}%`, icon: FileText },
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

      <Panel title="Operational Focus">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <MiniMetric label="Table" value={AICOS.tables.prospects} />
          <MiniMetric label="Table" value={AICOS.tables.distributionMetrics} />
          <MiniMetric label="Table" value={AICOS.tables.distributionProgress} />
          <MiniMetric label="Table" value={AICOS.tables.templates} />
          <MiniMetric label="Table" value={AICOS.tables.sops} />
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

      <ConsoleLibraryPanel templates={templates} sops={sops} scopeLabel="Distribution Scope" />
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
