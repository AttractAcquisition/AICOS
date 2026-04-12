import { Shield, GitBranch, Inbox, Brain } from 'lucide-react'

export type RouteKey = 'admin' | 'distribution' | 'delivery' | 'brain'

export interface RouteMeta {
  path: string
  label: string
  section: string
  icon: any
  roles: Array<'admin' | 'distribution' | 'delivery' | 'client'>
}

export const ROUTE_CONFIG: Record<RouteKey, RouteMeta> = {
  admin: {
    path: '/admin',
    label: 'Admin Console',
    section: 'Governance',
    icon: Shield,
    roles: ['admin'],
  },
  distribution: {
    path: '/distribution',
    label: 'Distribution Console',
    section: 'Acquisition',
    icon: GitBranch,
    roles: ['admin', 'distribution'],
  },
  delivery: {
    path: '/delivery',
    label: 'Delivery Console',
    section: 'Fulfilment',
    icon: Inbox,
    roles: ['admin', 'delivery'],
  },
  brain: {
    path: '/brain',
    label: 'Knowledge Console',
    section: 'Knowledge',
    icon: Brain,
    roles: ['admin'],
  },
}

export const DEFAULT_ROUTE_BY_ROLE: Record<'admin' | 'distribution' | 'delivery' | 'client', string> = {
  admin: '/dashboard',
  distribution: '/distribution',
  delivery: '/delivery',
  client: '/portal',
}
