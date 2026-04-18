import { createServiceClient, jsonResponse } from './supabase.ts'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
]

export type GoogleOauthState = {
  businessName: string
  accountEmail: string
  issuedAt: number
  nonce: string
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function deriveAesKey(secret: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export function getGoogleOauthConfig() {
  return {
    clientId: getRequiredEnv('GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: getRequiredEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirectUri: getRequiredEnv('GOOGLE_OAUTH_REDIRECT_URI'),
    stateSecret: getRequiredEnv('GOOGLE_OAUTH_STATE_SECRET'),
    tokenEncryptionSecret: getRequiredEnv('GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY'),
  }
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleOauthConfig()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('scope', GOOGLE_SCOPES.join(' '))
  url.searchParams.set('state', state)
  return url.toString()
}

export async function createGoogleOauthState(input: { businessName: string; accountEmail: string }) {
  const { stateSecret } = getGoogleOauthConfig()
  const key = await importHmacKey(stateSecret)
  const payload: GoogleOauthState = {
    businessName: input.businessName.trim() || 'Attract Acquisition',
    accountEmail: input.accountEmail.trim().toLowerCase(),
    issuedAt: Date.now(),
    nonce: crypto.randomUUID(),
  }
  const payloadBytes = encoder.encode(JSON.stringify(payload))
  const signature = await crypto.subtle.sign('HMAC', key, payloadBytes)
  return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyGoogleOauthState(token: string) {
  const { stateSecret } = getGoogleOauthConfig()
  const [payloadPart, signaturePart] = token.split('.')
  if (!payloadPart || !signaturePart) return null

  const key = await importHmacKey(stateSecret)
  const payloadBytes = base64UrlDecode(payloadPart)
  const signatureBytes = base64UrlDecode(signaturePart)
  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)
  if (!valid) return null

  try {
    const decoded = JSON.parse(decoder.decode(payloadBytes)) as GoogleOauthState
    if (!decoded.businessName || !decoded.accountEmail || !decoded.nonce) return null
    return decoded
  } catch {
    return null
  }
}

export async function encryptGoogleSecret(value: string) {
  const { tokenEncryptionSecret } = getGoogleOauthConfig()
  const key = await deriveAesKey(tokenEncryptionSecret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(value),
  )
  return {
    iv: base64UrlEncode(iv),
    ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
  }
}

export async function decryptGoogleSecret(blob: { iv: string; ciphertext: string }) {
  const { tokenEncryptionSecret } = getGoogleOauthConfig()
  const key = await deriveAesKey(tokenEncryptionSecret)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlDecode(blob.iv) },
    key,
    base64UrlDecode(blob.ciphertext),
  )
  return decoder.decode(plaintext)
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOauthConfig()
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error(`Google token exchange failed: ${await tokenResponse.text()}`)
  }

  return tokenResponse.json() as Promise<{
    access_token: string
    expires_in: number
    refresh_token?: string
    scope?: string
    token_type?: string
    id_token?: string
  }>
}

export async function fetchGoogleAccountEmail(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Google userinfo lookup failed: ${await response.text()}`)
  }

  const data = await response.json() as { email?: string }
  if (!data.email) {
    throw new Error('Google userinfo response did not include an email address')
  }
  return data.email.toLowerCase()
}

export async function upsertGoogleWorkspaceConnection(params: {
  businessName: string
  accountEmail: string
  refreshToken: string
  scopes: string[]
  tokenType?: string
  accessTokenExpiresAt?: Date | null
}) {
  const supabase = createServiceClient()
  const encrypted = await encryptGoogleSecret(params.refreshToken)
  const { error } = await supabase
    .from('google_workspace_oauth_connections')
    .upsert({
      business_name: params.businessName,
      account_email: params.accountEmail,
      provider: 'google',
      scopes: params.scopes,
      refresh_token_encrypted: encrypted,
      token_type: params.tokenType ?? 'Bearer',
      access_token_expires_at: params.accessTokenExpiresAt?.toISOString() ?? null,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_name,account_email,provider' })

  if (error) {
    throw error
  }
}

export async function getStoredGoogleWorkspaceConnection(businessName: string, accountEmail: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('google_workspace_oauth_connections')
    .select('*')
    .eq('business_name', businessName)
    .eq('account_email', accountEmail)
    .eq('provider', 'google')
    .maybeSingle()

  if (error) throw error
  return data as null | {
    id: string
    business_name: string
    account_email: string
    provider: string
    scopes: string[]
    refresh_token_encrypted: { iv: string; ciphertext: string }
    token_type: string
    access_token_expires_at: string | null
    status: string
  }
}

export async function getDecryptedRefreshToken(row: { refresh_token_encrypted: { iv: string; ciphertext: string } }) {
  return decryptGoogleSecret(row.refresh_token_encrypted)
}

export function publicOauthStartPayload() {
  return {
    businessName: 'Attract Acquisition',
    accountEmail: 'alex@attractacq.com',
  }
}

export function oauthStartSummary() {
  return jsonResponse({
    success: true,
    businessName: 'Attract Acquisition',
    accountEmail: 'alex@attractacq.com',
    scopes: GOOGLE_SCOPES,
  })
}
