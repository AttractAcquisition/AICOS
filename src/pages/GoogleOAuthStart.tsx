import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function GoogleOAuthStart() {
  const [message, setMessage] = useState('Preparing Google Workspace sign-in…')

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-oauth-start', {
          body: {
            businessName: 'Attract Acquisition',
            accountEmail: 'alex@attractacq.com',
          },
        })

        if (error) throw error
        if (!data?.authUrl) throw new Error('No auth URL returned from Google OAuth start')

        window.location.assign(data.authUrl)
      } catch (err: any) {
        console.error(err)
        setMessage(err?.message || 'Failed to launch Google OAuth')
      }
    }

    void run()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg1)' }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--grey)' }}>{message}</div>
    </div>
  )
}
