import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './lib/toast'
import { AuthProvider, useAuth } from './lib/auth'
import { DEFAULT_ROUTE_BY_ROLE } from './lib/route-config'
import RoleWrapper from './components/RoleWrapper'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import AdminConsole from './pages/AdminConsole'
import DistributionConsole from './pages/DistributionConsole'
import DeliveryConsole from './pages/DeliveryConsole'
import ClientPortal from './pages/ClientPortal'
import BrainConsole from './pages/BrainConsole'
import Brain from './pages/Brain'
import ChatPage from './pages/ChatPage'
import Documents from './pages/Documents'
import ContentPage from './pages/Content'
import Scraper from './pages/Scraper'
import Prospects from './pages/Prospects'
import Outreach from './pages/Outreach'
import CRM from './pages/crm'
import Clients from './pages/Clients'
import Sprints from './pages/Sprints'
import ProofSprintV2 from './pages/ProofSprintV2'
import SprintDetail from './pages/SprintDetail'
import DeliveryPortal from './pages/DeliveryPortal'
import ProofBrand from './pages/ProofBrand'
import ProofBrandV2 from './pages/ProofBrandV2'
import AuthorityBrand from './pages/AuthorityBrand'
import AuthorityBrandV2 from './pages/AuthorityBrandV2'
import GoogleOAuthStart from './pages/GoogleOAuthStart'
import GoogleOAuthCallback from './pages/GoogleOAuthCallback'
import Studio from './pages/Studio'
import SPOA from './pages/SPOA'
import SprintDashboard from './pages/SprintDashboard'
import LivePipelineDashboard from './pages/LivePipelineDashboard'
import Templates from './pages/Templates'
import TemplateView from './pages/TemplateView'
import Sops from './pages/Sops'
import AdminControl from './pages/AdminControl'
import Finance from './pages/Finance'
import IncomeTracking from './pages/IncomeTracking'

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--grey)' }}>Loading AICOS...</div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function LandingRedirect() {
  const { role } = useAuth()
  const target = role ? DEFAULT_ROUTE_BY_ROLE[role as keyof typeof DEFAULT_ROUTE_BY_ROLE] : '/dashboard'
  return <Navigate to={target} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/oauth/google/start" element={<GoogleOAuthStart />} />
            <Route path="/oauth/callback" element={<GoogleOAuthCallback />} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal" element={<RequireAuth><RoleWrapper allowedRoles={['client']}><ClientPortal /></RoleWrapper></RequireAuth>} />
            <Route path="/portal/sprint-dashboard" element={<RequireAuth><RoleWrapper allowedRoles={['client']}><SprintDashboard /></RoleWrapper></RequireAuth>} />
            <Route path="/portal/live-pipeline-dashboard" element={<RequireAuth><RoleWrapper allowedRoles={['client']}><LivePipelineDashboard /></RoleWrapper></RequireAuth>} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<LandingRedirect />} />
              <Route path="dashboard" element={<RoleWrapper allowedRoles={['admin']}><Home /></RoleWrapper>} />
              <Route path="admin" element={<RoleWrapper allowedRoles={['admin']}><AdminConsole /></RoleWrapper>} />
              <Route path="admin/control" element={<RoleWrapper allowedRoles={['admin']}><AdminControl /></RoleWrapper>} />
              <Route path="admin/finance" element={<RoleWrapper allowedRoles={['admin']}><Finance /></RoleWrapper>} />
              <Route path="admin/income" element={<RoleWrapper allowedRoles={['admin']}><IncomeTracking /></RoleWrapper>} />
              <Route path="spoa" element={<RoleWrapper allowedRoles={['admin']}><SPOA /></RoleWrapper>} />
              <Route path="templates" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery', 'client']}><Templates /></RoleWrapper>} />
              <Route path="sops" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery', 'client']}><Sops /></RoleWrapper>} />
              <Route path="distribution" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><DistributionConsole /></RoleWrapper>} />
              <Route path="distribution/scraper" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Scraper /></RoleWrapper>} />
              <Route path="distribution/prospects" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Prospects /></RoleWrapper>} />
              <Route path="distribution/outreach" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Outreach /></RoleWrapper>} />
              <Route path="distribution/crm" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><CRM /></RoleWrapper>} />
              <Route path="distribution/studio" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Studio /></RoleWrapper>} />
              <Route path="distribution/spoa" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><SPOA /></RoleWrapper>} />
              <Route path="distribution/templates" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Templates /></RoleWrapper>} />
              <Route path="distribution/sops" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Sops /></RoleWrapper>} />
              <Route path="template-view" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery', 'client']}><TemplateView /></RoleWrapper>} />
              <Route path="delivery" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><DeliveryConsole /></RoleWrapper>} />
              <Route path="delivery/clients" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><Clients /></RoleWrapper>} />
              <Route path="delivery/sprints" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><Sprints /></RoleWrapper>} />
              <Route path="delivery/sprints-v2" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><ProofSprintV2 /></RoleWrapper>} />
              <Route path="delivery/sprints/:id" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><SprintDetail /></RoleWrapper>} />
              <Route path="delivery/portal" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><DeliveryPortal /></RoleWrapper>} />
              <Route path="delivery/proof-brand" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><ProofBrand /></RoleWrapper>} />
              <Route path="delivery/proof-brand-v2" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><ProofBrandV2 /></RoleWrapper>} />
              <Route path="delivery/authority-brand" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><AuthorityBrand /></RoleWrapper>} />
              <Route path="delivery/authority-brand-v2" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><AuthorityBrandV2 /></RoleWrapper>} />
              <Route path="brain" element={<RoleWrapper allowedRoles={['admin']}><BrainConsole /></RoleWrapper>} />
              <Route path="brain/chat" element={<RoleWrapper allowedRoles={['admin']}><Brain /></RoleWrapper>} />
              <Route path="brain/prompts" element={<RoleWrapper allowedRoles={['admin']}><ChatPage /></RoleWrapper>} />
              <Route path="brain/repository" element={<RoleWrapper allowedRoles={['admin']}><Documents /></RoleWrapper>} />
              <Route path="brain/content" element={<RoleWrapper allowedRoles={['admin']}><ContentPage /></RoleWrapper>} />
              <Route path="brain/templates" element={<RoleWrapper allowedRoles={['admin']}><Templates /></RoleWrapper>} />
              <Route path="brain/sops" element={<RoleWrapper allowedRoles={['admin']}><Sops /></RoleWrapper>} />
              <Route path="content" element={<RoleWrapper allowedRoles={['admin']}><ContentPage /></RoleWrapper>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
