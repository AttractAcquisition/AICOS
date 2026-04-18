import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function GoogleOAuthCallback() {
  const [status, setStatus] = useState('Completing Google Workspace authorization…')
  const [done, setDone] = useState(false)

  const query = useMemo(() => new URLSearchParams(window.location.search), [])

  useEffect(() => {
    const run = async () => {
      const error = query.get('error')
      const code = query.get('code')
      const state = query.get('state')

      if (error) {
        setStatus(`Google returned an error: ${error}`)
        return
      }
      if (!code || !state) {
        setStatus('Missing authorization code or state.')
        return
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('google-oauth-exchange', {
          body: { code, state },
        })

        if (invokeError) throw invokeError
        if (!data?.success) throw new Error(data?.error || 'OAuth exchange failed')

        setStatus(`Connected ${data.accountEmail} for ${data.businessName}`)
        setDone(true)
      } catch (err: any) {
        console.error(err)
        setStatus(err?.message || 'OAuth exchange failed')
      }
    }

    void run()
  }, [query])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg1)', padding: 24 }}>
      <div style={{ maxWidth: 720, width: '100%', border: '1px solid var(--border2)', borderRadius: 16, padding: 24, background: 'var(--bg2)' }}>
        <div style={{ fontFamily: 'Playfair Display', fontSize: 28, marginBottom: 12 }}>Google Workspace OAuth</div>
        <div style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'var(--grey)', lineHeight: 1.7 }}>{status}</div>
        {done && (
          <div style={{ marginTop: 20, fontFamily: 'DM Mono', fontSize: 12, color: 'var(--teal)' }}>
            You can close this tab and return to AICOS.
          </div>
        )}
      </div>
    </div>
  )
}
