import React from 'react'
import { Navigate, useRoutes, RouteObject } from 'react-router-dom'
import { Spin } from 'antd'

import ErrorBoundary from '@/components/ErrorBoundary'

import LoginPage from '@/pages/Login'
import AdminLayout from '@/layouts/AdminLayout'
import WorkerLayout from '@/layouts/WorkerLayout'
import OwnerLayout from '@/layouts/OwnerLayout'

import AdminDashboard from '@/pages/admin/Dashboard'
import BuildingManagement from '@/pages/admin/BuildingManagement'
import HouseManagement from '@/pages/admin/HouseManagement'
import WorkerManagement from '@/pages/admin/WorkerManagement'
import TicketManagement from '@/pages/admin/Tickets'
import BillManagement from '@/pages/admin/Bills'
import AnnouncementManagement from '@/pages/admin/Announcements'

import WorkerDashboard from '@/pages/worker/Dashboard'
import WorkerTickets from '@/pages/worker/Tickets'

import OwnerDashboard from '@/pages/owner/Dashboard'
import OwnerTickets from '@/pages/owner/Tickets'
import OwnerBills from '@/pages/owner/Bills'
import OwnerProfile from '@/pages/owner/Profile'
import OwnerAnnouncements from '@/pages/owner/Announcements'

const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <Spin size="large" />
  </div>
)

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
)

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <PageWrapper><LoginPage /></PageWrapper>,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/admin',
    element: <PageWrapper><AdminLayout /></PageWrapper>,
    children: [
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <PageWrapper><AdminDashboard /></PageWrapper>,
      },
      {
        path: 'buildings',
        element: <PageWrapper><BuildingManagement /></PageWrapper>,
      },
      {
        path: 'houses',
        element: <PageWrapper><HouseManagement /></PageWrapper>,
      },
      {
        path: 'workers',
        element: <PageWrapper><WorkerManagement /></PageWrapper>,
      },
      {
        path: 'tickets',
        element: <PageWrapper><TicketManagement /></PageWrapper>,
      },
      {
        path: 'bills',
        element: <PageWrapper><BillManagement /></PageWrapper>,
      },
      {
        path: 'announcements',
        element: <PageWrapper><AnnouncementManagement /></PageWrapper>,
      },
    ],
  },
  {
    path: '/worker',
    element: <PageWrapper><WorkerLayout /></PageWrapper>,
    children: [
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <PageWrapper><WorkerDashboard /></PageWrapper>,
      },
      {
        path: 'tickets',
        element: <PageWrapper><WorkerTickets /></PageWrapper>,
      },
    ],
  },
  {
    path: '/owner',
    element: <PageWrapper><OwnerLayout /></PageWrapper>,
    children: [
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <PageWrapper><OwnerDashboard /></PageWrapper>,
      },
      {
        path: 'tickets',
        element: <PageWrapper><OwnerTickets /></PageWrapper>,
      },
      {
        path: 'bills',
        element: <PageWrapper><OwnerBills /></PageWrapper>,
      },
      {
        path: 'announcements',
        element: <PageWrapper><OwnerAnnouncements /></PageWrapper>,
      },
      {
        path: 'profile',
        element: <PageWrapper><OwnerProfile /></PageWrapper>,
      },
    ],
  },
]

const AppRoutes: React.FC = () => {
  const element = useRoutes(routes)
  
  return (
    <React.Suspense fallback={<LoadingFallback />}>
      {element}
    </React.Suspense>
  )
}

export default AppRoutes
