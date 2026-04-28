import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  message,
  Typography,
  Space,
  Divider,
  Descriptions,
  Timeline,
} from 'antd'
import { EyeOutlined, PayCircleOutlined } from '@ant-design/icons'
import api, { extractListData } from '@/utils/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const BILL_STATUS_TAGS: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待缴费' },
  paid: { color: 'green', text: '已缴费' },
  overdue: { color: 'red', text: '已逾期' },
}

const OwnerBills: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [bills, setBills] = useState<any[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentBill, setCurrentBill] = useState<any>(null)

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    setLoading(true)
    try {
      const response = await api.get('/billing/bills/')
      setBills(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch bills:', error)
      message.error('获取账单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (bill: any) => {
    setCurrentBill(bill)
    setDetailModalVisible(true)
  }

  const handlePay = (bill: any) => {
    Modal.confirm({
      title: '确认缴费',
      content: (
        <div>
          <p>账单号：{bill.bill_number}</p>
          <p>标题：{bill.title}</p>
          <p>金额：<Text strong style={{ color: '#ff4d4f', fontSize: 18 }}>¥{bill.amount}</Text></p>
        </div>
      ),
      okText: '确认支付',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.post(`/billing/bills/${bill.id}/pay/`)
          message.success('缴费成功')
          fetchBills()
          setDetailModalVisible(false)
        } catch (error) {
          message.error('缴费失败')
        }
      },
    })
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
      title: '计费月份',
      dataIndex: 'billing_month',
      key: 'billing_month',
      render: (month: string) => month || '-',
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
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
          {record.status === 'pending' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<PayCircleOutlined />}
              onClick={() => handlePay(record)}
            >
              缴费
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title="我的账单">
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
        title="账单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={currentBill?.status === 'pending' ? [
          <Button key="pay" type="primary" onClick={() => handlePay(currentBill)}>
            立即缴费
          </Button>,
        ] : null}
        width={600}
      >
        {currentBill && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="账单号">{currentBill.bill_number}</Descriptions.Item>
              <Descriptions.Item label="标题">{currentBill.title}</Descriptions.Item>
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

export default OwnerBills
