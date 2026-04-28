import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Badge, Button, theme } from 'antd'
import {
  DashboardOutlined,
  BankOutlined,
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined,
  MoneyCollectOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/utils/api'

const { Header, Sider, Content } = Layout

const AdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  useEffect(() => {
    fetchUnreadCount()
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/announcements/announcements/unread-count/')
      setUnreadCount(response.data.unread_count)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/admin/buildings',
      icon: <BankOutlined />,
      label: '楼栋管理',
    },
    {
      key: '/admin/houses',
      icon: <HomeOutlined />,
      label: '房屋管理',
    },
    {
      key: '/admin/workers',
      icon: <TeamOutlined />,
      label: '维修工管理',
    },
    {
      key: '/admin/tickets',
      icon: <FileTextOutlined />,
      label: '报修工单',
    },
    {
      key: '/admin/bills',
      icon: <MoneyCollectOutlined />,
      label: '缴费管理',
    },
    {
      key: '/admin/announcements',
      icon: unreadCount > 0 ? (
        <Badge count={unreadCount} size="small">
          <BellOutlined />
        </Badge>
      ) : (
        <BellOutlined />
      ),
      label: '公告管理',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.username} (${user?.role_display})`,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else {
      navigate(key)
    }
  }

  const getSelectedKey = () => {
    const path = location.pathname
    if (path.startsWith('/admin/dashboard')) return '/admin/dashboard'
    if (path.startsWith('/admin/buildings')) return '/admin/buildings'
    if (path.startsWith('/admin/houses')) return '/admin/houses'
    if (path.startsWith('/admin/workers')) return '/admin/workers'
    if (path.startsWith('/admin/tickets')) return '/admin/tickets'
    if (path.startsWith('/admin/bills')) return '/admin/bills'
    if (path.startsWith('/admin/announcements')) return '/admin/announcements'
    return '/admin/dashboard'
  }

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 64,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 12 : 16,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? '物业' : '物业报修管理系统'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleMenuClick }}
            placement="bottomRight"
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        
        <Content
          style={{
            margin: 24,
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout
