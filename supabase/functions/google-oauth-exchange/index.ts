import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleAccountEmail,
  getStoredGoogleWorkspaceConnection,
  upsertGoogleWorkspaceConnection,
  verifyGoogleOauthState,
} from '../_shared/google-oauth.ts'
import { corsHeaders, jsonResponse } from '../_shared/supabase.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, state } = await req.json().catch(() => ({}))
    if (!code || !state) {
      return jsonResponse({ success: false, error: 'Missing code or state' }, 400)
    }

    const parsedState = await verifyGoogleOauthState(String(state))
    if (!parsedState) {
      return jsonResponse({ success: false, error: 'Invalid OAuth state' }, 400)
    }

    const tokenData = await exchangeGoogleAuthorizationCode(String(code))
    const accountEmail = tokenData.refresh_token
      ? await fetchGoogleAccountEmail(tokenData.access_token)
      : parsedState.accountEmail

    const scopes = (tokenData.scope || '').split(' ').filter(Boolean)
    const accessTokenExpiresAt = new Date(Date.now() + Number(tokenData.expires_in || 0) * 1000)

    if (tokenData.refresh_token) {
      await upsertGoogleWorkspaceConnection({
        businessName: parsedState.businessName,
        accountEmail,
        refreshToken: tokenData.refresh_token,
        scopes,
        tokenType: tokenData.token_type,
        accessTokenExpiresAt,
      })
    } else {
      const existing = await getStoredGoogleWorkspaceConnection(parsedState.businessName, accountEmail)
      if (!existing) {
        return jsonResponse({
          success: false,
          error: 'Google did not return a refresh token and no existing connection was found. Re-run consent with prompt=consent.',
        }, 400)
      }
    }

    return jsonResponse({
      success: true,
      businessName: parsedState.businessName,
      accountEmail,
      scopes,
      refreshTokenStored: !!tokenData.refresh_token,
    })
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})
