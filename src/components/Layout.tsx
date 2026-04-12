import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ROUTE_CONFIG } from '../lib/route-config'
import { Home, LogOut } from 'lucide-react'

export default function Layout() {
  const { role, signOut } = useAuth()
  const location = useLocation()
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`

  const routes = Object.values(ROUTE_CONFIG).filter(route => route.roles.includes((role || 'client') as any))
  const activeHome = location.pathname === '/' || location.pathname === '/dashboard'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside style={{ borderRight: '1px solid var(--border2)', padding: 20, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <img
            src={logoSrc}
            alt="Attract Acquisition"
            style={{ width: 48, height: 48, objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--grey)' }}>AIOS</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Attract Acquisition OS</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              textDecoration: 'none',
              border: `1px solid ${activeHome ? 'var(--teal)' : 'var(--border2)'}`,
              background: activeHome ? 'rgba(0,229,195,0.05)' : 'var(--bg2)',
              color: 'var(--white)',
            }}
          >
            <Home size={16} color={activeHome ? 'var(--teal)' : 'var(--grey)'} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Main Dashboard</div>
              <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)' }}>Console Hub</div>
            </div>
          </Link>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {routes.map(route => {
            const Icon = route.icon
            const active = location.pathname === route.path || location.pathname.startsWith(`${route.path}/`)
            return (
              <Link
                key={route.path}
                to={route.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  border: `1px solid ${active ? 'var(--teal)' : 'var(--border2)'}`,
                  background: active ? 'rgba(0,229,195,0.05)' : 'var(--bg2)',
                  color: 'var(--white)',
                }}
              >
                <Icon size={16} color={active ? 'var(--teal)' : 'var(--grey)'} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{route.label}</div>
                  <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)' }}>{route.section}</div>
                </div>
              </Link>
            )
          })}
        </div>

        <button
          onClick={signOut}
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--border2)',
            background: 'transparent',
            color: 'var(--grey)',
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <main style={{ padding: 28 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
