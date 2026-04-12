import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { formatDate, formatRand } from '../lib/utils'

function dayX(startDate: string) {
  return Math.max(1, Math.min(Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) + 1, 14))
}

const EMPTY_SPRINT = {
  id: '' as string,
  sprint_number: 1,
  status: 'active',
  start_date: new Date().toISOString().split('T')[0],
  client_ad_budget: 0,
  actual_ad_spend: 0,
  leads_generated: 0,
  bookings_from_sprint: 0,
  revenue_attributed: 0,
  total_reach: 0,
  total_impressions: 0,
  link_clicks: 0,
  results_meeting_date: '',
  results_meeting_outcome: '',
  day7_sentiment: '',
  day7_notes: '',
  talking_points: '',
  close_notes: '',
  vertical: '',
}

const EMPTY_LOG = {
  reach: 0,
  impressions: 0,
  link_clicks: 0,
  leads: 0,
  spend: 0,
  notes: '',
}

export default function ClientSprintManager({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { toast } = useToast()
  const [sprints, setSprints] = useState<any[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [sprintForm, setSprintForm] = useState<any>(EMPTY_SPRINT)
  const [logs, setLogs] = useState<any[]>([])
  const [logForm, setLogForm] = useState<any>(EMPTY_LOG)
  const [loading, setLoading] = useState(true)
  const [savingSprint, setSavingSprint] = useState(false)
  const [savingLog, setSavingLog] = useState(false)
  const [showLogForm, setShowLogForm] = useState(true)

  useEffect(() => { loadSprints() }, [clientId])

  useEffect(() => {
    if (!selectedSprintId && sprints.length > 0) return
    const sprint = sprints.find(s => s.id === selectedSprintId) || null
    if (sprint) {
      setSprintForm({
        ...EMPTY_SPRINT,
        ...sprint,
        id: sprint.id,
        start_date: sprint.start_date || EMPTY_SPRINT.start_date,
        results_meeting_date: sprint.results_meeting_date || '',
        results_meeting_outcome: sprint.results_meeting_outcome || '',
        day7_sentiment: sprint.day7_sentiment || '',
        day7_notes: sprint.day7_notes || '',
        talking_points: sprint.talking_points || '',
        close_notes: sprint.close_notes || '',
        vertical: sprint.vertical || '',
      })
      loadLogs(sprint.id)
    }
  }, [selectedSprintId, sprints])

  async function loadSprints() {
    setLoading(true)
    const { data } = await supabase.from('proof_sprints').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    const rows = data || []
    setSprints(rows)

    const active = rows.find((s: any) => ['active', 'in_progress', 'running', 'live', 'ongoing'].includes(String(s.status || '').toLowerCase())) || rows[0] || null
    if (active) {
      setSelectedSprintId(active.id)
      setSprintForm({
        ...EMPTY_SPRINT,
        ...active,
        id: active.id,
        start_date: active.start_date || EMPTY_SPRINT.start_date,
        results_meeting_date: active.results_meeting_date || '',
        results_meeting_outcome: active.results_meeting_outcome || '',
        day7_sentiment: active.day7_sentiment || '',
        day7_notes: active.day7_notes || '',
        talking_points: active.talking_points || '',
        close_notes: active.close_notes || '',
        vertical: active.vertical || '',
      })
      await loadLogs(active.id)
    } else {
      setSelectedSprintId('')
      setSprintForm(EMPTY_SPRINT)
      setLogs([])
    }
    setLoading(false)
  }

  async function loadLogs(sprintId: string) {
    const { data } = await supabase.from('sprint_daily_log').select('*').eq('sprint_id', sprintId).order('log_date', { ascending: false })
    setLogs(data || [])
  }

  async function saveSprint() {
    setSavingSprint(true)
    const payload = {
      client_id: clientId,
      client_name: clientName,
      sprint_number: Number(sprintForm.sprint_number) || 1,
      status: sprintForm.status || 'active',
      start_date: sprintForm.start_date,
      client_ad_budget: Number(sprintForm.client_ad_budget) || 0,
      actual_ad_spend: Number(sprintForm.actual_ad_spend) || 0,
      leads_generated: Number(sprintForm.leads_generated) || 0,
      bookings_from_sprint: Number(sprintForm.bookings_from_sprint) || 0,
      revenue_attributed: Number(sprintForm.revenue_attributed) || 0,
      total_reach: Number(sprintForm.total_reach) || 0,
      total_impressions: Number(sprintForm.total_impressions) || 0,
      link_clicks: Number(sprintForm.link_clicks) || 0,
      results_meeting_date: sprintForm.results_meeting_date || null,
      results_meeting_outcome: sprintForm.results_meeting_outcome || null,
      day7_sentiment: sprintForm.day7_sentiment || null,
      day7_notes: sprintForm.day7_notes || null,
      talking_points: sprintForm.talking_points || null,
      close_notes: sprintForm.close_notes || null,
      vertical: sprintForm.vertical || null,
    }

    let error: any = null
    if (sprintForm.id) {
      ;({ error } = await supabase.from('proof_sprints').update(payload).eq('id', sprintForm.id))
    } else {
      const res = await supabase.from('proof_sprints').insert(payload).select().single()
      error = res.error
      if (res.data) {
        setSelectedSprintId(res.data.id)
      }
    }

    if (error) {
      toast(`Failed to save sprint: ${error.message}`, 'error')
      setSavingSprint(false)
      return
    }

    toast('Sprint saved ✓')
    await loadSprints()
    setSavingSprint(false)
  }

  async function saveLog() {
    const sprintId = selectedSprintId || sprintForm.id
    if (!sprintId) {
      toast('Save the sprint first, then add daily logs.', 'error')
      return
    }

    setSavingLog(true)
    const today = new Date().toISOString().split('T')[0]
    const dayNum = dayX(sprintForm.start_date || today)
    const payload = {
      sprint_id: sprintId,
      log_date: today,
      day_number: dayNum,
      reach: Number(logForm.reach) || 0,
      impressions: Number(logForm.impressions) || 0,
      link_clicks: Number(logForm.link_clicks) || 0,
      leads: Number(logForm.leads) || 0,
      spend: Number(logForm.spend) || 0,
      notes: logForm.notes || '',
    }

    const existing = await supabase.from('sprint_daily_log').select('id').eq('sprint_id', sprintId).eq('log_date', today).maybeSingle()
    if (existing.data?.id) {
      const { error } = await supabase.from('sprint_daily_log').update(payload).eq('id', existing.data.id)
      if (error) {
        toast(`Failed to save log: ${error.message}`, 'error')
        setSavingLog(false)
        return
      }
    } else {
      const { error } = await supabase.from('sprint_daily_log').insert(payload)
      if (error) {
        toast(`Failed to save log: ${error.message}`, 'error')
        setSavingLog(false)
        return
      }
    }

    toast('Daily log saved ✓')
    setSavingLog(false)
    setLogForm(EMPTY_LOG)
    await loadLogs(sprintId)
    await loadSprints()
  }

  const totals = useMemo(() => {
    const spend = logs.reduce((sum, row) => sum + (row.spend || 0), 0) || sprintForm.actual_ad_spend || 0
    const leads = logs.reduce((sum, row) => sum + (row.leads || 0), 0) || sprintForm.leads_generated || 0
    const cpl = leads > 0 ? spend / leads : 0
    return { spend, leads, cpl }
  }, [logs, sprintForm.actual_ad_spend, sprintForm.leads_generated])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260, color: 'var(--grey)' }}>
        <Loader2 className="spin" size={18} style={{ marginRight: 10 }} />
        Loading sprint inputs...
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>Sprint Data</div>
          <div style={{ color: 'var(--grey)', fontSize: 12, marginTop: 4 }}>Daily sprint tracking for {clientName}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={selectedSprintId} onChange={e => setSelectedSprintId(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">New Sprint</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>Sprint {s.sprint_number || 1} · {s.status || 'draft'} · {formatDate(s.start_date)}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={saveSprint} disabled={savingSprint}>{savingSprint ? 'Saving...' : 'Save Sprint →'}</button>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <Field label="Sprint #">
            <input className="input" type="number" value={sprintForm.sprint_number} onChange={e => setSprintForm((p: any) => ({ ...p, sprint_number: Number(e.target.value) }))} />
          </Field>
          <Field label="Status">
            <select className="input" value={sprintForm.status} onChange={e => setSprintForm((p: any) => ({ ...p, status: e.target.value }))}>
              <option value="active">active</option>
              <option value="in_progress">in_progress</option>
              <option value="paused">paused</option>
              <option value="closed_won">closed_won</option>
              <option value="closed_lost">closed_lost</option>
            </select>
          </Field>
          <Field label="Start Date">
            <input className="input" type="date" value={sprintForm.start_date || ''} onChange={e => setSprintForm((p: any) => ({ ...p, start_date: e.target.value }))} />
          </Field>
          <Field label="Vertical">
            <input className="input" value={sprintForm.vertical || ''} onChange={e => setSprintForm((p: any) => ({ ...p, vertical: e.target.value }))} placeholder="e.g. Auto Detailing" />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <Field label="Client Ad Budget">
            <input className="input" type="number" value={sprintForm.client_ad_budget} onChange={e => setSprintForm((p: any) => ({ ...p, client_ad_budget: Number(e.target.value) }))} />
          </Field>
          <Field label="Actual Ad Spend">
            <input className="input" type="number" value={sprintForm.actual_ad_spend} onChange={e => setSprintForm((p: any) => ({ ...p, actual_ad_spend: Number(e.target.value) }))} />
          </Field>
          <Field label="Leads Generated">
            <input className="input" type="number" value={sprintForm.leads_generated} onChange={e => setSprintForm((p: any) => ({ ...p, leads_generated: Number(e.target.value) }))} />
          </Field>
          <Field label="Bookings From Sprint">
            <input className="input" type="number" value={sprintForm.bookings_from_sprint} onChange={e => setSprintForm((p: any) => ({ ...p, bookings_from_sprint: Number(e.target.value) }))} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <Field label="Revenue Attributed">
            <input className="input" type="number" value={sprintForm.revenue_attributed} onChange={e => setSprintForm((p: any) => ({ ...p, revenue_attributed: Number(e.target.value) }))} />
          </Field>
          <Field label="Total Reach">
            <input className="input" type="number" value={sprintForm.total_reach} onChange={e => setSprintForm((p: any) => ({ ...p, total_reach: Number(e.target.value) }))} />
          </Field>
          <Field label="Total Impressions">
            <input className="input" type="number" value={sprintForm.total_impressions} onChange={e => setSprintForm((p: any) => ({ ...p, total_impressions: Number(e.target.value) }))} />
          </Field>
          <Field label="Link Clicks">
            <input className="input" type="number" value={sprintForm.link_clicks} onChange={e => setSprintForm((p: any) => ({ ...p, link_clicks: Number(e.target.value) }))} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <Field label="Results Meeting Date">
            <input className="input" type="date" value={sprintForm.results_meeting_date || ''} onChange={e => setSprintForm((p: any) => ({ ...p, results_meeting_date: e.target.value }))} />
          </Field>
          <Field label="Results Outcome">
            <input className="input" value={sprintForm.results_meeting_outcome || ''} onChange={e => setSprintForm((p: any) => ({ ...p, results_meeting_outcome: e.target.value }))} placeholder="e.g. Moved to Proof Brand" />
          </Field>
          <Field label="Client Sentiment">
            <select className="input" value={sprintForm.day7_sentiment || ''} onChange={e => setSprintForm((p: any) => ({ ...p, day7_sentiment: e.target.value }))}>
              <option value="">Not recorded</option>
              <option value="satisfied">satisfied</option>
              <option value="neutral">neutral</option>
              <option value="concerned">concerned</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Day 7 Notes">
            <textarea className="input" rows={3} value={sprintForm.day7_notes || ''} onChange={e => setSprintForm((p: any) => ({ ...p, day7_notes: e.target.value }))} />
          </Field>
          <Field label="Talking Points">
            <textarea className="input" rows={4} value={sprintForm.talking_points || ''} onChange={e => setSprintForm((p: any) => ({ ...p, talking_points: e.target.value }))} />
          </Field>
          <Field label="Close Notes">
            <textarea className="input" rows={3} value={sprintForm.close_notes || ''} onChange={e => setSprintForm((p: any) => ({ ...p, close_notes: e.target.value }))} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <Stat label="Spend logged" value={formatRand(totals.spend)} />
          <Stat label="Leads logged" value={String(totals.leads)} />
          <Stat label="CPL" value={totals.cpl ? formatRand(totals.cpl) : '—'} />
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="section-label" style={{ margin: 0 }}>Daily Sprint Log</div>
          <button className="btn-primary" onClick={() => setShowLogForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={11} /> {showLogForm ? 'Hide Log Form' : 'Add Today\'s Log'}
          </button>
        </div>

        {showLogForm && (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Reach', 'reach'],
                ['Impressions', 'impressions'],
                ['Clicks', 'link_clicks'],
                ['Leads', 'leads'],
                ['Spend', 'spend'],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <input className="input" type="number" value={logForm[key]} onChange={e => setLogForm((p: any) => ({ ...p, [key]: Number(e.target.value) || 0 }))} />
                </Field>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Notes">
                <input className="input" value={logForm.notes} onChange={e => setLogForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Observations, optimisations, blockers..." />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn-primary" onClick={saveLog} disabled={savingLog}>{savingLog ? 'Saving...' : 'Save Daily Log →'}</button>
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <div style={{ color: 'var(--grey)', fontSize: 13, padding: 16, border: '1px dashed var(--border2)', borderRadius: 10 }}>
            No daily sprint rows yet. Save the sprint first, then add the daily data.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="aa-table">
              <thead>
                <tr>
                  <th>Date</th><th>Reach</th><th>Impressions</th><th>Clicks</th><th>Leads</th><th>Spend</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(row => (
                  <tr key={row.id}>
                    <td>{formatDate(row.log_date)}</td>
                    <td>{(row.reach || 0).toLocaleString('en-ZA')}</td>
                    <td>{(row.impressions || 0).toLocaleString('en-ZA')}</td>
                    <td>{row.link_clicks || 0}</td>
                    <td>{row.leads || 0}</td>
                    <td>{formatRand(row.spend)}</td>
                    <td>{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--bg3)' }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 16, color: 'var(--teal)', marginTop: 6 }}>{value}</div>
    </div>
  )
}
