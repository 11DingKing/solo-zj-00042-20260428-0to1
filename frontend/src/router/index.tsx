import React, { lazy, Suspense } from 'react'
import { Navigate, useRoutes } from 'react-router-dom'
import { Spin } from 'antd'

const LoginPage = lazy(() => import('@/pages/Login'))
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const WorkerLayout = lazy(() => import('@/layouts/WorkerLayout'))
const OwnerLayout = lazy(() => import('@/layouts/OwnerLayout'))

const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const BuildingManagement = lazy(() => import('@/pages/admin/BuildingManagement'))
const HouseManagement = lazy(() => import('@/pages/admin/HouseManagement'))
const WorkerManagement = lazy(() => import('@/pages/admin/WorkerManagement'))
const TicketManagement = lazy(() => import('@/pages/admin/Tickets'))
const BillManagement = lazy(() => import('@/pages/admin/Bills'))
const AnnouncementManagement = lazy(() => import('@/pages/admin/Announcements'))

const WorkerDashboard = lazy(() => import('@/pages/worker/Dashboard'))
const WorkerTickets = lazy(() => import('@/pages/worker/Tickets'))

const OwnerDashboard = lazy(() => import('@/pages/owner/Dashboard'))
const OwnerTickets = lazy(() => import('@/pages/owner/Tickets'))
const OwnerBills = lazy(() => import('@/pages/owner/Bills'))
const OwnerProfile = lazy(() => import('@/pages/owner/Profile'))
const Announcements = lazy(() => import('@/pages/owner/Announcements'))

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

interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

const routes: RouteConfig[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'buildings',
        element: <BuildingManagement />,
      },
      {
        path: 'houses',
        element: <HouseManagement />,
      },
      {
        path: 'workers',
        element: <WorkerManagement />,
      },
      {
        path: 'tickets',
        element: <TicketManagement />,
      },
      {
        path: 'bills',
        element: <BillManagement />,
      },
      {
        path: 'announcements',
        element: <AnnouncementManagement />,
      },
    ],
  },
  {
    path: '/worker',
    element: <WorkerLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <WorkerDashboard />,
      },
      {
        path: 'tickets',
        element: <WorkerTickets />,
      },
    ],
  },
  {
    path: '/owner',
    element: <OwnerLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <OwnerDashboard />,
      },
      {
        path: 'tickets',
        element: <OwnerTickets />,
      },
      {
        path: 'bills',
        element: <OwnerBills />,
      },
      {
        path: 'announcements',
        element: <Announcements />,
      },
      {
        path: 'profile',
        element: <OwnerProfile />,
      },
    ],
  },
]

const renderRoutes = (routeList: RouteConfig[]): React.ReactNode => {
  return routeList.map((route) => {
    const { path, element, children } = route
    
    if (children) {
      return {
        path,
        element,
        children: renderRoutes(children),
      }
    }
    
    return {
      path,
      element,
    }
  })
}

const AppRoutes: React.FC = () => {
  const element = useRoutes(renderRoutes(routes) as any)
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      {element}
    </Suspense>
  )
}

export default AppRoutes
