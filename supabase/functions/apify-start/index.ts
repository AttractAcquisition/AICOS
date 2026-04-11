import { createServiceClient, jsonResponse, requireRole, sleep } from '../_shared/supabase.ts'

interface StartBody {
  search_term?: string
  location_query?: string
  max_results?: number
  language?: string
  skip_closed_places?: boolean
  include_web_results?: boolean
  scrape_contacts?: boolean
  scrape_place_detail_page?: boolean
  scrape_reviews_personal_data?: boolean
  social_media?: Record<string, boolean>
}

interface PlacesTextResult {
  place_id: string
  name?: string
  formatted_address?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
}

const MAX_RESULTS_CAP = 60

function googlePlacesKey() {
  return Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY')
}

function mapProspect(place: Record<string, unknown>, details: Record<string, unknown> | null, runId: string, searchTerm: string, locationQuery: string) {
  const formattedAddress = String(details?.formatted_address || place.formatted_address || locationQuery || '')
  const businessName = String(details?.name || place.name || '')
  const phone = String(details?.international_phone_number || details?.formatted_phone_number || '') || null
  const website = String(details?.website || '') || null
  const rating = Number(details?.rating ?? place.rating ?? 0) || null
  const reviewCount = Number(details?.user_ratings_total ?? place.user_ratings_total ?? 0) || 0
  const businessStatus = String(details?.business_status || place.business_status || 'OPERATIONAL')

  return {
    business_name: businessName,
    vertical: searchTerm,
    city: locationQuery,
    suburb: locationQuery,
    address: formattedAddress,
    phone,
    whatsapp: null,
    website,
    google_rating: rating,
    google_review_count: reviewCount,
    status: businessStatus === 'CLOSED_PERMANENTLY' ? 'closed' : 'active',
    data_source: 'google_places',
    apify_run_id: runId,
    last_scraped_at: new Date().toISOString(),
  }
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google Places API error ${res.status}: ${await res.text()}`)
  return await res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  const gate = await requireRole(req, ['admin', 'distribution'])
  if ('error' in gate) return gate.error

  try {
    const apiKey = googlePlacesKey()
    if (!apiKey) {
      return jsonResponse({ success: false, error: 'Google Places API key is not configured' }, 500)
    }

    const body = (await req.json()) as StartBody
    const searchTerm = String(body.search_term || '').trim()
    const locationQuery = String(body.location_query || 'Cape Town, South Africa').trim()
    const maxResults = Math.max(1, Math.min(Number(body.max_results || 30), MAX_RESULTS_CAP))

    if (!searchTerm) {
      return jsonResponse({ success: false, error: 'search_term is required' }, 400)
    }

    const runId = crypto.randomUUID()
    const query = `${searchTerm} ${locationQuery}`.trim()
    const accumulated: PlacesTextResult[] = []
    let pageToken: string | null = null

    while (accumulated.length < maxResults) {
      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
      if (pageToken) {
        url.searchParams.set('pagetoken', pageToken)
        await sleep(2000)
      } else {
        url.searchParams.set('query', query)
        url.searchParams.set('region', 'za')
      }
      url.searchParams.set('key', apiKey)

      const data = await fetchJson(url.toString())
      const results = Array.isArray(data.results) ? data.results : []
      accumulated.push(...results)
      pageToken = data.next_page_token || null
      if (!pageToken || results.length === 0) break
    }

    const trimmed = accumulated.slice(0, maxResults)
    const service = createServiceClient()

    const prospects = await Promise.all(trimmed.map(async (place) => {
      let details: Record<string, unknown> | null = null

      if (body.scrape_contacts || body.scrape_place_detail_page || body.include_web_results) {
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json')
        detailsUrl.searchParams.set('place_id', place.place_id)
        detailsUrl.searchParams.set('fields', 'name,formatted_address,international_phone_number,formatted_phone_number,website,rating,user_ratings_total,business_status')
        detailsUrl.searchParams.set('key', apiKey)

        const detailData = await fetchJson(detailsUrl.toString())
        details = detailData.result || null
      }

      return mapProspect(place, details, runId, searchTerm, locationQuery)
    }))

    await service.from('integration_events').insert({
      integration_name: 'apify-scraper',
      source_system: 'google_places',
      target_system: 'supabase',
      event_type: 'scrape_run',
      status: 'completed',
      payload: {
        run_id: runId,
        search_term: searchTerm,
        location_query: locationQuery,
        max_results: maxResults,
        prospects,
      },
      processed_at: new Date().toISOString(),
    })

    return jsonResponse({
      success: true,
      run_id: runId,
      status: 'SUCCEEDED',
      count: prospects.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[apify-start]', message)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
