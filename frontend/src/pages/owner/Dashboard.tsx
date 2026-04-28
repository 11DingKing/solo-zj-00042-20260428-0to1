import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Typography, Button } from 'antd'
import {
  FileTextOutlined,
  MoneyCollectOutlined,
  BellOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '@/utils/api'
import { useAuthStore } from '@/store/authStore'

const { Title, Text } = Typography

const OwnerDashboard: React.FC = () => {
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
      const response = await api.get('/dashboard/owner/')
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
      title: '状态',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (status: string) => {
        let color = 'default'
        if (status === '已完成') color = 'green'
        else if (status === '维修中') color = 'processing'
        else if (status === '待派单' || status === '已派单') color = 'orange'
        else if (status === '待确认') color = 'blue'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ]

  const recentBillsColumns = [
    {
      title: '账单号',
      dataIndex: 'bill_number',
      key: 'bill_number',
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <span style={{ fontWeight: 'bold' }}>¥{amount}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (status: string, record: any) => {
        if (record.is_overdue) {
          return <Tag color="red">已逾期</Tag>
        }
        let color = status === '已缴费' ? 'green' : 'orange'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
    },
  ]

  return (
    <div>
      <Title level={3}>欢迎回来，{user?.username}</Title>
      
      {dashboardData?.house_info ? (
        <Card 
          style={{ marginBottom: 24 }}
          size="small"
        >
          <Row align="middle">
            <Col>
              <HomeOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }} />
            </Col>
            <Col>
              <Text strong>我的房屋：</Text>
              <Text style={{ marginLeft: 8 }}>
                {dashboardData.house_info.building_number}栋
                {dashboardData.house_info.unit_number}单元
                {dashboardData.house_info.room_number}室
              </Text>
              <Text style={{ marginLeft: 16, color: '#666' }}>
                面积：{dashboardData.house_info.area}㎡
              </Text>
            </Col>
          </Row>
        </Card>
      ) : (
        <Card style={{ marginBottom: 24 }}>
          <Text type="warning">您还未绑定房屋信息，请联系物业管理员。</Text>
        </Card>
      )}
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/owner/tickets')}>
            <Statistic
              title="我的报修"
              value={dashboardData?.total_tickets || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/owner/tickets')}>
            <Statistic
              title="处理中"
              value={dashboardData?.pending_tickets || 0}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/owner/bills')}>
            <Statistic
              title="待缴费"
              value={dashboardData?.pending_bills || 0}
              prefix={<MoneyCollectOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable onClick={() => navigate('/owner/announcements')}>
            <Statistic
              title="未读公告"
              value={dashboardData?.unread_announcements || 0}
              prefix={<BellOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      {dashboardData?.pending_amount > 0 && (
        <Card 
          style={{ marginBottom: 24, border: '1px solid #ff4d4f' }}
          size="small"
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Text type="danger" strong>
                您有 {dashboardData.overdue_bills > 0 ? dashboardData.overdue_bills : dashboardData.pending_bills} 笔待缴费账单
                {dashboardData.overdue_bills > 0 && `，其中 ${dashboardData.overdue_bills} 笔已逾期`}
                ，总计 ¥{dashboardData.pending_amount + (dashboardData.overdue_amount || 0)} 元
              </Text>
            </Col>
            <Col>
              <Button type="primary" danger onClick={() => navigate('/owner/bills')}>
              立即缴费
            </Button>
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title="最近报修工单"
            extra={
              <Button type="link" onClick={() => navigate('/owner/tickets')}>
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
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="最近账单"
            extra={
              <Button type="link" onClick={() => navigate('/owner/bills')}>
                查看全部
              </Button>
            }
          >
            <Table
              columns={recentBillsColumns}
              dataSource={dashboardData?.recent_bills || []}
              rowKey="id"
              pagination={false}
              size="small"
              rowClassName={(record: any) => record.is_overdue ? 'overdue-bill' : ''}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default OwnerDashboard
