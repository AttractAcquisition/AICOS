import type { Role } from './auth'

export type LibraryScope = 'admin' | 'distribution' | 'delivery' | 'client'

export const TEMPLATE_CATEGORY_ORDER = ['outreach', 'mjr', 'spoa', 'sprint', 'brand', 'authority', 'delivery', 'content', 'support', 'finance', 'general', 'admin'] as const
export const SOP_CATEGORY_ORDER = [
  'Outreach & Pipeline',
  'Missed Jobs Report',
  'Strategic Plan of Action',
  'Proof Sprint',
  'Proof Brand',
  'Authority Brand',
  'General',
  'Admin',
] as const

const TEMPLATE_VISIBILITY: Record<LibraryScope, string[]> = {
  admin: [...TEMPLATE_CATEGORY_ORDER],
  distribution: ['outreach', 'mjr', 'spoa', 'general'],
  delivery: ['sprint', 'brand', 'authority', 'delivery', 'content', 'support', 'general'],
  client: ['sprint', 'brand', 'authority', 'general'],
}

const SOP_VISIBILITY: Record<LibraryScope, string[]> = {
  admin: [...SOP_CATEGORY_ORDER],
  distribution: ['Outreach & Pipeline', 'Missed Jobs Report', 'Strategic Plan of Action', 'General'],
  delivery: ['Proof Sprint', 'Proof Brand', 'Authority Brand', 'General'],
  client: ['Proof Sprint', 'Proof Brand', 'Authority Brand', 'General'],
}

export function roleToLibraryScope(role: Role): LibraryScope | null {
  if (role === 'admin' || role === 'distribution' || role === 'delivery' || role === 'client') return role
  return null
}

export function getVisibleTemplateCategories(scope: LibraryScope | null | undefined) {
  if (!scope) return []
  return TEMPLATE_VISIBILITY[scope] || []
}

export function getVisibleSopCategories(scope: LibraryScope | null | undefined) {
  if (!scope) return []
  return SOP_VISIBILITY[scope] || []
}

export function getDefaultTemplateCategory(scope: LibraryScope | null | undefined) {
  return getVisibleTemplateCategories(scope)[0] || 'outreach'
}

export function getDefaultSopCategory(scope: LibraryScope | null | undefined) {
  return getVisibleSopCategories(scope)[0] || 'General'
}

export function filterTemplatesByScope<T extends { category?: string | null }>(rows: T[], scope: LibraryScope | null | undefined) {
  const allowed = getVisibleTemplateCategories(scope)
  if (!scope || allowed.length === 0) return []
  if (scope === 'admin') return rows
  return rows.filter(row => row.category ? allowed.includes(row.category) : false)
}

export function filterSopsByScope<T extends { category?: string | null; status?: string | null }>(rows: T[], scope: LibraryScope | null | undefined) {
  const allowed = getVisibleSopCategories(scope)
  if (!scope || allowed.length === 0) return []
  const base = scope === 'admin' ? rows : rows.filter(row => row.status === 'active')
  if (scope === 'admin') return base
  return base.filter(row => row.category ? allowed.includes(row.category) : false)
}
