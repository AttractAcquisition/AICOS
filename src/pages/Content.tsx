import { useMemo } from 'react'
import { ConsoleShell } from '../components/ConsoleShell'
import ExternalLinksGrid from '../components/ExternalLinksGrid'
import { EXTERNAL_LINKS } from '../lib/external-links'

const CONSOLE_ORDER = ['admin', 'distribution', 'delivery'] as const

export default function ContentPage() {
  const links = useMemo(() => {
    const seen = new Set<string>()
    return EXTERNAL_LINKS.filter(link => link.consoles.some(consoleKey => CONSOLE_ORDER.includes(consoleKey as any))).filter(link => {
      if (seen.has(link.id)) return false
      seen.add(link.id)
      return true
    })
  }, [])

  return (
    <ConsoleShell
      badge="AIOS / Knowledge"
      title="External Software Links"
      subtitle="All approved external links surfaced across admin, distribution, and delivery consoles."
      stats={[]}
    >
      <ExternalLinksGrid links={links} />
    </ConsoleShell>
  )
}
