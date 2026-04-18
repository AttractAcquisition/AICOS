import { buildGoogleAuthUrl, createGoogleOauthState, publicOauthStartPayload } from '../_shared/google-oauth.ts'
import { corsHeaders, jsonResponse } from '../_shared/supabase.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const businessName = String(body?.businessName || publicOauthStartPayload().businessName)
    const accountEmail = String(body?.accountEmail || publicOauthStartPayload().accountEmail)
    const state = await createGoogleOauthState({ businessName, accountEmail })
    const authUrl = buildGoogleAuthUrl(state)

    return jsonResponse({
      success: true,
      authUrl,
      state,
      businessName,
      accountEmail,
    })
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})
