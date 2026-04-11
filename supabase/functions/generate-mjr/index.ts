import { requireRole, jsonResponse, corsHeaders } from '../_shared/supabase.ts'

const ALLOWED_ROLES = ['admin', 'distribution', 'delivery']

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function estimateMissedRevenue(reviewCount: number, rating: number) {
  const base = Math.max(15, reviewCount * 3)
  const multiplier = rating >= 4.7 ? 1.35 : rating >= 4.3 ? 1.2 : 1.05
  return Math.round(base * 850 * multiplier)
}

function sectorFromVertical(vertical: string) {
  return vertical || 'Local Services'
}

function jobValueRange(vertical: string) {
  const v = vertical.toLowerCase()
  if (/(plumb|electr|hvac|trailer|fabricat|engineering)/.test(v)) return 'R5k-R25k'
  if (/(detail|wash|wrap|groom|salon)/.test(v)) return 'R800-R8k'
  if (/(renov|landscap|pool|roof|construction|paint)/.test(v)) return 'R10k-R80k'
  return 'R3k-R20k'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  try {
    const gate = await requireRole(req, ALLOWED_ROLES)
    if ('error' in gate) return gate.error

    const body = await req.json()
    const prospect = body?.prospect
    if (!prospect?.business_name) {
      return jsonResponse({ success: false, error: '`prospect` with `business_name` is required' }, 400)
    }

    const businessName = String(prospect.business_name)
    const vertical = String(prospect.vertical || 'Local Services')
    const suburb = String(prospect.suburb || prospect.city || 'Cape Town')
    const reviewCount = Number(prospect.google_review_count || 0)
    const rating = Number(prospect.google_rating || 0)
    const hasMetaAds = Boolean(prospect.has_meta_ads)
    const instagramHandle = String(prospect.instagram_handle || '')
    const instagramFollowers = Number(prospect.instagram_followers || 0)

    const estimatedMissed = estimateMissedRevenue(reviewCount, rating || 4.2)
    const preview_stats = {
      business_name: businessName,
      sector: sectorFromVertical(vertical),
      geography: suburb,
      job_value_range: jobValueRange(vertical),
      annual_ltv: Math.round(estimatedMissed * 0.22),
      estimated_missed: estimatedMissed,
      google_reviews: reviewCount,
      has_instagram: Boolean(instagramHandle),
      running_ads: hasMetaAds,
    }

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(businessName)} | Missed Jobs Report</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; font-family: Inter, Arial, sans-serif; background: #07100E; color: #EAFBF7; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 40px 20px 60px; }
  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(0,201,167,0.18); border-radius: 18px; padding: 24px; margin-bottom: 18px; }
  h1,h2,h3 { margin: 0 0 12px; }
  h1 { font-size: 38px; line-height: 1.05; }
  h2 { font-size: 22px; color: #00C9A7; }
  .muted { color: #87A8A1; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .metric { background: rgba(0,201,167,0.08); border: 1px solid rgba(0,201,167,0.2); border-radius: 14px; padding: 14px; }
  .metric .label { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #8DCFC1; }
  .metric .value { font-size: 20px; font-weight: 700; margin-top: 6px; }
  ul { line-height: 1.8; }
  .cta { display: inline-block; background: #00C9A7; color: #07100E; text-decoration: none; padding: 14px 20px; border-radius: 999px; font-weight: 700; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <p class="muted">Missed Jobs Report</p>
      <h1>${escapeHtml(businessName)}</h1>
      <p class="muted">${escapeHtml(vertical)} · ${escapeHtml(suburb)}</p>
      <div class="grid" style="margin-top:20px;">
        <div class="metric"><div class="label">Estimated missed revenue</div><div class="value">R ${estimatedMissed.toLocaleString('en-ZA')}</div></div>
        <div class="metric"><div class="label">Google reviews</div><div class="value">${reviewCount}</div></div>
        <div class="metric"><div class="label">Rating</div><div class="value">${rating ? rating.toFixed(1) : '—'}</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Local demand</h2>
      <ul>
        <li>${escapeHtml(suburb)} has demand for ${escapeHtml(vertical.toLowerCase())} jobs right now.</li>
        <li>Your current search visibility is not capturing the full local market.</li>
        <li>Faster response and clearer proof would convert more of this demand.</li>
      </ul>
    </div>

    <div class="card">
      <h2>Competitor landscape</h2>
      <ul>
        <li>Competitors with stronger reviews and tighter positioning will win attention first.</li>
        <li>Businesses with active ads and visible proof get the lead before the quote request.</li>
        <li>${hasMetaAds ? 'Current ads are a start, but the proof system is still incomplete.' : 'No active ads means the demand is still being captured by competitors.'}</li>
      </ul>
    </div>

    <div class="card">
      <h2>Pipeline gap audit</h2>
      <ul>
        <li>Instagram: ${instagramHandle ? `${escapeHtml(instagramHandle)} (${instagramFollowers.toLocaleString('en-ZA')} followers)` : 'Not visible'}</li>
        <li>Google trust signal: ${reviewCount} reviews, ${rating ? rating.toFixed(1) : 'unknown'} rating</li>
        <li>Lead capture: likely leaking without a structured follow-up system.</li>
      </ul>
    </div>

    <div class="card">
      <h2>Missed revenue calculation</h2>
      <p>Based on visible demand and trust signals, the business is likely missing approximately <strong>R ${estimatedMissed.toLocaleString('en-ZA')}</strong> per year in missed jobs.</p>
      <p class="muted">Estimated job value range: ${escapeHtml(jobValueRange(vertical))} · Estimated annual LTV: R ${preview_stats.annual_ltv.toLocaleString('en-ZA')}</p>
    </div>

    <div class="card">
      <h2>Action plan</h2>
      <ol style="line-height:1.9; padding-left: 20px;">
        <li>Lock the proof assets, before increasing traffic.</li>
        <li>Run a 14-day Proof Sprint to generate real market data.</li>
        <li>Turn the winning proof into a monthly authority system.</li>
      </ol>
      <p style="margin-top: 20px;"><a class="cta" href="#">Start Proof Sprint</a></p>
    </div>
  </div>
</body>
</html>`

    return jsonResponse({ success: true, html, preview_stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[generate-mjr]', message)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
