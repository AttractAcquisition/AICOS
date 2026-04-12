import { type LucideIcon, Layout, Database, MessageSquare, Workflow, Calendar, BarChart, Library, Briefcase, Code, Github, Facebook, Bot, Cpu, BrainCircuit, Instagram, Sparkles } from 'lucide-react'

export type ConsoleKey = 'admin' | 'distribution' | 'delivery' | 'knowledge'

export type ExternalLinkItem = {
  id: string
  name: string
  description: string
  url: string
  isInternal?: boolean
  status: string
  color: string
  icon: LucideIcon
  consoles: ConsoleKey[]
}

const ALL_LINKS: ExternalLinkItem[] = [
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Backend infrastructure, SQL database, and real-time prospect storage.',
    url: 'https://supabase.com/dashboard',
    status: 'Backend',
    color: '#3ECF8E',
    icon: Database,
    consoles: ['admin'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Direct client communication and delivery threads.',
    url: 'https://wa.me/31628960405',
    status: 'Communication',
    color: '#25D366',
    icon: MessageSquare,
    consoles: ['admin'],
  },
  {
    id: 'n8n',
    name: 'N8n',
    description: 'Workflow automation hub for connecting AA infrastructure.',
    url: 'https://n8n.io/',
    status: 'Automation',
    color: '#FF6C37',
    icon: Workflow,
    consoles: ['admin'],
  },
  {
    id: 'ads-manager',
    name: 'Ads Manager',
    description: 'Campaign control and performance scaling.',
    url: 'https://adsmanager.facebook.com/',
    status: 'Advertising',
    color: '#0081FB',
    icon: BarChart,
    consoles: ['admin'],
  },
  {
    id: 'meta-business-suite',
    name: 'Meta Business Suite',
    description: 'Central hub for Meta business assets and pages.',
    url: 'https://business.facebook.com/',
    status: 'Management',
    color: '#0081FB',
    icon: Briefcase,
    consoles: ['admin'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Source code management and version control.',
    url: 'https://github.com/',
    status: 'Development',
    color: '#ffffff',
    icon: Github,
    consoles: ['admin'],
  },
  {
    id: 'openai-platform',
    name: 'Open AI Platform',
    description: 'API access and model management for OpenAI.',
    url: 'https://platform.openai.com/',
    status: 'API',
    color: '#ffffff',
    icon: Cpu,
    consoles: ['admin'],
  },
  {
    id: 'claude-platform',
    name: 'Claude Platform',
    description: 'API access and developer tools for Anthropic models.',
    url: 'https://console.anthropic.com/',
    status: 'API',
    color: '#D97757',
    icon: Cpu,
    consoles: ['admin'],
  },
  {
    id: 'adcreative-ai',
    name: 'AdCreative AI',
    description: 'Rapid creative generation for acquisition campaigns.',
    url: 'https://www.adcreative.ai/',
    status: 'Creative',
    color: '#3b82f6',
    icon: Sparkles,
    consoles: ['distribution', 'delivery'],
  },
  {
    id: 'aa-studio',
    name: 'AA Studio',
    description: 'Proprietary MJR and SPOA generation engine.',
    url: 'https://studio.attractacq.com',
    isInternal: true,
    status: 'Live',
    color: '#00C9A7',
    icon: Layout,
    consoles: ['distribution', 'delivery'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Primary brand distribution and audience touchpoint.',
    url: 'https://instagram.com/attractacq',
    status: 'Social',
    color: '#E1306C',
    icon: Instagram,
    consoles: ['distribution', 'delivery'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Primary social network platform.',
    url: 'https://facebook.com/',
    status: 'Social',
    color: '#1877F2',
    icon: Facebook,
    consoles: ['distribution', 'delivery'],
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Booking infrastructure for 1:1 strategy calls.',
    url: 'https://calendly.com/attractacquisition',
    status: 'Booking',
    color: '#006BFF',
    icon: Calendar,
    consoles: ['distribution', 'delivery'],
  },
  {
    id: 'ads-library',
    name: 'Ads Library',
    description: 'Competitor ad research and creative inspiration.',
    url: 'https://www.facebook.com/ads/library/',
    status: 'Research',
    color: '#0081FB',
    icon: Library,
    consoles: ['distribution'],
  },
  {
    id: 'apify',
    name: 'Apify',
    description: 'Web scraping and data extraction automation.',
    url: 'https://console.apify.com/',
    status: 'Scraping',
    color: '#97E754',
    icon: Code,
    consoles: ['distribution'],
  },
  {
    id: 'chat-gpt',
    name: 'Chat GPT',
    description: 'Conversational AI for writing, synthesis, and support.',
    url: 'https://chat.openai.com/',
    status: 'AI',
    color: '#10A37F',
    icon: Bot,
    consoles: ['knowledge'],
  },
  {
    id: 'grok',
    name: 'Grok',
    description: 'Real-time AI research and analysis.',
    url: 'https://grok.x.ai/',
    status: 'AI',
    color: '#ffffff',
    icon: BrainCircuit,
    consoles: ['knowledge'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google AI for multimodal reasoning and tasks.',
    url: 'https://gemini.google.com/',
    status: 'AI',
    color: '#8E24AA',
    icon: Sparkles,
    consoles: ['knowledge'],
  },
  {
    id: 'claude-ai',
    name: 'Claude AI',
    description: 'Anthropic AI for detailed analysis and writing.',
    url: 'https://claude.ai/',
    status: 'AI',
    color: '#D97757',
    icon: Bot,
    consoles: ['knowledge'],
  },
]

export function getExternalLinksForConsole(consoleKey: ConsoleKey) {
  return ALL_LINKS.filter(link => link.consoles.includes(consoleKey))
}

export const EXTERNAL_LINKS = ALL_LINKS
