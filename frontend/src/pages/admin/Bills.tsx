import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  message,
  Typography,
  Space,
  Divider,
  Descriptions,
  Timeline,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  MoneyCollectOutlined,
  FileTextOutlined,
  ReloadOutlined,
  PercentageOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '@/utils/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input
const { MonthPicker } = DatePicker

const BILL_STATUS_TAGS: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待缴费' },
  paid: { color: 'green', text: '已缴费' },
  overdue: { color: 'red', text: '已逾期' },
}

const BILL_TYPES = [
  { value: 'property_fee', label: '物业费' },
  { value: 'parking_fee', label: '停车费' },
  { value: 'decoration_deposit', label: '装修押金' },
  { value: 'other', label: '其他' },
]

const AdminBills: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [bills, setBills] = useState<any[]>([])
  const [houses, setHouses] = useState<any[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [batchGenerateModalVisible, setBatchGenerateModalVisible] = useState(false)
  const [currentBill, setCurrentBill] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [form] = Form.useForm()
  const [batchForm] = Form.useForm()

  useEffect(() => {
    fetchBills()
    fetchHouses()
    fetchBuildings()
    fetchStats()
  }, [])

  const fetchBills = async () => {
    setLoading(true)
    try {
      const response = await api.get('/billing/bills/')
      setBills(response.data)
    } catch (error) {
      console.error('Failed to fetch bills:', error)
      message.error('获取账单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchHouses = async () => {
    try {
      const response = await api.get('/properties/houses/')
      setHouses(response.data)
    } catch (error) {
      console.error('Failed to fetch houses:', error)
    }
  }

  const fetchBuildings = async () => {
    try {
      const response = await api.get('/properties/buildings/')
      setBuildings(response.data)
    } catch (error) {
      console.error('Failed to fetch buildings:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/billing/bills/statistics/')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleViewDetail = (bill: any) => {
    setCurrentBill(bill)
    setDetailModalVisible(true)
  }

  const handleCreate = () => {
    form.resetFields()
    setCreateModalVisible(true)
  }

  const handleBatchGenerate = () => {
    batchForm.resetFields()
    setBatchGenerateModalVisible(true)
  }

  const handleSubmitCreate = async (values: any) => {
    try {
      const data = {
        ...values,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        billing_month: values.billing_month ? values.billing_month.format('YYYY-MM') : null,
      }
      await api.post('/billing/bills/', data)
      message.success('账单创建成功')
      setCreateModalVisible(false)
      fetchBills()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to create bill:', error)
      message.error(error.response?.data?.detail || '创建失败')
    }
  }

  const handleSubmitBatchGenerate = async (values: any) => {
    try {
      const data = {
        billing_month: values.billing_month.format('YYYY-MM'),
        unit_price: values.unit_price,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      }
      await api.post('/billing/bills/batch_generate/', data)
      message.success('批量生成账单成功')
      setBatchGenerateModalVisible(false)
      fetchBills()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to batch generate bills:', error)
      message.error(error.response?.data?.detail || '批量生成失败')
    }
  }

  const columns = [
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
      title: '房屋',
      dataIndex: 'house_address',
      key: 'house_address',
      render: (addr: string) => addr || '-',
    },
    {
      title: '业主',
      dataIndex: 'owner_name',
      key: 'owner_name',
      render: (name: string) => name || '-',
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
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <div>
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="缴费率"
                value={stats.payment_rate || 0}
                suffix="%"
                prefix={<PercentageOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="待缴费"
                value={stats.pending_amount || 0}
                prefix={<MoneyCollectOutlined style={{ color: '#faad14' }} />}
                suffix="元"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="已逾期"
                value={stats.overdue_amount || 0}
                prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                suffix="元"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="总账单数"
                value={bills.length}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {stats?.building_stats && stats.building_stats.length > 0 && (
        <Card title="各楼栋缴费率对比" style={{ marginBottom: 24 }}>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.building_stats}>
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
      )}

      <Card
        title="账单管理"
        extra={
          <Space>
            <Button 
              type="primary" 
              ghost 
              icon={<ReloadOutlined />} 
              onClick={() => handleBatchGenerate()}
            >
              批量生成物业费
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => handleCreate()}
            >
              创建账单
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={bills}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowClassName={(record: any) => record.is_overdue && record.status === 'pending' ? 'overdue-bill' : ''}
        />
      </Card>

      <Modal
        title="创建账单"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitCreate}>
          <Form.Item
            name="house"
            label="选择房屋"
            rules={[{ required: true, message: '请选择房屋' }]}
          >
            <Select placeholder="请选择房屋">
              {houses.map((house: any) => (
                <Select.Option key={house.id} value={house.id}>
                  {house.building_number}栋{house.unit_number}单元{house.room_number}室
                  {house.owner_name ? ` (${house.owner_name})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="bill_type"
            label="账单类型"
            rules={[{ required: true, message: '请选择账单类型' }]}
          >
            <Select placeholder="请选择账单类型" options={BILL_TYPES} />
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="金额（元）"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="请输入金额" />
          </Form.Item>

          <Form.Item
            name="billing_month"
            label="计费月份"
          >
            <MonthPicker placeholder="请选择计费月份" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="截止日期"
          >
            <DatePicker placeholder="请选择截止日期" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="请输入描述（可选）" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量生成物业费账单"
        open={batchGenerateModalVisible}
        onCancel={() => setBatchGenerateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={batchForm} layout="vertical" onFinish={handleSubmitBatchGenerate}>
          <Form.Item
            name="billing_month"
            label="计费月份"
            rules={[{ required: true, message: '请选择计费月份' }]}
          >
            <MonthPicker placeholder="请选择计费月份" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="unit_price"
            label="物业费单价（元/㎡/月）"
            rules={[{ required: true, message: '请输入单价' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="例如：2.5" />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="截止日期"
          >
            <DatePicker placeholder="请选择截止日期" style={{ width: '100%' }} />
          </Form.Item>

          <Text type="secondary">
            系统将根据所有房屋的面积 × 单价自动计算物业费并生成账单。
          </Text>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setBatchGenerateModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              批量生成
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="账单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {currentBill && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="账单号">{currentBill.bill_number}</Descriptions.Item>
              <Descriptions.Item label="标题">{currentBill.title}</Descriptions.Item>
              <Descriptions.Item label="房屋">{currentBill.house_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="业主">{currentBill.owner_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color="blue">{currentBill.bill_type_display}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="金额">
                <Text strong style={{ color: '#ff4d4f', fontSize: 18 }}>¥{currentBill.amount}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  let tag = BILL_STATUS_TAGS[currentBill.status]
                  if (currentBill.is_overdue && currentBill.status === 'pending') {
                    tag = BILL_STATUS_TAGS.overdue
                  }
                  return <Tag color={tag.color}>{tag.text}</Tag>
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="计费月份">{currentBill.billing_month || '-'}</Descriptions.Item>
              <Descriptions.Item label="截止日期">
                <Text type={currentBill.is_overdue ? 'danger' : 'secondary'}>
                  {currentBill.due_date ? dayjs(currentBill.due_date).format('YYYY-MM-DD') : '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="生成时间">
                {dayjs(currentBill.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {currentBill.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            {currentBill.payment_record && (
              <>
                <Divider>支付记录</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="支付时间">
                    {dayjs(currentBill.payment_record.paid_at).format('YYYY-MM-DD HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="支付金额">
                    <Text strong style={{ color: '#52c41a' }}>¥{currentBill.payment_record.amount}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {currentBill.status_logs && currentBill.status_logs.length > 0 && (
              <>
                <Divider>状态变更记录</Divider>
                <Timeline size="small">
                  {currentBill.status_logs.map((log: any, idx: number) => (
                    <Timeline.Item key={idx}>
                      <p>
                        <Text strong>{BILL_STATUS_TAGS[log.status]?.text || log.status}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </p>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AdminBills
