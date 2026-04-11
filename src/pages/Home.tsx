import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { CONSOLES } from '../lib/aicos'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  const { role } = useAuth()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>
            AIOS / Main Dashboard
          </div>
          <h1 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 34, lineHeight: 1.1 }}>Console Hub</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--grey)', fontSize: 14, maxWidth: 760 }}>
            Select a console, then drill into the functionality pages inside it.
          </p>
        </div>
        <div style={{ fontFamily: 'DM Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--grey)' }}>
          Role: {role || 'guest'}
        </div>
      </header>

      <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {CONSOLES.map(console => {
          return (
            <Link
              key={console.key}
              to={console.route}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid var(--border2)',
                borderRadius: 16,
                background: 'var(--bg2)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                minHeight: 190,
                boxShadow: '0 0 0 rgba(0,0,0,0)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--grey)' }}>
                    {console.key}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{console.title}</div>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(0,229,195,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={16} color="var(--teal)" />
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, flex: 1 }}>{console.description}</div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {console.tables.slice(0, 3).map(item => (
                  <span
                    key={item}
                    style={{
                      fontFamily: 'DM Mono',
                      fontSize: 9,
                      color: 'var(--grey)',
                      border: '1px solid var(--border2)',
                      borderRadius: 999,
                      padding: '4px 8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
