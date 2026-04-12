import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function LivePipelineDashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 56 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logoSrc} alt="AA" style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>
              Client Portal
            </div>
            <h1 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: 34, lineHeight: 1.1, color: 'var(--white)' }}>
              Live Pipeline Dashboard
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--grey)', fontSize: 14, maxWidth: 780 }}>
              Live acquisition progress and funnel movement.
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border2)', background: 'var(--bg2)',
            color: 'var(--grey)', cursor: 'pointer',
            fontFamily: 'DM Mono', fontSize: 10, textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <LogOut size={12} /> Log out
        </button>
      </header>
    </div>
  )
}
