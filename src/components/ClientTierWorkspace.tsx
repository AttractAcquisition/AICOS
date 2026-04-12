import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Circle, CheckCircle2, ChevronDown, Loader2, Gift } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

export interface TierStepDef {
  id: number
  title: string
  value: string
  solves: string
  description: string
  tools: string[]
  items: string[]
}

export interface TierBonusDef {
  id: string
  stepId: number
  title: string
  value: string
  description: string
  items: string[]
}

export interface ClientTierWorkspaceProps {
  tierName: string
  steps: TierStepDef[]
  bonuses: TierBonusDef[]
  selectedClient?: any | null
  embedded?: boolean
}

function SectionCard({
  id,
  title,
  value,
  description,
  tools,
  items,
  notes,
  completed,
  total,
  expanded,
  onToggle,
  onToggleItem,
  onSaveNotes,
}: {
  id: number
  title: string
  value: string
  description: string
  tools: string[]
  items: any[]
  notes: string
  completed: number
  total: number
  expanded: boolean
  onToggle: () => void
  onToggleItem: (itemId: string, currentStatus: boolean) => void
  onSaveNotes: (stepId: number, notes: string) => void
}) {
  const complete = total > 0 && completed === total

  return (
    <div style={{ border: `1px solid ${complete ? 'rgba(0,229,195,0.4)' : 'var(--border2)'}`, borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 16px', background: complete ? 'rgba(0,229,195,0.04)' : 'var(--bg2)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          minWidth: 34, height: 34, borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: complete ? 'var(--teal)' : 'var(--bg3)',
          color: complete ? 'var(--bg)' : 'var(--grey)',
          fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600, flexShrink: 0,
        }}>
          {String(id).padStart(2, '0')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: complete ? 'var(--grey)' : 'var(--white)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
            <span style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'DM Mono' }}>{value}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 3 }}>{completed}/{total} complete</div>
        </div>

        <ChevronDown size={16} color="var(--grey)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {expanded && (
        <div style={{ padding: 16, borderTop: '1px solid var(--border2)', background: 'var(--bg3)' }}>
          <div style={{ fontSize: 13, color: 'var(--grey2)', lineHeight: 1.7, marginBottom: 14 }}>{description}</div>

          {tools.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontFamily: 'DM Mono', marginBottom: 6 }}>Tools</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tools.map(tool => (
                  <span key={tool} style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border2)', color: 'var(--grey2)', fontSize: 11 }}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onToggleItem(item.id, !!item.is_completed)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                  background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: 0,
                }}
              >
                {item.is_completed ? <CheckCircle2 size={16} color="var(--teal)" /> : <Circle size={16} color="var(--grey)" />}
                <span style={{ fontSize: 13, lineHeight: 1.6, color: item.is_completed ? 'var(--grey)' : 'var(--white)' }}>{item.title}</span>
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontFamily: 'DM Mono', marginBottom: 6 }}>Notes</div>
            <textarea
              className="input"
              rows={3}
              defaultValue={notes || ''}
              placeholder="Add manager notes, blockers, or client context..."
              onBlur={e => onSaveNotes(id, e.target.value)}
              style={{ resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientTierWorkspace({
  tierName,
  steps,
  bonuses,
  selectedClient,
  embedded = false,
}: ClientTierWorkspaceProps) {
  const { role, user, metadata_id } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(embedded ? selectedClient || null : null)
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([steps[0]?.id || 1]))
  const [loading, setLoading] = useState(true)
  const [fetchingSteps, setFetchingSteps] = useState(false)

  useEffect(() => {
    if (embedded) {
      if (selectedClient) {
        setSelected(selectedClient)
        loadDeliverables(selectedClient)
      } else {
        setSelected(null)
        setDeliverables([])
        setLoading(false)
      }
      return
    }
    loadClients()
  }, [embedded, selectedClient?.id, tierName, role, user?.id, metadata_id])

  async function loadClients() {
    setLoading(true)
    let q = supabase.from('clients').select('*').eq('tier', tierName)
    if (role === 'delivery' && user?.id) q = q.eq('account_manager', user.id)
    const { data } = await q
    setClients(data || [])
    setLoading(false)
  }

  async function loadDeliverables(client: any) {
    if (!client) return
    setFetchingSteps(true)
    setExpandedSteps(new Set([steps[0]?.id || 1]))

    let { data } = await supabase.from('client_deliverables' as any)
      .select('*')
      .eq('client_id', client.id)
      .order('position', { ascending: true })

    const hasNewFormat = data && data.some((d: any) => d.position >= 1000)

    if (!hasNewFormat) {
      const rows: any[] = []

      for (const step of steps) {
        step.items.forEach((item, idx) => {
          rows.push({ client_id: client.id, title: item, position: step.id * 1000 + idx, is_completed: false, notes: '' })
        })
        rows.push({ client_id: client.id, title: '__notes__', position: step.id * 1000 + 999, is_completed: false, notes: '' })
      }

      for (const bonus of bonuses) {
        bonus.items.forEach((item, idx) => {
          rows.push({ client_id: client.id, title: item, position: bonus.stepId * 1000 + idx, is_completed: false, notes: '' })
        })
        rows.push({ client_id: client.id, title: '__notes__', position: bonus.stepId * 1000 + 999, is_completed: false, notes: '' })
      }

      const { data: created } = await (supabase.from('client_deliverables' as any)).insert(rows).select()
      data = created
    }

    setDeliverables((data || []).filter((d: any) => d.position >= 1000))
    setFetchingSteps(false)
  }

  async function selectClient(client: any) {
    setSelected(client)
    await loadDeliverables(client)
  }

  async function toggleItem(itemId: string, currentStatus: boolean) {
    const { error } = await (supabase.from('client_deliverables' as any))
      .update({ is_completed: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', itemId)
    if (!error) {
      setDeliverables(prev => prev.map(d => d.id === itemId ? { ...d, is_completed: !currentStatus } : d))
    }
  }

  async function saveNotes(stepId: number, notes: string) {
    const notesRow = deliverables.find(d => d.position === stepId * 1000 + 999)
    if (!notesRow) return
    await (supabase.from('client_deliverables' as any))
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', notesRow.id)
    setDeliverables(prev => prev.map(d => d.id === notesRow.id ? { ...d, notes } : d))
    toast('Notes saved')
  }

  function getStepData(stepId: number) {
    const items = deliverables.filter(d => d.position >= stepId * 1000 && d.position < stepId * 1000 + 999)
    const notesRow = deliverables.find(d => d.position === stepId * 1000 + 999)
    const completed = items.filter((i: any) => i.is_completed).length
    return { items, notesRow, completed, total: items.length }
  }

  function toggleExpand(stepId: number) {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      next.has(stepId) ? next.delete(stepId) : next.add(stepId)
      return next
    })
  }

  const allItems = useMemo(() => deliverables.filter(d => d.position % 1000 !== 999), [deliverables])
  const totalCompleted = allItems.filter((d: any) => d.is_completed).length
  const totalItems = allItems.length
  const overallPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0

  const completedSteps = steps.filter(s => {
    const { completed, total } = getStepData(s.id)
    return total > 0 && completed === total
  }).length

  if (!embedded && loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--grey)' }}>
      <Loader2 className="spin" size={24} />
      <span style={{ marginLeft: 12, fontFamily: 'DM Mono', fontSize: 12 }}>Loading {tierName} Pipeline...</span>
    </div>
  )

  const workspace = !selected ? (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--grey2)', gap: 12 }}>
      <div style={{ padding: 20, borderRadius: '50%', background: 'var(--bg2)' }}>
        <CheckCircle2 size={32} />
      </div>
      <p style={{ fontSize: 13 }}>Select a client to manage their {tierName} deliverables.</p>
    </div>
  ) : fetchingSteps ? (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--grey)' }}>
      <Loader2 className="spin" size={20} />
      <span style={{ fontFamily: 'DM Mono', fontSize: 12 }}>Loading deliverables...</span>
    </div>
  ) : (
    <>
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontFamily: 'Playfair Display', fontWeight: 700 }}>{selected.business_name}</h2>
            <p style={{ color: 'var(--teal)', fontSize: 11, fontFamily: 'DM Mono', marginTop: 4 }}>
              DELIVERY TRACKER · {tierName.toUpperCase()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--teal)', fontFamily: 'DM Mono', lineHeight: 1 }}>{overallPct}%</div>
            <div style={{ fontSize: 10, color: 'var(--grey)', fontFamily: 'DM Mono', marginTop: 4 }}>{totalCompleted} / {totalItems} ITEMS</div>
            <div style={{ fontSize: 10, color: 'var(--grey2)', fontFamily: 'DM Mono', marginTop: 2 }}>{completedSteps} / {steps.length} STEPS</div>
          </div>
        </div>
        <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${overallPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal-dark), var(--teal))', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map(step => {
          const { items: dbItems, notesRow, completed, total } = getStepData(step.id)
          const isExpanded = expandedSteps.has(step.id)
          return (
            <SectionCard
              key={step.id}
              id={step.id}
              title={step.title}
              value={step.value}
              description={step.description}
              tools={step.tools}
              items={dbItems}
              notes={notesRow?.notes || ''}
              completed={completed}
              total={total}
              expanded={isExpanded}
              onToggle={() => toggleExpand(step.id)}
              onToggleItem={toggleItem}
              onSaveNotes={saveNotes}
            />
          )
        })}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 6 }}>
          <Gift size={13} color="var(--teal)" />
          <span style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            Included Bonuses — No Extra Charge
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border2)' }} />
          <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--teal)', whiteSpace: 'nowrap' }}>Bonus Value</span>
        </div>

        {bonuses.map(bonus => {
          const { items: dbItems, notesRow, completed, total } = getStepData(bonus.stepId)
          const isExpanded = expandedSteps.has(bonus.stepId)
          return (
            <SectionCard
              key={bonus.id}
              id={bonus.stepId}
              title={bonus.title}
              value={bonus.value}
              description={bonus.description}
              tools={[]}
              items={dbItems}
              notes={notesRow?.notes || ''}
              completed={completed}
              total={total}
              expanded={isExpanded}
              onToggle={() => toggleExpand(bonus.stepId)}
              onToggleItem={toggleItem}
              onSaveNotes={saveNotes}
            />
          )
        })}
      </div>
    </>
  )

  if (embedded) {
    return workspace
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, height: 'calc(100vh - 140px)' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <h3 style={{ fontSize: 11, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)', marginBottom: 12 }}>
          {tierName} Clients
        </h3>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey)', padding: 20 }}>
            <Loader2 className="spin" size={18} />
            <span style={{ fontSize: 12, fontFamily: 'DM Mono' }}>Loading clients...</span>
          </div>
        ) : clients.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--grey2)', padding: 20, textAlign: 'center' }}>No clients in this tier.</div>
        ) : clients.map(c => (
          <div
            key={c.id}
            onClick={() => selectClient(c)}
            style={{
              padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: `1px solid ${selected?.id === c.id ? 'var(--teal)' : 'var(--border2)'}`,
              background: selected?.id === c.id ? 'var(--bg3)' : 'var(--bg2)',
              transition: '0.2s',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.business_name}</div>
              <div style={{ fontSize: 10, color: 'var(--grey2)', marginTop: 2 }}>{c.owner_name}</div>
            </div>
            <ChevronRight size={14} color={selected?.id === c.id ? 'var(--teal)' : 'var(--border2)'} />
          </div>
        ))}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {workspace}
      </div>
    </div>
  )
}
