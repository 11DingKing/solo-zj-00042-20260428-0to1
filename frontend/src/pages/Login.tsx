import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Tabs, Typography } from 'antd'
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const { Title } = Typography

interface LoginFormData {
  username: string
  password: string
}

interface RegisterFormData {
  username: string
  email: string
  phone: string
  password: string
  password2: string
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('login')

  const loginForm = Form.useForm<LoginFormData>()
  const registerForm = Form.useForm<RegisterFormData>()

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true)
    try {
      const response = await api.post('/accounts/login/', values)
      const { user, tokens } = response.data
      
      setAuth({
        user,
        access: tokens.access,
        refresh: tokens.refresh,
      })
      
      message.success('登录成功')
      
      if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else if (user.role === 'maintenance') {
        navigate('/worker/dashboard')
      } else {
        navigate('/owner/dashboard')
      }
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true)
    try {
      const response = await api.post('/accounts/register/', values)
      const { user, tokens } = response.data
      
      setAuth({
        user,
        access: tokens.access,
        refresh: tokens.refresh,
      })
      
      message.success('注册成功')
      navigate('/owner/dashboard')
    } catch (error) {
      console.error('Register failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const loginItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form
          form={loginForm[0]}
          layout="vertical"
          onFinish={handleLogin}
          initialValues={{ username: '', password: '' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              style={{ width: '100%' }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'register',
      label: '业主注册',
      children: (
        <Form
          form={registerForm[0]}
          layout="vertical"
          onFinish={handleRegister}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="邮箱" 
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input 
              prefix={<PhoneOutlined />} 
              placeholder="手机号" 
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password2"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次密码输入不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              style={{ width: '100%' }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ]

  return (
    <div className="login-page">
      <Card className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0 }}>
            小区物业报修与缴费管理平台
          </Title>
        </div>
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={loginItems}
          centered
        />
      </Card>
    </div>
  )
}

export default LoginPage
