import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type StatCardSpec = {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
}

type ConsoleShellProps = {
  title: string
  subtitle: string
  badge: string
  stats: StatCardSpec[]
  children: ReactNode
}

export function ConsoleShell({ title, subtitle, badge, stats, children }: ConsoleShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>
            {badge}
          </div>
          <h1 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 34, lineHeight: 1.1 }}>{title}</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--grey)', fontSize: 14, maxWidth: 780 }}>{subtitle}</p>
        </div>
      </header>

      <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {stat.label}
                </div>
                {Icon ? <Icon size={14} color="var(--teal)" /> : null}
              </div>
              <div style={{ fontFamily: 'Playfair Display', fontSize: 28, lineHeight: 1, color: 'var(--white)' }}>
                {stat.value}
              </div>
              {stat.hint ? <div style={{ fontSize: 12, color: 'var(--grey2)' }}>{stat.hint}</div> : null}
            </div>
          )
        })}
      </section>

      <div style={{ display: 'grid', gap: 20 }}>
        {children}
      </div>
    </div>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: 20 }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey)', marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </section>
  )
}
