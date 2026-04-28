import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  message,
  Typography,
  Space,
  Divider,
  Descriptions,
  Timeline,
  Rate,
} from 'antd'
import {
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  PayCircleOutlined,
  HistoryOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import api, { extractListData } from '@/utils/api'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/authStore'

const { Title, Text } = Typography

const OwnerProfile: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [houseInfo, setHouseInfo] = useState<any>(null)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchHouseInfo()
    fetchPaymentHistory()
  }, [])

  const fetchHouseInfo = async () => {
    setLoading(true)
    try {
      const [ticketsRes, billsRes] = await Promise.all([
        api.get('/maintenance/tickets/'),
        api.get('/billing/bills/'),
      ])
      setTickets(extractListData(ticketsRes.data))
      setBills(extractListData(billsRes.data))

      const dashboardRes = await api.get('/dashboard/owner/')
      setHouseInfo(dashboardRes.data.house_info)
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
      message.error('获取信息失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentHistory = async () => {
    try {
      const response = await api.get('/billing/bills/payment_history/')
      setPaymentHistory(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch payment history:', error)
    }
  }

  const handleEdit = () => {
    form.setFieldsValue({
      username: user?.username,
      phone: user?.phone || '',
    })
    setEditModalVisible(true)
  }

  const handleSubmitEdit = async (values: any) => {
    try {
      await api.put(`/accounts/users/${user?.id}/`, values)
      message.success('更新成功')
      setEditModalVisible(false)
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      message.error(error.response?.data?.detail || '更新失败')
    }
  }

  const ticketColumns = [
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
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const STATUS_TAGS: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待派单' },
          assigned: { color: 'processing', text: '已派单' },
          in_progress: { color: 'blue', text: '维修中' },
          pending_confirm: { color: 'purple', text: '待确认' },
          completed: { color: 'green', text: '已完成' },
        }
        const tag = STATUS_TAGS[status] || { color: 'default', text: status }
        return <Tag color={tag.color}>{tag.text}</Tag>
      },
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => rating ? <Rate disabled value={rating} allowHalf /> : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  const billColumns = [
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
      title: '类型',
      dataIndex: 'bill_type_display',
      key: 'bill_type_display',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>¥{amount}</span>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: any) => {
        const BILL_STATUS_TAGS: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待缴费' },
          paid: { color: 'green', text: '已缴费' },
          overdue: { color: 'red', text: '已逾期' },
        }
        let tag = BILL_STATUS_TAGS[record.status]
        if (record.is_overdue && record.status === 'pending') {
          tag = BILL_STATUS_TAGS.overdue
        }
        return <Tag color={tag.color}>{tag.text}</Tag>
      },
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string, record: any) => (
        <Text type={record.is_overdue ? 'danger' : 'secondary'}>
          {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
        </Text>
      ),
    },
  ]

  const paymentColumns = [
    {
      title: '账单号',
      dataIndex: 'bill_title',
      key: 'bill_title',
      render: (title: string) => title || '-',
    },
    {
      title: '支付金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>¥{amount}</span>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <div>
      <Card
        title="个人中心"
        extra={
          <Button type="primary" onClick={handleEdit}>
            编辑资料
          </Button>
        }
      >
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label={<><UserOutlined /> 用户名</Descriptions.Item>
          <Descriptions.Item label={<><PhoneOutlined /> 手机号</Descriptions.Item>
          <Descriptions.Item label={<><IdcardOutlined /> 角色</Descriptions.Item>
          <Descriptions.Item label={<><HomeOutlined /> 房屋</Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      <Card title="我的房屋" style={{ marginBottom: 16 }}>
        {houseInfo ? (
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="楼栋号">{houseInfo.building_number}栋</Descriptions.Item>
            <Descriptions.Item label="单元号">{houseInfo.unit_number}单元</Descriptions.Item>
            <Descriptions.Item label="房号">{houseInfo.room_number}室</Descriptions.Item>
            <Descriptions.Item label="房屋面积" span={2}>
              {houseInfo.area} 平方米
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="warning">您还未绑定房屋信息，请联系物业管理员。</Text>
        )}
      </Card>

      <Card title="我的报修工单" style={{ marginBottom: 16 }}>
        <Table
          columns={ticketColumns}
          dataSource={tickets}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>

      <Card title="我的账单" style={{ marginBottom: 16 }}>
        <Table
          columns={billColumns}
          dataSource={bills}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>

      <Card title="缴费记录">
        <Table
          columns={paymentColumns}
          dataSource={paymentHistory}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>

      <Modal
        title="编辑个人资料"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitEdit}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OwnerProfile
