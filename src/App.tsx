import React from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './lib/toast'
import { AuthProvider, useAuth } from './lib/auth'
import RoleWrapper from './components/RoleWrapper'
import Layout from './components/Layout'
import Login from './pages/Login'
import AdminConsole from './pages/AdminConsole'
import DistributionConsole from './pages/DistributionConsole'
import DeliveryConsole from './pages/DeliveryConsole'
import ClientPortal from './pages/ClientPortal'
import BrainConsole from './pages/BrainConsole'
import { DEFAULT_ROUTE_BY_ROLE } from './lib/route-config'

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

function RootRedirect() {
  const { role } = useAuth()
  return <Navigate to={DEFAULT_ROUTE_BY_ROLE[(role || 'client') as keyof typeof DEFAULT_ROUTE_BY_ROLE] || '/portal'} replace />
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
              <Route index element={<RootRedirect />} />
              <Route path="admin" element={<RoleWrapper allowedRoles={['admin']}><AdminConsole /></RoleWrapper>} />
              <Route path="distribution" element={<RoleWrapper allowedRoles={['admin', 'distribution']}><DistributionConsole /></RoleWrapper>} />
              <Route path="delivery" element={<RoleWrapper allowedRoles={['admin', 'delivery']}><DeliveryConsole /></RoleWrapper>} />
              <Route path="portal" element={<RoleWrapper allowedRoles={['admin', 'delivery', 'client']}><ClientPortal /></RoleWrapper>} />
              <Route path="brain" element={<RoleWrapper allowedRoles={['admin', 'distribution', 'delivery']}><BrainConsole /></RoleWrapper>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
