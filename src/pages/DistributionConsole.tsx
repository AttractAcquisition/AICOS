import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AICOS } from '../lib/aicos'
import { ConsoleShell, Panel } from '../components/ConsoleShell'
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
    path: '/templates',
    description: 'Open the role-aware template library.',
    icon: Library,
  },
  {
    title: 'SOPs',
    path: '/sops',
    description: 'Open the role-aware SOP library.',
    icon: CheckSquare,
  },
]

export default function DistributionConsole() {
  const { metadata_id } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, won: 0, progress: 0 })
  const db = supabase as any

  useEffect(() => { load() }, [metadata_id])

  async function load() {
    const [{ data: prospectRows }, { data: progressRows }] = await Promise.all([
      db.from(AICOS.tables.prospects).select('id, business_name, status, pipeline_stage, icp_tier, vertical, updated_at').order('updated_at', { ascending: false }).limit(8),
      db.from(AICOS.tables.distributionProgress).select('*').limit(40),
    ])

    const allProspects = prospectRows || []
    const active = allProspects.filter((p: any) => p.status !== 'archived').length
    const won = allProspects.filter((p: any) => p.status === 'closed_won').length
    const completed = (progressRows || []).filter((p: any) => p.is_completed).length
    const totalProgress = progressRows?.length || 0

    setStats({ total: allProspects.length, active, won, progress: totalProgress ? Math.round((completed / totalProgress) * 100) : 0 })
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
