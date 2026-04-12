import { type LucideIcon, Layout, Database, MessageSquare, Workflow, Calendar, BarChart, Library, Briefcase, Code, Github, Facebook, Bot, Cpu, BrainCircuit, Instagram, Sparkles, Linkedin, Mail, FolderOpen, Globe, Settings, FileText, DollarSign } from 'lucide-react'

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
  { id: 'supabase', name: 'Supabase', description: 'Backend infrastructure, SQL database, and real-time prospect storage.', url: 'https://supabase.com/dashboard', status: 'Backend', color: '#3ECF8E', icon: Database, consoles: ['admin'] },
  { id: 'whatsapp-business', name: 'WhatsApp Business', description: 'Direct client communication and delivery threads.', url: 'https://wa.me/31628960405', status: 'Communication', color: '#25D366', icon: MessageSquare, consoles: ['admin'] },
  { id: 'n8n', name: 'N8n', description: 'Workflow automation hub for connecting AA infrastructure.', url: 'https://n8n.io/', status: 'Automation', color: '#FF6C37', icon: Workflow, consoles: ['admin'] },
  { id: 'ads-manager', name: 'Ads Manager', description: 'Campaign control and performance scaling.', url: 'https://adsmanager.facebook.com/', status: 'Advertising', color: '#0081FB', icon: BarChart, consoles: ['admin'] },
  { id: 'meta-business-suite', name: 'Meta Business Suite', description: 'Central hub for Meta business assets and pages.', url: 'https://business.facebook.com/', status: 'Management', color: '#0081FB', icon: Briefcase, consoles: ['admin'] },
  { id: 'github', name: 'GitHub', description: 'Source code management and version control.', url: 'https://github.com/', status: 'Development', color: '#ffffff', icon: Github, consoles: ['admin'] },
  { id: 'lovable', name: 'Lovable', description: 'Rapid app-building and UI prototyping.', url: 'https://lovable.dev/', status: 'Build', color: '#F472B6', icon: Layout, consoles: ['admin'] },
  { id: 'openai-platform', name: 'OpenAI Platform', description: 'API access and model management for OpenAI.', url: 'https://platform.openai.com/', status: 'API', color: '#ffffff', icon: Cpu, consoles: ['admin'] },
  { id: 'claude-platform', name: 'Claude Platform', description: 'API access and developer tools for Anthropic models.', url: 'https://console.anthropic.com/', status: 'API', color: '#D97757', icon: Cpu, consoles: ['admin'] },
  { id: 'aa-finance', name: 'AA - Finance', description: 'Internal finance cockpit and operating view.', url: 'https://finance.attractacq.com', isInternal: true, status: 'Internal', color: '#22C55E', icon: DollarSign, consoles: ['admin'] },
  { id: 'aa-os', name: 'AA - OS', description: 'Operating system layer for core business coordination.', url: 'https://os.attractacq.com', isInternal: true, status: 'Internal', color: '#38BDF8', icon: Settings, consoles: ['admin'] },
  { id: 'aa', name: 'AA', description: 'Primary Attract Acquisition home environment.', url: 'https://attractacq.com', status: 'Home', color: '#F59E0B', icon: Globe, consoles: ['admin'] },
  { id: 'attract-acq', name: 'Attract Acq', description: 'Primary company web presence and brand surface.', url: 'https://attractacq.com', status: 'Brand', color: '#F59E0B', icon: Globe, consoles: ['admin'] },
  { id: 'slack', name: 'Slack', description: 'Internal communication workspace.', url: 'https://slack.com/', status: 'Communication', color: '#4A154B', icon: MessageSquare, consoles: ['admin', 'distribution', 'delivery'] },
  { id: 'telegram', name: 'Telegram', description: 'Chat and notification surface for team comms.', url: 'https://web.telegram.org/', status: 'Communication', color: '#229ED9', icon: MessageSquare, consoles: ['admin'] },
  { id: 'gmail', name: 'Gmail', description: 'Email inbox and outbound coordination.', url: 'https://mail.google.com/', status: 'Email', color: '#EA4335', icon: Mail, consoles: ['admin', 'delivery'] },
  { id: 'standard-bank', name: 'Standard Bank', description: 'Primary banking and transaction operations.', url: 'https://www.standardbank.co.za/', status: 'Banking', color: '#005AA9', icon: Briefcase, consoles: ['admin'] },
  { id: 'stripe', name: 'Stripe', description: 'Payment infrastructure and card processing.', url: 'https://dashboard.stripe.com/', status: 'Payments', color: '#635BFF', icon: DollarSign, consoles: ['admin'] },
  { id: 'payfast', name: 'PayFast', description: 'South African payment gateway operations.', url: 'https://www.payfast.co.za/', status: 'Payments', color: '#00AEEF', icon: DollarSign, consoles: ['admin'] },
  { id: 'xero', name: 'Xero', description: 'Accounting and bookkeeping system.', url: 'https://www.xero.com/', status: 'Accounting', color: '#13B5EA', icon: DollarSign, consoles: ['admin'] },
  { id: 'godaddy', name: 'GoDaddy', description: 'Domain and DNS management.', url: 'https://www.godaddy.com/', status: 'Domains', color: '#1B1B1B', icon: Globe, consoles: ['admin'] },
  { id: 'pandadoc', name: 'PandaDoc', description: 'Proposal, contract, and document workflow.', url: 'https://www.pandadoc.com/', status: 'Documents', color: '#00BCD4', icon: FileText, consoles: ['admin', 'delivery'] },
  { id: 'efiling', name: 'eFiling', description: 'Tax and compliance filing portal.', url: 'https://www.sarsefiling.co.za/', status: 'Compliance', color: '#8B5CF6', icon: FileText, consoles: ['admin'] },
  { id: 'cpic-eservices', name: 'CPIC eServices', description: 'Corporate registration and filing services.', url: 'https://eservices.cipc.co.za/', status: 'Compliance', color: '#8B5CF6', icon: FileText, consoles: ['admin'] },
  { id: 'bizportal', name: 'BIzPortal', description: 'Business services portal and admin workflows.', url: 'https://bizportal.gov.za/', status: 'Portal', color: '#0EA5E9', icon: Briefcase, consoles: ['admin'] },
  { id: 'railway', name: 'Railway', description: 'Hosting and deployment infrastructure.', url: 'https://railway.app/', status: 'Infrastructure', color: '#2DDF8F', icon: Workflow, consoles: ['admin'] },
  { id: 'openclaw-chat', name: 'OpenClaw Chat', description: 'Internal control and operator chat surface.', url: 'https://chat.openclaw.ai/', status: 'Internal', color: '#F59E0B', icon: MessageSquare, consoles: ['admin'] },
  { id: 'google-drive', name: 'Google Drive', description: 'Shared document and file storage.', url: 'https://drive.google.com/', status: 'Files', color: '#4285F4', icon: FolderOpen, consoles: ['admin', 'distribution', 'delivery'] },
  { id: 'miro', name: 'Miro', description: 'Whiteboards and planning workspace.', url: 'https://miro.com/', status: 'Planning', color: '#FFD02F', icon: Layout, consoles: ['admin'] },
  { id: 'meta-developers', name: 'Meta Developers', description: 'Meta API and developer tooling.', url: 'https://developers.facebook.com/', status: 'API', color: '#0081FB', icon: Code, consoles: ['admin'] },
  { id: 'vs-code', name: 'VS Code', description: 'Code editor and development environment.', url: 'https://code.visualstudio.com/', status: 'Dev', color: '#007ACC', icon: Code, consoles: ['admin'] },
  { id: 'adcreative-ai', name: 'Ad Creative AI', description: 'Rapid creative generation for acquisition campaigns.', url: 'https://www.adcreative.ai/', status: 'Creative', color: '#3b82f6', icon: Sparkles, consoles: ['distribution', 'delivery'] },
  { id: 'aa-studio', name: 'AA - Studio', description: 'Proprietary MJR and SPOA generation engine.', url: 'https://studio.attractacq.com', isInternal: true, status: 'Live', color: '#00C9A7', icon: Layout, consoles: ['distribution', 'delivery'] },
  { id: 'facebook', name: 'Facebook', description: 'Primary social network platform.', url: 'https://facebook.com/', status: 'Social', color: '#1877F2', icon: Facebook, consoles: ['distribution', 'delivery'] },
  { id: 'instagram', name: 'Instagram', description: 'Primary brand distribution and audience touchpoint.', url: 'https://instagram.com/attractacq', status: 'Social', color: '#E1306C', icon: Instagram, consoles: ['distribution', 'delivery'] },
  { id: 'ads-library', name: 'Ads Library', description: 'Competitor ad research and creative inspiration.', url: 'https://www.facebook.com/ads/library/', status: 'Research', color: '#0081FB', icon: Library, consoles: ['distribution'] },
  { id: 'linkedin', name: 'LinkedIn', description: 'Professional network and prospecting surface.', url: 'https://www.linkedin.com/', status: 'Social', color: '#0A66C2', icon: Linkedin, consoles: ['distribution'] },
  { id: 'calendly', name: 'Calendly', description: 'Booking infrastructure for 1:1 strategy calls.', url: 'https://calendly.com/attractacquisition', status: 'Booking', color: '#006BFF', icon: Calendar, consoles: ['distribution', 'delivery'] },
  { id: 'aa-portal', name: 'AA - Portal', description: 'Client portal and delivery workspace.', url: 'https://portal.attractacq.com', isInternal: true, status: 'Portal', color: '#00C9A7', icon: Layout, consoles: ['delivery'] },
  { id: 'aa-ai', name: 'AA-AI', description: 'Assistant and automation layer for delivery work.', url: 'https://ai.attractacq.com', isInternal: true, status: 'Internal', color: '#8B5CF6', icon: Bot, consoles: ['delivery'] },
  { id: 'swiss-transfer', name: 'Swiss Transfer', description: 'Secure file transfer for delivery handoffs.', url: 'https://www.swisstransfer.com/', status: 'Files', color: '#2DD4BF', icon: FolderOpen, consoles: ['delivery'] },
  { id: 'chatgpt', name: 'ChatGPT', description: 'Conversational AI for writing, synthesis, and support.', url: 'https://chat.openai.com/', status: 'AI', color: '#10A37F', icon: Bot, consoles: ['knowledge'] },
  { id: 'grok', name: 'Grok', description: 'Real-time AI research and analysis.', url: 'https://grok.x.ai/', status: 'AI', color: '#ffffff', icon: BrainCircuit, consoles: ['knowledge'] },
  { id: 'gemini', name: 'Gemini', description: 'Google AI for multimodal reasoning and tasks.', url: 'https://gemini.google.com/', status: 'AI', color: '#8E24AA', icon: Sparkles, consoles: ['knowledge'] },
  { id: 'claude-ai', name: 'Claude AI', description: 'Anthropic AI for detailed analysis and writing.', url: 'https://claude.ai/', status: 'AI', color: '#D97757', icon: Bot, consoles: ['knowledge'] },
  { id: 'perplexity', name: 'Perplexity AI', description: 'Research engine for fast source-backed answers.', url: 'https://www.perplexity.ai/', status: 'Research', color: '#111111', icon: BrainCircuit, consoles: ['knowledge'] },
]

export function getExternalLinksForConsole(consoleKey: ConsoleKey) {
  return ALL_LINKS.filter(link => link.consoles.includes(consoleKey))
}

export const EXTERNAL_LINKS = ALL_LINKS
