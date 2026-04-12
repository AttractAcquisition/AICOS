import { ExternalLink } from 'lucide-react'
import type { ExternalLinkItem } from '../lib/external-links'

export default function ExternalLinksGrid({ links }: { links: ExternalLinkItem[] }) {
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {links.map(platform => {
        const Icon = platform.icon
        return (
          <div
            key={platform.id}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border2)',
              borderRadius: '12px',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s',
              minHeight: '150px',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (platform.isInternal) {
                window.location.href = platform.url
                return
              }
              window.open(platform.url, '_blank', 'noopener')
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '100px',
              height: '100px',
              background: platform.color,
              filter: 'blur(60px)',
              opacity: 0.12,
              zIndex: 0,
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border2)' }}>
                  <Icon size={24} color={platform.color} />
                </div>
                <span style={{
                  fontSize: '9px',
                  fontFamily: 'DM Mono',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: platform.status === 'Communication' ? 'rgba(255,255,255,0.08)' : 'var(--bg)',
                  border: `1px solid ${platform.status === 'Communication' ? 'rgba(255,255,255,0.24)' : `${platform.color}44`}`,
                  color: platform.status === 'Communication' ? 'var(--white)' : platform.color,
                  fontWeight: 700,
                }}>
                  {platform.status}
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{platform.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--grey)', lineHeight: 1.5, marginBottom: '24px', minHeight: '40px' }}>
                {platform.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--white)' }}>
                {platform.isInternal ? 'Launch Tool' : 'Open Platform'}
                <ExternalLink size={14} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
