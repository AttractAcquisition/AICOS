import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Circle, ChevronRight, Loader2, Lock, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

type AssetCategoryKey = 'beforePhotos' | 'afterPhotos' | 'logos' | 'brandFiles' | 'testimonials' | 'pdfs'
type AppKey = 'apify' | 'adCreative' | 'metaAds' | 'metaGraph' | 'whatsappBusiness' | 'manyChat' | 'supabase' | 'github'

type AppTestStatus = 'idle' | 'connected' | 'missing'

interface ClientRow {
  id: string
  business_name: string
  owner_name?: string | null
  tier?: string | null
  account_manager?: string | null
}

interface UploadedAsset {
  name: string
  path: string
  url: string
  uploadedAt: string
}

interface AppConnection {
  enabled: boolean
  apiKey: string
  secret: string
  testStatus: AppTestStatus
}

interface D1State {
  transcript: string
  output: string
  transformationType: string
  buyingTrigger: string
  customerIntents: string
  competitorAngle: string
  positioningGap: string
  dominantFormula: string
  assets: Record<AssetCategoryKey, UploadedAsset[]>
  apps: Record<AppKey, AppConnection>
}

interface D2State {
  topObjection: string
  selectedAssets: string[]
  output: string
  exportLabels: string[]
}

interface D3State {
  brandColors: string
  output: string
  downloadLabels: string[]
}

interface D4State {
  vertical: string
  buyingTrigger: string
  customerIntents: string
  output: string
  pdfCopy: string
  cta: string
  formFields: string
  guideTopic: string
}

interface D5State {
  targeting: string
  ageRanges: string
  exclusions: string
  budget: string
  keywordTrigger: string
  output: string
}

interface D6State {
  freshAudiences: string
  nonConverters: string
  lookalike: string
  leadFormSetup: string
  budget: string
  output: string
}

interface D7State {
  welcome: string
  jobType: string
  urgency: string
  area: string
  priceBridge: string
  bookingClose: string
  objectionHandler: string
  tyreKickerExit: string
  output: string
}

interface D8State {
  keywordTrigger: string
  responseTree: string
  conditions: string
  phoneCapture: string
  bookingBranch: string
  qaBranches: boolean
  qaMessages: boolean
  qaData: boolean
  output: string
}

interface SprintV2State {
  d1: D1State
  d2: D2State
  d3: D3State
  d4: D4State
  d5: D5State
  d6: D6State
  d7: D7State
  d8: D8State
}

const ASSET_CATEGORIES: { key: AssetCategoryKey; label: string; accept: string; hint: string }[] = [
  { key: 'beforePhotos', label: 'Before photos', accept: 'image/*', hint: 'Original state, raw proof, comparison lead-in' },
  { key: 'afterPhotos', label: 'After photos', accept: 'image/*', hint: 'Outcome state, result proof, transformation end state' },
  { key: 'logos', label: 'Logos', accept: 'image/*', hint: 'Client logo, co-branding, campaign header assets' },
  { key: 'brandFiles', label: 'Brand files', accept: '.pdf,.png,.jpg,.jpeg,.svg,.zip', hint: 'Brand kit, fonts, references, visual standards' },
  { key: 'testimonials', label: 'Testimonials', accept: '.pdf,.png,.jpg,.jpeg,.txt,.doc,.docx', hint: 'Social proof, reviews, screenshots, voice notes' },
  { key: 'pdfs', label: 'PDFs', accept: '.pdf', hint: 'Reports, briefs, transcripts, source documents' },
]

const APP_DEFS: { key: AppKey; label: string }[] = [
  { key: 'apify', label: 'Apify' },
  { key: 'adCreative', label: 'AdCreative.ai' },
  { key: 'metaAds', label: 'Meta Ads Manager' },
  { key: 'metaGraph', label: 'Meta Graph API' },
  { key: 'whatsappBusiness', label: 'WhatsApp Business API' },
  { key: 'manyChat', label: 'ManyChat' },
  { key: 'supabase', label: 'Supabase' },
  { key: 'github', label: 'GitHub' },
]

const TAB_DEFS = [
  { id: 1, title: 'Tool, Information & Assets', short: 'Inputs + Intelligence' },
  { id: 2, title: 'Before / After Proof Ads', short: 'Carousel Copy' },
  { id: 3, title: 'Ad Variants', short: 'AdCreative.ai Prompts' },
  { id: 4, title: 'Lead Magnet', short: 'PDF + Instant Form' },
  { id: 5, title: 'Meta Conversion Campaign', short: 'Campaign 1 Build Sheet' },
  { id: 6, title: 'Meta Leads Campaign', short: 'Campaign 2 Build Sheet' },
  { id: 7, title: 'WhatsApp DM Qualifier Script', short: '6-Message Sales Flow' },
  { id: 8, title: 'WhatsApp Conversion Flow Setup', short: 'ManyChat Logic' },
] as const

function createAppConnections(): Record<AppKey, AppConnection> {
  return APP_DEFS.reduce((acc, app) => {
    acc[app.key] = { enabled: false, apiKey: '', secret: '', testStatus: 'idle' }
    return acc
  }, {} as Record<AppKey, AppConnection>)
}

function createInitialState(): SprintV2State {
  return {
    d1: {
      transcript: '',
      output: '',
      transformationType: '',
      buyingTrigger: '',
      customerIntents: '',
      competitorAngle: '',
      positioningGap: '',
      dominantFormula: '',
      assets: {
        beforePhotos: [],
        afterPhotos: [],
        logos: [],
        brandFiles: [],
        testimonials: [],
        pdfs: [],
      },
      apps: createAppConnections(),
    },
    d2: {
      topObjection: '',
      selectedAssets: [],
      output: '',
      exportLabels: [],
    },
    d3: {
      brandColors: '#6A00F4, #9D4BFF, #EBD7FF',
      output: '',
      downloadLabels: [],
    },
    d4: {
      vertical: '',
      buyingTrigger: '',
      customerIntents: '',
      output: '',
      pdfCopy: '',
      cta: '',
      formFields: '',
      guideTopic: '',
    },
    d5: {
      targeting: '',
      ageRanges: '',
      exclusions: '',
      budget: '',
      keywordTrigger: '',
      output: '',
    },
    d6: {
      freshAudiences: '',
      nonConverters: '',
      lookalike: '',
      leadFormSetup: '',
      budget: '',
      output: '',
    },
    d7: {
      welcome: '',
      jobType: '',
      urgency: '',
      area: '',
      priceBridge: '',
      bookingClose: '',
      objectionHandler: '',
      tyreKickerExit: '',
      output: '',
    },
    d8: {
      keywordTrigger: '',
      responseTree: '',
      conditions: '',
      phoneCapture: '',
      bookingBranch: '',
      qaBranches: false,
      qaMessages: false,
      qaData: false,
      output: '',
    },
  }
}

function pickLeadMagnetTopic(vertical: string) {
  const v = vertical.trim().toLowerCase()
  if (!v) return 'Local Demand Guide'
  if (v.includes('plumb')) return 'Emergency Plumbing Buyer Guide'
  if (v.includes('electric')) return 'Electrical Safety & Hire Guide'
  if (v.includes('landscap')) return 'Before You Hire Landscaping Guide'
  if (v.includes('groom')) return 'Pet Grooming Care Guide'
  if (v.includes('detail')) return 'How to Choose the Right Detailer Guide'
  if (v.includes('renov')) return 'Home Renovation Planning Guide'
  return `${vertical.trim()} Buyer Guide`
}

function compactTranscript(text: string) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(' ')
    .slice(0, 500)
}

function formatSelectedImageNames(state: D2State, d1: D1State) {
  const allAssets = Object.values(d1.assets).flat()
  const selected = allAssets.filter(asset => state.selectedAssets.includes(asset.path))
  return selected.length > 0 ? selected.map(asset => asset.name) : allAssets.slice(0, 3).map(asset => asset.name)
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)', marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--grey2)', marginTop: 6, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, lineHeight: 1.5 }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

function TabButton({
  active,
  locked,
  complete,
  title,
  short,
  onClick,
}: {
  active: boolean
  locked: boolean
  complete: boolean
  title: string
  short: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: 12,
        border: `1px solid ${active ? 'var(--teal)' : 'var(--border2)'}`,
        background: locked ? 'rgba(255,255,255,0.02)' : active ? 'rgba(0,229,195,0.06)' : 'var(--bg2)',
        color: locked ? 'var(--grey2)' : active ? 'var(--white)' : 'var(--grey)',
        textAlign: 'left',
        cursor: locked ? 'not-allowed' : 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {complete ? <CheckCircle2 size={14} color="var(--teal)" /> : locked ? <Lock size={12} color="var(--grey2)" /> : null}
        </div>
        <div style={{ fontSize: 11, color: 'var(--grey2)', marginTop: 4, lineHeight: 1.4 }}>{short}</div>
      </div>
      <ChevronRight size={14} color={active ? 'var(--teal)' : 'var(--grey2)'} />
    </button>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card" style={{ display: 'grid', gap: 6 }}>
      <div className="label">{label}</div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 24, color: 'var(--teal)', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--grey)', fontFamily: 'DM Mono' }}>{sub}</div>
    </div>
  )
}

export default function ProofSprintV2() {
  const { role, user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const [clientStates, setClientStates] = useState<Record<string, SprintV2State>>({})
  const [activeTab, setActiveTab] = useState<number>(1)

  useEffect(() => { loadClients() }, [role, user?.id])

  async function loadClients() {
    setLoading(true)
    let q = supabase.from('clients').select('id, business_name, owner_name, tier, account_manager').eq('tier', 'Proof Sprint').order('created_at', { ascending: false })
    if (role === 'delivery' && user?.id) q = q.eq('account_manager', user.id)
    const { data } = await q
    setClients((data || []) as ClientRow[])
    setLoading(false)
  }

  function ensureClientState(client: ClientRow) {
    setClientStates(prev => {
      if (prev[client.id]) return prev
      return { ...prev, [client.id]: createInitialState() }
    })
  }

  function selectClient(client: ClientRow) {
    setSelectedClient(client)
    ensureClientState(client)
    setActiveTab(1)
  }

  const activeState = selectedClient ? clientStates[selectedClient.id] : null

  function updateActiveState(updater: (state: SprintV2State) => SprintV2State) {
    if (!selectedClient) return
    setClientStates(prev => {
      const current = prev[selectedClient.id] || createInitialState()
      return { ...prev, [selectedClient.id]: updater(current) }
    })
  }

  function updateD1(patch: Partial<D1State>) {
    updateActiveState(state => ({ ...state, d1: { ...state.d1, ...patch } }))
  }
  function updateD2(patch: Partial<D2State>) {
    updateActiveState(state => ({ ...state, d2: { ...state.d2, ...patch } }))
  }
  function updateD3(patch: Partial<D3State>) {
    updateActiveState(state => ({ ...state, d3: { ...state.d3, ...patch } }))
  }
  function updateD4(patch: Partial<D4State>) {
    updateActiveState(state => ({ ...state, d4: { ...state.d4, ...patch } }))
  }
  function updateD5(patch: Partial<D5State>) {
    updateActiveState(state => ({ ...state, d5: { ...state.d5, ...patch } }))
  }
  function updateD6(patch: Partial<D6State>) {
    updateActiveState(state => ({ ...state, d6: { ...state.d6, ...patch } }))
  }
  function updateD7(patch: Partial<D7State>) {
    updateActiveState(state => ({ ...state, d7: { ...state.d7, ...patch } }))
  }
  function updateD8(patch: Partial<D8State>) {
    updateActiveState(state => ({ ...state, d8: { ...state.d8, ...patch } }))
  }

  async function uploadAsset(category: AssetCategoryKey, fileList: FileList | null) {
    if (!selectedClient || !fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    const nextAssets: UploadedAsset[] = []

    for (const file of files) {
      const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
      const path = `proof-sprint-v2/${selectedClient.id}/${category}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('aa-assets').upload(path, file, { upsert: true })
      if (error) {
        toast(`Upload failed for ${file.name}: ${error.message}`, 'error')
        continue
      }
      const { data } = supabase.storage.from('aa-assets').getPublicUrl(path)
      nextAssets.push({ name: file.name, path, url: data.publicUrl, uploadedAt: new Date().toISOString() })
    }

    if (nextAssets.length > 0) {
      updateD1({
        assets: {
          ...activeState!.d1.assets,
          [category]: [...activeState!.d1.assets[category], ...nextAssets],
        },
      })
      toast(`${nextAssets.length} file(s) uploaded to ${category.replace(/([A-Z])/g, ' $1').trim()}`)
    }
  }

  function toggleAssetSelection(path: string) {
    if (!activeState) return
    const current = activeState.d2.selectedAssets
    updateD2({
      selectedAssets: current.includes(path)
        ? current.filter(item => item !== path)
        : [...current, path],
    })
  }

  function testApp(appKey: AppKey) {
    if (!activeState) return
    const app = activeState.d1.apps[appKey]
    if (!app.enabled || !app.apiKey || !app.secret) {
      updateD1({
        apps: {
          ...activeState.d1.apps,
          [appKey]: { ...app, testStatus: 'missing' },
        },
      })
      toast(`Add credentials for ${APP_DEFS.find(a => a.key === appKey)?.label}`, 'error')
      return
    }

    updateD1({
      apps: {
        ...activeState.d1.apps,
        [appKey]: { ...app, testStatus: 'connected' },
      },
    })
    toast(`${APP_DEFS.find(a => a.key === appKey)?.label} test passed ✓`)
  }

  function generateD1() {
    if (!selectedClient || !activeState) return
    const transcript = activeState.d1.transcript.trim()
    const assetCount = Object.values(activeState.d1.assets).flat().length
    const transcriptPreview = compactTranscript(transcript)
    const transformationType = transcript.toLowerCase().includes('before') || transcript.toLowerCase().includes('after')
      ? 'Visible transformation from the current state to the desired state'
      : 'Proof-led local service transformation'
    const buyingTrigger = 'Speed, trust, visible proof, and low risk'
    const customerIntents = [
      '- Wants the job solved with minimum friction',
      '- Wants visible proof that the service works',
      '- Wants a local provider that feels credible immediately',
    ].join('\n')
    const competitorAngle = 'Competitors lead with generic claims. This process leads with evidence and local proof.'
    const positioningGap = 'No one owns the proof-first, outcome-led local narrative in this market.'
    const dominantFormula = 'Proof × Volume × Consistency = Brand'

    const output = `# Business Intelligence & Positioning Document\n\n**Client:** ${selectedClient.business_name}\n**Transcript words:** ${transcript.split(/\s+/).filter(Boolean).length}\n**Assets uploaded:** ${assetCount}\n\n## transformation type\n${transformationType}\n\n## buying trigger\n${buyingTrigger}\n\n## top customer intents\n${customerIntents}\n\n## competitor angle\n${competitorAngle}\n\n## positioning gap\n${positioningGap}\n\n## dominant formula\n${dominantFormula}\n\n## transcript excerpt\n${transcriptPreview || 'Paste transcript from the transcriber AI.'}\n`

    updateD1({
      transformationType,
      buyingTrigger,
      customerIntents,
      competitorAngle,
      positioningGap,
      dominantFormula,
      output,
    })
    toast('Deliverable 1 generated ✓')
  }

  function generateD2() {
    if (!selectedClient || !activeState) return
    const topObjection = activeState.d2.topObjection.trim() || 'I need to think about it'
    const formula = activeState.d1.dominantFormula || 'Proof × Volume × Consistency = Brand'
    const imageNames = formatSelectedImageNames(activeState.d2, activeState.d1)

    const output = `# Proof Carousel Copy\n\n**Positioning formula:** ${formula}\n**Top objection:** ${topObjection}\n\n## 3 headline variants\n1. ${selectedClient.business_name} proof that turns attention into booked jobs\n2. ${topObjection} handled with real proof\n3. The outcome your market actually wants\n\n## 3 CTA variants\n1. Send the WhatsApp now\n2. Get the proof pack\n3. Book the next step\n\n## 3 subtext variants\n1. Local proof first, pitch second.\n2. Built from real work, not empty claims.\n3. Designed to move warm leads into action.\n\n## asset builder\nSelected images: ${imageNames.join(', ') || 'Choose proof images from Deliverable 1.'}\n\n## export labels\n- B/A-C1\n- B/A-C2\n- B/A-C4\n`

    updateD2({
      output,
      exportLabels: ['B/A-C1', 'B/A-C2', 'B/A-C4'],
    })
    toast('Deliverable 2 generated ✓')
  }

  function generateD3() {
    if (!selectedClient || !activeState) return
    const colors = activeState.d3.brandColors.trim() || '#6A00F4, #9D4BFF, #EBD7FF'
    const formula = activeState.d1.dominantFormula || 'Proof × Volume × Consistency = Brand'

    const pain = [
      `Pain angle 1: ${selectedClient.business_name} is the answer to the problem your buyer is already feeling.`,
      'Pain angle 2: make the cost of inaction visible before the sale.',
    ]
    const outcome = [
      'Outcome angle 1: show the result before the pitch.',
      'Outcome angle 2: lead with what the buyer gets, not what you do.',
    ]
    const offer = [
      'Offer angle 1: low-risk proof sprint entry.',
      'Offer angle 2: clear next step, clear value, clear timeline.',
    ]

    const output = `# Ad Variants\n\n**D1 formula:** ${formula}\n**Brand colors:** ${colors}\n\n## pain based ads x2\n- ${pain[0]}\n- ${pain[1]}\n\n## outcome based ads x2\n- ${outcome[0]}\n- ${outcome[1]}\n\n## offer based ads x2\n- ${offer[0]}\n- ${offer[1]}\n\n## integration\nPush these prompts into AdCreative.ai and label exports by campaign usage.\n\n## download labels\n- Pain-01\n- Pain-02\n- Outcome-01\n- Outcome-02\n- Offer-01\n- Offer-02\n`

    updateD3({ output, downloadLabels: ['Pain-01', 'Pain-02', 'Outcome-01', 'Outcome-02', 'Offer-01', 'Offer-02'] })
    toast('Deliverable 3 generated ✓')
  }

  function generateD4() {
    if (!selectedClient || !activeState) return
    const guideTopic = pickLeadMagnetTopic(activeState.d4.vertical)
    const output = `# Lead Magnet\n\n**Guide topic:** ${guideTopic}\n\n## full pdf copy\n${activeState.d4.pdfCopy || `Write the full PDF copy for ${guideTopic}.`}\n\n## cta\n${activeState.d4.cta || 'Book the next step on WhatsApp.'}\n\n## meta instant form fields\n${activeState.d4.formFields || '- Name\n- Phone\n- Service needed\n- Urgency\n- Area'}\n`
    updateD4({ guideTopic, output })
    toast('Deliverable 4 generated ✓')
  }

  function generateD5() {
    if (!selectedClient || !activeState) return
    const output = `# Meta Conversion Campaign Spec\n\n**Client:** ${selectedClient.business_name}\n\n## targeting\n${activeState.d5.targeting || 'Local radius + strong intent signals'}\n\n## age ranges\n${activeState.d5.ageRanges || '25-55'}\n\n## exclusions\n${activeState.d5.exclusions || 'Non-buyers, competitors, irrelevant job seekers'}\n\n## budgets\n${activeState.d5.budget || 'Split by ad set and scale winners only'}\n\n## keyword trigger\n${activeState.d5.keywordTrigger || 'Use a frictionless keyword trigger in WhatsApp'}\n\n## campaign 1 build sheet\nAd sets: Broad, Interest, Warm, Lookalike\n`
    updateD5({ output })
    toast('Deliverable 5 generated ✓')
  }

  function generateD6() {
    if (!selectedClient || !activeState) return
    const output = `# Meta Leads Campaign Spec\n\n**Client:** ${selectedClient.business_name}\n\n## fresh audiences\n${activeState.d6.freshAudiences || 'New audience expansion pool'}\n\n## non converters\n${activeState.d6.nonConverters || 'People who engaged but did not convert'}\n\n## lookalike 3–5%\n${activeState.d6.lookalike || 'Scale the best converting signals'}\n\n## lead form setup\n${activeState.d6.leadFormSetup || 'Name, phone, service interest, urgency, suburb'}\n\n## budgets\n${activeState.d6.budget || 'Test with a controlled budget and scale the winners'}\n`
    updateD6({ output })
    toast('Deliverable 6 generated ✓')
  }

  function generateD7() {
    if (!selectedClient || !activeState) return
    const output = `# WhatsApp DM Qualifier Script\n\n**Client:** ${selectedClient.business_name}\n\n## 6 message sales flow\n1. Welcome: ${activeState.d7.welcome || 'Thanks for reaching out. What do you need help with?'}\n2. Job type: ${activeState.d7.jobType || 'What type of work is it?'}\n3. Urgency: ${activeState.d7.urgency || 'How soon do you want this sorted?'}\n4. Area: ${activeState.d7.area || 'Which area are you in?'}\n5. Price bridge: ${activeState.d7.priceBridge || 'Here is the value bridge before we talk price.'}\n6. Booking close: ${activeState.d7.bookingClose || 'Let’s lock the booking in.'}\n\n## objection handler\n${activeState.d7.objectionHandler || 'Handle the common objection and return to the booking.'}\n\n## tyre kicker exit\n${activeState.d7.tyreKickerExit || 'Polite exit for non-serious enquiries.'}\n`
    updateD7({ output })
    toast('Deliverable 7 generated ✓')
  }

  function generateD8() {
    if (!selectedClient || !activeState) return
    const output = `# WhatsApp Conversion Flow Setup\n\n**Client:** ${selectedClient.business_name}\n\n## ManyChat logic builder\n- Keyword trigger: ${activeState.d8.keywordTrigger || activeState.d5.keywordTrigger || 'Use the campaign keyword from D5'}\n- Response tree: ${activeState.d8.responseTree || 'Map the decision tree from welcome to booking'}\n- Conditions: ${activeState.d8.conditions || 'Trigger response branches based on intent, area, and urgency'}\n- Phone capture: ${activeState.d8.phoneCapture || 'Collect phone number before the booking branch'}\n- Booking branch: ${activeState.d8.bookingBranch || 'Move qualified leads into a booking confirmation flow'}\n\n## outputs used\n- D5 campaign spec\n- D7 qualifier script\n\n## QA checklist\n- All branches tested: ${activeState.d8.qaBranches ? 'Yes' : 'No'}\n- Messages firing: ${activeState.d8.qaMessages ? 'Yes' : 'No'}\n- Data capture works: ${activeState.d8.qaData ? 'Yes' : 'No'}\n`
    updateD8({ output })
    toast('Deliverable 8 generated ✓')
  }

  const activeAssetsCount = activeState ? Object.values(activeState.d1.assets).flat().length : 0
  const connectedAppsCount = activeState ? Object.values(activeState.d1.apps).filter(app => app.enabled && app.testStatus === 'connected').length : 0
  const completedTabs = activeState ? TAB_DEFS.filter(tab => {
    switch (tab.id) {
      case 1: return !!activeState.d1.transcript.trim() && activeAssetsCount > 0 && !!activeState.d1.output.trim()
      case 2: return !!activeState.d2.output.trim()
      case 3: return !!activeState.d3.output.trim()
      case 4: return !!activeState.d4.output.trim()
      case 5: return !!activeState.d5.output.trim()
      case 6: return !!activeState.d6.output.trim()
      case 7: return !!activeState.d7.output.trim()
      case 8: return !!activeState.d8.output.trim()
      default: return false
    }
  }).length : 0
  const progressPct = Math.round((completedTabs / TAB_DEFS.length) * 100)

  const allAssets = activeState ? Object.values(activeState.d1.assets).flat() : []
  const currentStepComplete = (tabId: number) => {
    if (!activeState) return false
    switch (tabId) {
      case 1: return !!activeState.d1.transcript.trim() && activeAssetsCount > 0 && !!activeState.d1.output.trim()
      case 2: return !!activeState.d2.output.trim() && !!activeState.d2.topObjection.trim()
      case 3: return !!activeState.d3.output.trim() && !!activeState.d3.brandColors.trim()
      case 4: return !!activeState.d4.output.trim() && !!activeState.d4.vertical.trim()
      case 5: return !!activeState.d5.output.trim() && !!activeState.d5.targeting.trim()
      case 6: return !!activeState.d6.output.trim() && !!activeState.d6.freshAudiences.trim()
      case 7: return !!activeState.d7.output.trim() && !!activeState.d7.welcome.trim()
      case 8: return !!activeState.d8.output.trim() && !!activeState.d8.keywordTrigger.trim()
      default: return false
    }
  }

  const isTabLocked = (tabId: number) => tabId > 1 && !currentStepComplete(tabId - 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, minHeight: 'calc(100vh - 140px)' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(0,229,195,0.08)', color: 'var(--teal)' }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Proof Sprint V2</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono' }}>Client-specific deliverables process</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 8 }}>
          <Stat label="Clients" value={clients.length} sub="Proof Sprint tier" />
          <Stat label="Progress" value={`${progressPct}%`} sub={`${completedTabs}/${TAB_DEFS.length} deliverables complete`} />
          <Stat label="Assets" value={activeAssetsCount} sub="uploaded to Supabase" />
          <Stat label="Apps" value={connectedAppsCount} sub="connected and tested" />
        </div>

        <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, marginBottom: 4 }}>
          Client Selector
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--grey)', padding: 18 }}>
            <Loader2 className="spin" size={18} />
            <span style={{ fontSize: 12, fontFamily: 'DM Mono' }}>Loading clients...</span>
          </div>
        ) : clients.length === 0 ? (
          <div style={{ color: 'var(--grey2)', fontSize: 13, padding: 16, border: '1px dashed var(--border2)', borderRadius: 10 }}>
            No Proof Sprint clients found.
          </div>
        ) : (
          clients.map(client => (
            <button
              key={client.id}
              onClick={() => selectClient(client)}
              style={{
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                border: `1px solid ${selectedClient?.id === client.id ? 'var(--teal)' : 'var(--border2)'}`,
                background: selectedClient?.id === client.id ? 'var(--bg3)' : 'var(--bg2)',
                textAlign: 'left',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{client.business_name}</div>
                <div style={{ fontSize: 10, color: 'var(--grey2)', marginTop: 2 }}>{client.owner_name || 'Client'}</div>
              </div>
              <ChevronRight size={14} color={selectedClient?.id === client.id ? 'var(--teal)' : 'var(--border2)'} />
            </button>
          ))
        )}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {!selectedClient || !activeState ? (
          <div style={{ height: '100%', minHeight: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--grey2)', gap: 12 }}>
            <div style={{ padding: 20, borderRadius: '50%', background: 'var(--bg2)' }}>
              <ShieldCheck size={32} color="var(--teal)" />
            </div>
            <p style={{ fontSize: 13 }}>Select a Proof Sprint client to open the deliverables workspace.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--border2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontFamily: 'Playfair Display', fontWeight: 700 }}>{selectedClient.business_name}</div>
                  <div style={{ color: 'var(--teal)', fontSize: 11, fontFamily: 'DM Mono', marginTop: 4 }}>
                    PROOF SPRINT V2 · CLIENT DELIVERABLES
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      background: 'none', border: '1px solid var(--border2)', borderRadius: 6,
                      cursor: 'pointer', fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    <ExternalLink size={11} /> Process Guide
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--teal)', fontFamily: 'DM Mono', lineHeight: 1 }}>{progressPct}%</div>
                    <div style={{ fontSize: 10, color: 'var(--grey)', fontFamily: 'DM Mono', marginTop: 4 }}>
                      {completedTabs} / {TAB_DEFS.length} DELIVERABLES
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal-dark), var(--teal))', borderRadius: 99 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
              {TAB_DEFS.map(tab => (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  locked={isTabLocked(tab.id)}
                  complete={currentStepComplete(tab.id)}
                  title={tab.title}
                  short={tab.short}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {activeTab === 1 && (
                <>
                  <Panel
                    title="A. Transcript Input"
                    subtitle="Paste the meeting transcript from the transcriber AI. This drives the intelligence document."
                  >
                    <textarea
                      className="input"
                      rows={10}
                      value={activeState.d1.transcript}
                      onChange={e => updateD1({ transcript: e.target.value })}
                      placeholder="Paste meeting transcript here..."
                      style={{ resize: 'vertical', lineHeight: 1.65 }}
                    />
                  </Panel>

                  <Panel
                    title="B. Asset Upload"
                    subtitle="Upload all proof assets into Supabase buckets, then build the sprint intelligence around them."
                  >
                    <div style={{ display: 'grid', gap: 12 }}>
                      {ASSET_CATEGORIES.map(category => (
                        <div key={category.key} style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 12, background: 'var(--bg)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{category.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4, lineHeight: 1.5 }}>{category.hint}</div>
                            </div>
                            <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--grey2)' }}>
                              {activeState.d1.assets[category.key].length} files
                            </div>
                          </div>
                          <input
                            className="input"
                            type="file"
                            accept={category.accept}
                            multiple
                            onChange={e => uploadAsset(category.key, e.target.files)}
                          />
                          {activeState.d1.assets[category.key].length > 0 && (
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {activeState.d1.assets[category.key].map(asset => (
                                <div key={asset.path} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,229,195,0.04)', border: '1px solid rgba(0,229,195,0.16)' }}>
                                  <span style={{ fontSize: 12, color: 'var(--white)' }}>{asset.name}</span>
                                  <a href={asset.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--teal)' }}>Open</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel
                    title="C. Connected Apps Checklist"
                    subtitle="Toggle the integrations, add keys, and run a connection test for each app."
                  >
                    <div style={{ display: 'grid', gap: 10 }}>
                      {APP_DEFS.map(app => {
                        const appState = activeState.d1.apps[app.key]
                        const badgeColor = appState.testStatus === 'connected' ? 'var(--teal)' : appState.testStatus === 'missing' ? 'var(--amber)' : 'var(--grey2)'
                        return (
                          <div key={app.key} style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 12, background: 'var(--bg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}>
                                <input
                                  type="checkbox"
                                  checked={appState.enabled}
                                  onChange={e => updateD1({ apps: { ...activeState.d1.apps, [app.key]: { ...appState, enabled: e.target.checked } } })}
                                />
                                {app.label}
                              </label>
                              <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: badgeColor, textTransform: 'uppercase' }}>
                                {appState.testStatus === 'idle' ? 'Not tested' : appState.testStatus}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 }}>
                              <input
                                className="input"
                                placeholder="API Key"
                                value={appState.apiKey}
                                onChange={e => updateD1({ apps: { ...activeState.d1.apps, [app.key]: { ...appState, apiKey: e.target.value } } })}
                                disabled={!appState.enabled}
                              />
                              <input
                                className="input"
                                placeholder="Secret"
                                value={appState.secret}
                                onChange={e => updateD1({ apps: { ...activeState.d1.apps, [app.key]: { ...appState, secret: e.target.value } } })}
                                disabled={!appState.enabled}
                              />
                              <button className="btn-primary" onClick={() => testApp(app.key)} disabled={!appState.enabled}>
                                Test
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Panel>

                  <Panel
                    title="D. Generate Button"
                    subtitle="Build the Business Intelligence & Positioning Document once the inputs are in place."
                  >
                    <button className="btn-primary" onClick={generateD1} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Build Business Intelligence & Positioning Document
                    </button>
                  </Panel>

                  <Panel
                    title="E. Output Panel"
                    subtitle="Rendered markdown result. This unlocks Deliverable 2 when transcript, assets, and output are present."
                  >
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                        <Mini label="Transformation" value={activeState.d1.transformationType || '—'} />
                        <Mini label="Buying Trigger" value={activeState.d1.buyingTrigger || '—'} />
                        <Mini label="Customer Intents" value={activeState.d1.customerIntents ? 'Captured' : '—'} />
                        <Mini label="Formula" value={activeState.d1.dominantFormula || '—'} />
                      </div>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7, color: 'var(--white)' }}>
                        {activeState.d1.output || 'Press the build button to render the markdown result.'}
                      </pre>
                      <CompletionNotice complete={currentStepComplete(1)} nextLabel="Deliverable 2" />
                    </div>
                  </Panel>
                </>
              )}

              {activeTab === 2 && (
                <>
                  <Panel title="Inputs" subtitle="Use the positioning formula from D1, the uploaded images, and the top objection.">
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Positioning formula from D1">
                          <div className="input" style={{ minHeight: 44, display: 'flex', alignItems: 'center', color: 'var(--teal)' }}>{activeState.d1.dominantFormula || 'Generate Deliverable 1 first.'}</div>
                        </Field>
                        <Field label="Top objection">
                          <input className="input" value={activeState.d2.topObjection} onChange={e => updateD2({ topObjection: e.target.value })} placeholder="e.g. I need to think about it" />
                        </Field>
                      </div>

                      <Field label="Uploaded images">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {allAssets.length === 0 ? (
                            <div style={{ color: 'var(--grey)', fontSize: 13 }}>Upload proof images in Deliverable 1 first.</div>
                          ) : allAssets.map(asset => (
                            <button
                              key={asset.path}
                              onClick={() => toggleAssetSelection(asset.path)}
                              style={{
                                border: `1px solid ${activeState.d2.selectedAssets.includes(asset.path) ? 'var(--teal)' : 'var(--border2)'}`,
                                background: activeState.d2.selectedAssets.includes(asset.path) ? 'rgba(0,229,195,0.08)' : 'var(--bg2)',
                                color: 'var(--white)',
                                padding: '8px 10px',
                                borderRadius: 999,
                                cursor: 'pointer',
                                fontSize: 11,
                              }}
                            >
                              {asset.name}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </Panel>

                  <Panel title="Action" subtitle="Generate the proof carousel copy and export labels.">
                    <button className="btn-primary" onClick={generateD2} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Proof Carousel Copy
                    </button>
                  </Panel>

                  <Panel title="Outputs" subtitle="3 headline variants, 3 CTA variants, 3 subtext variants, plus asset labels.">
                    <div style={{ display: 'grid', gap: 12 }}>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d2.output || 'Generate the carousel copy to see the output.'}</pre>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {activeState.d2.exportLabels.map(label => (
                          <span key={label} style={{ border: '1px solid var(--border2)', borderRadius: 999, padding: '5px 10px', fontSize: 11, color: 'var(--grey)', fontFamily: 'DM Mono' }}>{label}</span>
                        ))}
                      </div>
                      <CompletionNotice complete={currentStepComplete(2)} nextLabel="Deliverable 3" />
                    </div>
                  </Panel>
                </>
              )}

              {activeTab === 3 && (
                <>
                  <Panel title="Inputs" subtitle="Use the D1 intelligence, uploaded images, and brand colors.">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="D1 intelligence">
                        <div className="input" style={{ minHeight: 120, whiteSpace: 'pre-wrap', color: 'var(--grey2)', overflow: 'auto' }}>{activeState.d1.output || 'Generate Deliverable 1 first.'}</div>
                      </Field>
                      <Field label="Brand colors">
                        <textarea className="input" rows={5} value={activeState.d3.brandColors} onChange={e => updateD3({ brandColors: e.target.value })} placeholder="#6A00F4, #9D4BFF, #EBD7FF" />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate pain-based, outcome-based, and offer-based ad prompts and push them to AdCreative.ai.">
                    <button className="btn-primary" onClick={generateD3} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Push Prompts to AdCreative.ai
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Download creatives and label by campaign usage.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d3.output || 'Generate the ad variants to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(3)} nextLabel="Deliverable 4" />
                  </Panel>
                </>
              )}

              {activeTab === 4 && (
                <>
                  <Panel title="Inputs" subtitle="Vertical, buying trigger, and customer intents drive the lead magnet recommendation.">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Vertical">
                        <input className="input" value={activeState.d4.vertical} onChange={e => updateD4({ vertical: e.target.value })} placeholder="Plumbing, landscaping, detailing..." />
                      </Field>
                      <Field label="Buying trigger">
                        <input className="input" value={activeState.d4.buyingTrigger} onChange={e => updateD4({ buyingTrigger: e.target.value })} placeholder="Urgency, trust, price, speed..." />
                      </Field>
                      <Field label="Customer intents">
                        <textarea className="input" rows={4} value={activeState.d4.customerIntents} onChange={e => updateD4({ customerIntents: e.target.value })} placeholder="What the buyer is trying to solve..." />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the guide topic, full PDF copy, CTA, and Meta Instant Form schema.">
                    <button className="btn-primary" onClick={generateD4} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Lead Magnet
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Lead magnet markdown, PDF export, and form field schema.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d4.output || 'Generate the lead magnet to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(4)} nextLabel="Deliverable 5" />
                  </Panel>
                </>
              )}

              {activeTab === 5 && (
                <>
                  <Panel title="Inputs" subtitle="Define the conversion campaign structure.">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Targeting">
                        <textarea className="input" rows={4} value={activeState.d5.targeting} onChange={e => updateD5({ targeting: e.target.value })} placeholder="Local radius, interests, exclusions..." />
                      </Field>
                      <Field label="Age ranges">
                        <input className="input" value={activeState.d5.ageRanges} onChange={e => updateD5({ ageRanges: e.target.value })} placeholder="25-55" />
                      </Field>
                      <Field label="Exclusions">
                        <textarea className="input" rows={4} value={activeState.d5.exclusions} onChange={e => updateD5({ exclusions: e.target.value })} placeholder="Competitors, irrelevant buyers..." />
                      </Field>
                      <Field label="Budgets">
                        <input className="input" value={activeState.d5.budget} onChange={e => updateD5({ budget: e.target.value })} placeholder="Daily spend, scaling rule, cap..." />
                      </Field>
                      <Field label="Keyword trigger">
                        <input className="input" value={activeState.d5.keywordTrigger} onChange={e => updateD5({ keywordTrigger: e.target.value })} placeholder="e.g. PROOF" />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the full Campaign 1 build sheet.">
                    <button className="btn-primary" onClick={generateD5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Full Campaign Spec
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Targeting, age ranges, exclusions, budgets, keyword trigger, and ad set structure.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d5.output || 'Generate the conversion campaign spec to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(5)} nextLabel="Deliverable 6" />
                  </Panel>
                </>
              )}

              {activeTab === 6 && (
                <>
                  <Panel title="Inputs" subtitle="Define the leads campaign audience structure.">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      <Field label="Fresh audiences">
                        <textarea className="input" rows={4} value={activeState.d6.freshAudiences} onChange={e => updateD6({ freshAudiences: e.target.value })} placeholder="New audience pools..." />
                      </Field>
                      <Field label="Non converters">
                        <textarea className="input" rows={4} value={activeState.d6.nonConverters} onChange={e => updateD6({ nonConverters: e.target.value })} placeholder="Engaged but not converted..." />
                      </Field>
                      <Field label="Lookalike 3-5%">
                        <input className="input" value={activeState.d6.lookalike} onChange={e => updateD6({ lookalike: e.target.value })} placeholder="3-5% lookalike audience" />
                      </Field>
                      <Field label="Lead form setup">
                        <textarea className="input" rows={4} value={activeState.d6.leadFormSetup} onChange={e => updateD6({ leadFormSetup: e.target.value })} placeholder="Name, phone, service interest..." />
                      </Field>
                      <Field label="Budgets">
                        <input className="input" value={activeState.d6.budget} onChange={e => updateD6({ budget: e.target.value })} placeholder="Daily budget and scale rule" />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the Campaign 2 build sheet.">
                    <button className="btn-primary" onClick={generateD6} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate Leads Campaign
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Fresh audiences, non-converters, lookalike 3-5%, lead form setup, and budgets.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d6.output || 'Generate the leads campaign spec to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(6)} nextLabel="Deliverable 7" />
                  </Panel>
                </>
              )}

              {activeTab === 7 && (
                <>
                  <Panel title="Inputs" subtitle="Generate the six-message sales flow and objection handling." >
                    <div style={{ display: 'grid', gap: 12 }}>
                      {[
                        ['welcome', 'Welcome'],
                        ['jobType', 'Job type'],
                        ['urgency', 'Urgency'],
                        ['area', 'Area'],
                        ['priceBridge', 'Price bridge'],
                        ['bookingClose', 'Booking close'],
                      ].map(([field, label]) => (
                        <Field key={field} label={label}>
                          <textarea
                            className="input"
                            rows={2}
                            value={(activeState.d7 as any)[field]}
                            onChange={e => updateD7({ [field]: e.target.value } as Partial<D7State>)}
                            placeholder={`${label} message...`}
                          />
                        </Field>
                      ))}
                      <Field label="Objection handler">
                        <textarea className="input" rows={3} value={activeState.d7.objectionHandler} onChange={e => updateD7({ objectionHandler: e.target.value })} placeholder="Handle the main objection..." />
                      </Field>
                      <Field label="Tyre kicker exit">
                        <textarea className="input" rows={3} value={activeState.d7.tyreKickerExit} onChange={e => updateD7({ tyreKickerExit: e.target.value })} placeholder="Polite exit for non-serious enquiries..." />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Generate the 6-message sales flow." >
                    <button className="btn-primary" onClick={generateD7} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Generate WhatsApp DM Qualifier Script
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="6-message flow, objection handler, and tyre kicker exit.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d7.output || 'Generate the sales flow to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(7)} nextLabel="Deliverable 8" />
                  </Panel>
                </>
              )}

              {activeTab === 8 && (
                <>
                  <Panel title="Inputs" subtitle="Use the outputs from D5 and D7 to build the ManyChat logic." >
                    <div style={{ display: 'grid', gap: 12 }}>
                      <Field label="Keyword trigger">
                        <input className="input" value={activeState.d8.keywordTrigger} onChange={e => updateD8({ keywordTrigger: e.target.value })} placeholder="Use the same keyword as D5" />
                      </Field>
                      <Field label="Response tree">
                        <textarea className="input" rows={4} value={activeState.d8.responseTree} onChange={e => updateD8({ responseTree: e.target.value })} placeholder="Map the branch structure..." />
                      </Field>
                      <Field label="Conditions">
                        <textarea className="input" rows={4} value={activeState.d8.conditions} onChange={e => updateD8({ conditions: e.target.value })} placeholder="Conditions for branching..." />
                      </Field>
                      <Field label="Phone capture">
                        <input className="input" value={activeState.d8.phoneCapture} onChange={e => updateD8({ phoneCapture: e.target.value })} placeholder="Capture phone before booking" />
                      </Field>
                      <Field label="Booking branch">
                        <textarea className="input" rows={4} value={activeState.d8.bookingBranch} onChange={e => updateD8({ bookingBranch: e.target.value })} placeholder="Booking confirmation path..." />
                      </Field>
                    </div>
                  </Panel>
                  <Panel title="QA Checklist" subtitle="All branches tested, messages firing, and data capture confirmed.">
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        ['qaBranches', 'All branches tested'],
                        ['qaMessages', 'Messages firing'],
                        ['qaData', 'Data capture works'],
                      ].map(([key, label]) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border2)', borderRadius: 999, cursor: 'pointer' }}>
                          <input type="checkbox" checked={(activeState.d8 as any)[key]} onChange={e => updateD8({ [key]: e.target.checked } as Partial<D8State>)} />
                          <span style={{ fontSize: 12 }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Action" subtitle="Build the ManyChat logic and QA sheet.">
                    <button className="btn-primary" onClick={generateD8} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} /> Build ManyChat Logic
                    </button>
                  </Panel>
                  <Panel title="Outputs" subtitle="Keyword trigger, response tree, conditions, phone capture, booking branch, and QA checklist.">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 16, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)', fontSize: 12, lineHeight: 1.7 }}>{activeState.d8.output || 'Generate the ManyChat logic to see the output.'}</pre>
                    <CompletionNotice complete={currentStepComplete(8)} nextLabel="Process complete" />
                  </Panel>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 10, padding: 12, background: 'var(--bg)' }}>
      <div style={{ fontSize: 10, fontFamily: 'DM Mono', textTransform: 'uppercase', color: 'var(--grey)', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--white)', lineHeight: 1.6 }}>{value}</div>
    </div>
  )
}

function CompletionNotice({ complete, nextLabel }: { complete: boolean; nextLabel: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, border: `1px solid ${complete ? 'rgba(0,229,195,0.28)' : 'var(--border2)'}`, background: complete ? 'rgba(0,229,195,0.04)' : 'var(--bg)' }}>
      {complete ? <CheckCircle2 size={16} color="var(--teal)" /> : <Circle size={16} color="var(--grey2)" />}
      <div style={{ fontSize: 12, color: complete ? 'var(--teal)' : 'var(--grey)' }}>
        {complete ? `Unlocked ${nextLabel}` : `Complete this deliverable to unlock ${nextLabel}.`}
      </div>
    </div>
  )
}
