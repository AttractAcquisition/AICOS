import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AICOS } from '../lib/aicos'
import { Panel } from '../components/ConsoleShell'
import { FileText, Upload, Download, Check, Send, Clock } from 'lucide-react'

export default function ClientPortal() {
  const { metadata_id, user } = useAuth()
  const [client, setClient] = useState<any | null>(null)
  const [managerId, setManagerId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`
  const db = supabase as any

  useEffect(() => {
    if (metadata_id) load()
    else setLoading(false)
  }, [metadata_id])

  useEffect(() => {
    if (!metadata_id) return

    const channel = supabase
      .channel(`portal_messages_client_${metadata_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'portal_messages', filter: `client_id=eq.${metadata_id}` },
        (payload) => setMessages(prev => [...prev, payload.new as any])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [metadata_id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function load() {
    if (!metadata_id) return
    setLoading(true)

    const [clientRes, taskRes, messageRes, documentRes] = await Promise.all([
      db.from(AICOS.tables.clients).select('id, business_name, owner_name, account_manager, account_manager_name').eq('id', metadata_id).maybeSingle(),
      db.from(AICOS.tables.portalTasks).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(50),
      db.from(AICOS.tables.portalMessages).select('*').eq('client_id', metadata_id).order('created_at', { ascending: true }).limit(200),
      db.from(AICOS.tables.portalDocuments).select('*').eq('client_id', metadata_id).order('created_at', { ascending: false }).limit(50),
    ])

    setClient(clientRes.data || null)
    setManagerId(clientRes.data?.account_manager || null)
    setTasks(taskRes.data || [])
    setMessages(messageRes.data || [])
    setDocuments(documentRes.data || [])
    setLoading(false)
  }

  async function toggleTaskStatus(task: any) {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    const { error } = await db
      .from(AICOS.tables.portalTasks)
      .update({ status: nextStatus })
      .eq('id', task.id)
      .eq('client_id', metadata_id!)

    if (error) return
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t))
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !metadata_id || !user) return
    setUploading(true)

    const filePath = `${metadata_id}/${file.name}`
    const { error: storageError } = await supabase.storage.from('client_portal').upload(filePath, file, { upsert: true })
    if (storageError) {
      setUploading(false)
      e.target.value = ''
      return
    }

    const { data, error: dbError } = await db.from(AICOS.tables.portalDocuments).insert({
      client_id: metadata_id,
      manager_id: managerId ?? user.id,
      file_name: file.name,
      file_path: filePath,
      uploaded_by: user.id,
    }).select().single()

    setUploading(false)
    e.target.value = ''
    if (dbError) return
    setDocuments(prev => [data, ...prev])
  }

  async function downloadFile(doc: any) {
    const { data, error } = await supabase.storage.from('client_portal').download(doc.file_path)
    if (error || !data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.file_name
    a.click()
    URL.revokeObjectURL(url)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !metadata_id || !user) return
    setSending(true)
    const { error } = await db.from(AICOS.tables.portalMessages).insert({
      client_id: metadata_id,
      manager_id: managerId ?? user.id,
      message_text: newMessage.trim(),
      sender_id: user.id,
    })
    setSending(false)
    if (error) return
    setNewMessage('')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)', fontFamily: 'DM Mono', fontSize: 11, letterSpacing: '0.12em' }}>
        LOADING CLIENT PORTAL...
      </div>
    )
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
              {client?.business_name || 'Client Workspace'}
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--grey)', fontSize: 14, maxWidth: 780 }}>
              {client?.owner_name ? `Welcome, ${client.owner_name}.` : 'Messages, tasks, and documents with your account manager.'}
            </p>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gap: 20 }}>
        <Panel title={`Documents (${documents.length})`}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 6, cursor: uploading ? 'default' : 'pointer',
              background: 'var(--teal)', color: 'var(--bg)',
              fontFamily: 'DM Mono', fontSize: 11, textTransform: 'uppercase',
              opacity: uploading ? 0.6 : 1,
            }}>
              <Upload size={12} />
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input type="file" style={{ display: 'none' }} onChange={uploadFile} disabled={uploading} />
            </label>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {documents.map((doc) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10 }}>
                <FileText size={16} color="var(--grey2)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{doc.file_name}</div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--grey)', marginTop: 3 }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(doc)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 6,
                    border: '1px solid var(--border2)', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 10,
                    color: 'var(--grey)', textTransform: 'uppercase',
                  }}
                >
                  <Download size={11} />Download
                </button>
              </div>
            ))}
            {documents.length === 0 && <Empty label="No documents uploaded yet." />}
          </div>
        </Panel>

        <Panel title={`Messages (${messages.length})`}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
              {messages.map((message) => {
                const isMe = message.sender_id === user?.id
                return (
                  <div key={message.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '78%',
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: isMe ? 'rgba(0, 201, 167, 0.14)' : 'var(--bg2)',
                      border: `1px solid ${isMe ? 'rgba(0, 201, 167, 0.25)' : 'var(--border2)'}`,
                    }}>
                      <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: isMe ? 'var(--teal)' : 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                        {isMe ? 'You' : 'Manager'}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--white)' }}>{message.message_text}</div>
                      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--grey2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={10} />
                        {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && <Empty label="No messages yet." />}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Write a message to your account manager..."
                rows={3}
                style={{
                  flex: 1,
                  resize: 'none',
                  background: 'var(--bg2)',
                  color: 'var(--white)',
                  border: '1px solid var(--border2)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', borderRadius: 10,
                  border: 'none', background: 'var(--teal)', color: 'var(--bg)',
                  cursor: sending || !newMessage.trim() ? 'default' : 'pointer',
                  fontFamily: 'DM Mono', fontSize: 11, textTransform: 'uppercase',
                  opacity: sending || !newMessage.trim() ? 0.6 : 1,
                }}
              >
                <Send size={12} />{sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </Panel>

        <Panel title={`Tasks (${tasks.length})`}>
          <div style={{ display: 'grid', gap: 10 }}>
            {tasks.map(task => {
              const complete = task.status === 'completed'
              return (
                <button
                  key={task.id}
                  onClick={() => toggleTaskStatus(task)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    width: '100%', textAlign: 'left',
                    padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    flexShrink: 0,
                    marginTop: 2,
                    border: `2px solid ${complete ? 'var(--teal)' : 'var(--border2)'}`,
                    background: complete ? 'var(--teal)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {complete && <Check size={12} color="var(--bg)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: complete ? 'var(--grey)' : 'var(--white)', textDecoration: complete ? 'line-through' : 'none' }}>
                      {task.title}
                    </div>
                    {task.description && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, lineHeight: 1.5 }}>{task.description}</div>}
                    {task.due_date && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} color="var(--grey)" />
                        <span style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--grey)', textTransform: 'uppercase' }}>
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'DM Mono',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    background: complete ? 'rgba(0,229,195,0.12)' : task.status === 'in_progress' ? 'rgba(255,200,0,0.12)' : 'var(--bg3)',
                    color: complete ? 'var(--teal)' : task.status === 'in_progress' ? 'var(--amber)' : 'var(--grey)',
                  }}>
                    {(task.status ?? 'pending').replace('_', ' ')}
                  </div>
                </button>
              )
            })}
            {tasks.length === 0 && <Empty label="No tasks assigned yet." />}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: 18, color: 'var(--grey)', fontSize: 13, border: '1px dashed var(--border2)', borderRadius: 10 }}>{label}</div>
}
