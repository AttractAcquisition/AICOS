import { Panel } from './ConsoleShell'

interface LibraryItem {
  id: string
  title: string
  category?: string | null
  updated_at?: string | null
  status?: string | null
  sop_number?: number | null
}

interface ConsoleLibraryPanelProps {
  templates: LibraryItem[]
  sops: LibraryItem[]
  scopeLabel: string
}

export default function ConsoleLibraryPanel({ templates, sops, scopeLabel }: ConsoleLibraryPanelProps) {
  return (
    <Panel title={`Templates & SOPs · ${scopeLabel}`}>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <ListCard
          title={`Templates (${templates.length})`}
          items={templates}
          renderMeta={item => item.category || 'Uncategorised'}
        />
        <ListCard
          title={`SOPs (${sops.length})`}
          items={sops}
          renderMeta={item => [item.category || 'Uncategorised', item.status || 'draft'].filter(Boolean).join(' · ')}
        />
      </div>
    </Panel>
  )
}

function ListCard({
  title,
  items,
  renderMeta,
}: {
  title: string
  items: LibraryItem[]
  renderMeta: (item: LibraryItem) => string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 240 }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--teal)' }}>{title}</div>
      <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 2 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <strong style={{ fontSize: 14, lineHeight: 1.4 }}>{item.title}</strong>
              <span style={{ fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{renderMeta(item)}</span>
            </div>
            {item.sop_number ? (
              <span style={{ fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono' }}>#{item.sop_number}</span>
            ) : null}
          </div>
        ))}
        {items.length === 0 && <Empty label="Nothing visible for this console" />}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: 16, color: 'var(--grey)', fontSize: 13, border: '1px dashed var(--border2)', borderRadius: 10 }}>{label}</div>
}
