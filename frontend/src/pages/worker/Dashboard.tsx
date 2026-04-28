import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Typography, Button, Rate } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const { Title } = Typography

const WorkerDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await api.get('/dashboard/worker/')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const recentTicketsColumns = [
    {
      title: '工单号',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
    },
    {
      title: '报修类型',
      dataIndex: 'repair_type_display',
      key: 'repair_type_display',
    },
    {
      title: '紧急程度',
      dataIndex: 'urgency_display',
      key: 'urgency_display',
      render: (urgency: string) => {
        let color = 'default'
        if (urgency === '非常紧急') color = 'red'
        else if (urgency === '紧急') color = 'orange'
        return <Tag color={color}>{urgency}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (status: string) => {
        let color = 'default'
        if (status === '已完成') color = 'green'
        else if (status === '维修中') color = 'processing'
        else if (status === '已派单') color = 'orange'
        else if (status === '待确认') color = 'blue'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '业主',
      dataIndex: 'owner_name',
      key: 'owner_name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ]

  return (
    <div>
      <Title level={3}>欢迎回来，{user?.username}</Title>
      
      {dashboardData && (
        <Card style={{ marginBottom: 24 }} size="small">
          <Row align="middle" gutter={24}>
            <Col>
              <Tag color={dashboardData.status === 'idle' ? 'green' : 'orange'}>
                {dashboardData.status_display}
              </Tag>
            </Col>
            <Col>
              <span>技能类型：</span>
              <Tag color="blue">{dashboardData.skill_type_display}</Tag>
            </Col>
            {dashboardData.avg_rating > 0 && (
              <Col>
                <span>平均评分：</span>
                <Rate disabled value={dashboardData.avg_rating} allowHalf />
                <span style={{ marginLeft: 4 }}>{dashboardData.avg_rating}</span>
              </Col>
            )}
          </Row>
        </Card>
      )}
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/worker/tickets')}>
            <Statistic
              title="总工单"
              value={dashboardData?.total_tickets || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/worker/tickets')}>
            <Statistic
              title="待处理"
              value={dashboardData?.pending_tickets || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/worker/tickets')}>
            <Statistic
              title="已完成"
              value={dashboardData?.completed_tickets || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={dashboardData?.avg_rating || 0}
              prefix={<StarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="最近工单"
        extra={
          <Button type="link" onClick={() => navigate('/worker/tickets')}>
            查看全部
          </Button>
        }
      >
        <Table
          columns={recentTicketsColumns}
          dataSource={dashboardData?.recent_tickets || []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

export default WorkerDashboard
