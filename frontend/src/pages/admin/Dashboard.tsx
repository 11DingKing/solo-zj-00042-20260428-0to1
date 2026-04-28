import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts'
import api from '@/utils/api'
import dayjs from 'dayjs'

const { Title } = Typography

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [billingStats, setBillingStats] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchBillingStats()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await api.get('/dashboard/admin/')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBillingStats = async () => {
    try {
      const response = await api.get('/billing/bills/statistics/')
      setBillingStats(response.data)
    } catch (error) {
      console.error('Failed to fetch billing stats:', error)
    }
  }

  const arrearsColumns = [
    {
      title: '房号',
      dataIndex: 'house_address',
      key: 'house_address',
    },
    {
      title: '业主',
      dataIndex: 'owner_name',
      key: 'owner_name',
    },
    {
      title: '欠费金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{amount}</span>,
    },
    {
      title: '计费月份',
      dataIndex: 'billing_month',
      key: 'billing_month',
    },
    {
      title: '状态',
      key: 'status',
      render: () => <Tag color="red">已逾期</Tag>,
    },
  ]

  const workerColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '技能类型',
      dataIndex: 'skill_type_display',
      key: 'skill_type_display',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'idle' ? 'green' : 'orange'}>
          {status === 'idle' ? '空闲' : '忙碌'}
        </Tag>
      ),
    },
    {
      title: '工单数量',
      dataIndex: 'ticket_count',
      key: 'ticket_count',
    },
    {
      title: '已完成',
      dataIndex: 'completed_count',
      key: 'completed_count',
    },
  ]

  return (
    <div>
      <Title level={3}>仪表盘</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日新增工单"
              value={dashboardData?.today_new_tickets || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待处理工单"
              value={dashboardData?.pending_tickets || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="本月缴费率"
              value={dashboardData?.current_month_payment_rate || billingStats?.payment_rate || 0}
              suffix="%"
              prefix={<PercentageOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="欠费总额"
              value={billingStats?.overdue_amount || 0}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              suffix="元"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="报修类型分布" loading={loading}>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData?.ticket_type_stats || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count, percent }) => `${name}: ${count} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {dashboardData?.ticket_type_stats?.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="近12个月物业费收缴趋势" loading={loading}>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData?.monthly_trend || billingStats?.monthly_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `¥${value}`} />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="应收金额" stroke="#1890ff" strokeWidth={2} />
                  <Line type="monotone" dataKey="paid" name="实收金额" stroke="#52c41a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {billingStats?.building_stats && billingStats.building_stats.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card title="各楼栋缴费率对比">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={billingStats.building_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="building_number" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="payment_rate" name="缴费率" fill="#1890ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="维修工工作量排行">
            <Table
              columns={workerColumns}
              dataSource={dashboardData?.worker_ranking || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="欠费业主列表">
            <Table
              columns={arrearsColumns}
              dataSource={dashboardData?.arrears_list || []}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AdminDashboard
