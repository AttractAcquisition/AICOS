import React from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './lib/toast'
import { AuthProvider, useAuth } from './lib/auth'
import RoleWrapper from './components/RoleWrapper'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import DashboardLegacy from './pages/Dashboard'
import Tracker from './pages/Tracker'
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
import SprintDetail from './pages/SprintDetail'
import DeliveryPortal from './pages/DeliveryPortal'
import ProofBrand from './pages/ProofBrand'
import AuthorityBrand from './pages/AuthorityBrand'
import Studio from './pages/Studio'
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

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Home />} />
              <Route path="legacy-dashboard" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery', 'client']}><DashboardLegacy /></RoleWrapper>} />
              <Route path="tracker" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery', 'client']}><Tracker /></RoleWrapper>} />
              <Route path="admin" element={<RoleWrapper allowedRoles={['admin']}><AdminConsole /></RoleWrapper>} />
              <Route path="admin/control" element={<RoleWrapper allowedRoles={['admin']}><AdminControl /></RoleWrapper>} />
              <Route path="admin/finance" element={<RoleWrapper allowedRoles={['admin']}><Finance /></RoleWrapper>} />
              <Route path="admin/income" element={<RoleWrapper allowedRoles={['admin']}><IncomeTracking /></RoleWrapper>} />
              <Route path="distribution" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><DistributionConsole /></RoleWrapper>} />
              <Route path="distribution/scraper" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Scraper /></RoleWrapper>} />
              <Route path="distribution/prospects" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Prospects /></RoleWrapper>} />
              <Route path="distribution/outreach" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Outreach /></RoleWrapper>} />
              <Route path="distribution/crm" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><CRM /></RoleWrapper>} />
              <Route path="distribution/studio" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Studio /></RoleWrapper>} />
              <Route path="distribution/templates" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Templates /></RoleWrapper>} />
              <Route path="distribution/sops" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><Sops /></RoleWrapper>} />
              <Route path="template-view" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><TemplateView /></RoleWrapper>} />
              <Route path="delivery" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><DeliveryConsole /></RoleWrapper>} />
              <Route path="delivery/clients" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><Clients /></RoleWrapper>} />
              <Route path="delivery/sprints" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><Sprints /></RoleWrapper>} />
              <Route path="delivery/sprints/:id" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><SprintDetail /></RoleWrapper>} />
              <Route path="delivery/portal" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><DeliveryPortal /></RoleWrapper>} />
              <Route path="delivery/proof-brand" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><ProofBrand /></RoleWrapper>} />
              <Route path="delivery/authority-brand" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><AuthorityBrand /></RoleWrapper>} />
              <Route path="portal" element={<RoleWrapper allowedRoles={['admin', 'delivery', 'client']}><ClientPortal /></RoleWrapper>} />
              <Route path="brain" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><BrainConsole /></RoleWrapper>} />
              <Route path="brain/chat" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><Brain /></RoleWrapper>} />
              <Route path="brain/prompts" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><ChatPage /></RoleWrapper>} />
              <Route path="brain/repository" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><Documents /></RoleWrapper>} />
              <Route path="brain/content" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><ContentPage /></RoleWrapper>} />
              <Route path="brain/templates" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><Templates /></RoleWrapper>} />
              <Route path="brain/sops" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><Sops /></RoleWrapper>} />
              <Route path="content" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><ContentPage /></RoleWrapper>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
