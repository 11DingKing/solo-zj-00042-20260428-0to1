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
  message,
  Typography,
  Space,
  Divider,
  Timeline,
  Image,
  Descriptions,
  Badge,
} from 'antd'
import { EyeOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons'
import api, { extractListData } from '@/utils/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const STATUS_TAGS: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待派单' },
  assigned: { color: 'processing', text: '已派单' },
  in_progress: { color: 'blue', text: '维修中' },
  pending_confirm: { color: 'purple', text: '待确认' },
  completed: { color: 'green', text: '已完成' },
}

const AdminTickets: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<any>(null)
  const [recommendedWorkers, setRecommendedWorkers] = useState<any[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTickets()
    fetchWorkers()
  }, [])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const response = await api.get('/maintenance/tickets/')
      setTickets(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      message.error('获取工单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkers = async () => {
    try {
      const response = await api.get('/properties/workers/')
      setWorkers(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch workers:', error)
    }
  }

  const fetchRecommendedWorkers = async (ticketId: number) => {
    try {
      const response = await api.get(`/maintenance/tickets/${ticketId}/recommend_workers/`)
      setRecommendedWorkers(response.data.recommended_workers || [])
    } catch (error) {
      console.error('Failed to fetch recommended workers:', error)
      setRecommendedWorkers([])
    }
  }

  const handleViewDetail = (ticket: any) => {
    setCurrentTicket(ticket)
    setDetailModalVisible(true)
  }

  const handleAssign = (ticket: any) => {
    setCurrentTicket(ticket)
    fetchRecommendedWorkers(ticket.id)
    form.resetFields()
    setAssignModalVisible(true)
  }

  const handleSubmitAssign = async (values: any) => {
    try {
      await api.post(`/maintenance/tickets/${currentTicket.id}/assign/`, {
        worker_id: values.worker_id,
      })
      message.success('派单成功')
      setAssignModalVisible(false)
      fetchTickets()
    } catch (error: any) {
      console.error('Failed to assign ticket:', error)
      message.error(error.response?.data?.detail || '派单失败')
    }
  }

  const isRecommended = (workerId: number) => {
    return recommendedWorkers.some((w: any) => w.id === workerId)
  }

  const getWorkerLabel = (worker: any) => {
    const isRec = isRecommended(worker.id)
    const isIdle = worker.status === 'idle'
    let label = `${worker.name} - ${worker.skill_type_display}`
    if (isIdle) {
      label += ' (空闲)'
    } else {
      label += ' (忙碌)'
    }
    if (isRec) {
      label += ' ⭐推荐'
    }
    return label
  }

  const columns = [
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
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const tag = STATUS_TAGS[status] || { color: 'default', text: status }
        return <Tag color={tag.color}>{tag.text}</Tag>
      },
    },
    {
      title: '业主',
      dataIndex: 'owner_name',
      key: 'owner_name',
    },
    {
      title: '指派维修工',
      dataIndex: 'assigned_worker_name',
      key: 'assigned_worker_name',
      render: (name: string) => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
            <Button type="primary" size="small" icon={<UserOutlined />} onClick={() => handleAssign(record)}>
              派单
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title="报修工单管理">
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="派单"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
        width={600}
      >
        {currentTicket && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="工单号">{currentTicket.ticket_number}</Descriptions.Item>
                <Descriptions.Item label="报修类型">{currentTicket.repair_type_display}</Descriptions.Item>
                <Descriptions.Item label="紧急程度">
                  <Tag color={currentTicket.urgency === 'very_urgent' ? 'red' : currentTicket.urgency === 'urgent' ? 'orange' : 'default'}>
                    {currentTicket.urgency_display}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="业主">{currentTicket.owner_name}</Descriptions.Item>
              </Descriptions>
            </Card>

            {recommendedWorkers.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" strong>⭐ 推荐维修工（空闲且擅长对应类型）：</Text>
                <div style={{ marginTop: 8 }}>
                  {recommendedWorkers.map((worker: any) => (
                    <Tag key={worker.id} color="green" style={{ marginBottom: 4 }}>
                      {worker.name} - {worker.skill_type_display}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <Form form={form} layout="vertical" onFinish={handleSubmitAssign}>
              <Form.Item
                name="worker_id"
                label="选择维修工"
                rules={[{ required: true, message: '请选择维修工' }]}
              >
                <Select 
                  placeholder="请选择维修工"
                  optionLabelProp="label"
                >
                  {workers.map((worker) => (
                    <Select.Option 
                      key={worker.id} 
                      value={worker.id}
                      label={getWorkerLabel(worker)}
                      disabled={worker.status !== 'idle'}
                      style={isRecommended(worker.id) ? { backgroundColor: '#f6ffed' } : {}}
                    >
                      <div>
                        <span>{worker.name}</span>
                        <span style={{ marginLeft: 8 }}>{worker.skill_type_display}</span>
                        <Tag 
                          color={worker.status === 'idle' ? 'green' : 'orange'}
                          style={{ marginLeft: 8 }}
                        >
                          {worker.status === 'idle' ? '空闲' : '忙碌'}
                        </Tag>
                        {isRecommended(worker.id) && (
                          <Tag color="gold" style={{ marginLeft: 8 }}>⭐ 推荐</Tag>
                        )}
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button onClick={() => setAssignModalVisible(false)} style={{ marginRight: 8 }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  确认派单
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title="工单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={currentTicket?.status === 'pending' ? [
          <Button key="assign" type="primary" onClick={() => {
            setDetailModalVisible(false)
            handleAssign(currentTicket)
          }}>
            派单
          </Button>,
        ] : null}
        width={800}
      >
        {currentTicket && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="工单号">{currentTicket.ticket_number}</Descriptions.Item>
              <Descriptions.Item label="报修类型">{currentTicket.repair_type_display}</Descriptions.Item>
              <Descriptions.Item label="紧急程度">
                <Tag color={currentTicket.urgency === 'very_urgent' ? 'red' : currentTicket.urgency === 'urgent' ? 'orange' : 'default'}>
                  {currentTicket.urgency_display}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_TAGS[currentTicket.status]?.color}>
                  {STATUS_TAGS[currentTicket.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="业主">{currentTicket.owner_name}</Descriptions.Item>
              <Descriptions.Item label="业主电话">{currentTicket.owner_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="房屋地址">{currentTicket.house_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="指派维修工">{currentTicket.assigned_worker_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(currentTicket.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="期望上门时间">
                {currentTicket.expected_start_time ? (
                  `${dayjs(currentTicket.expected_start_time).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(currentTicket.expected_end_time).format('HH:mm')}`
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="详细描述" span={2}>
                {currentTicket.description}
              </Descriptions.Item>
            </Descriptions>

            {currentTicket.images && currentTicket.images.length > 0 && (
              <>
                <Divider>现场照片</Divider>
                <div>
                  <Image.PreviewGroup>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {currentTicket.images.map((img: any, idx: number) => (
                        <Image
                          key={idx}
                          width={100}
                          height={100}
                          style={{ objectFit: 'cover' }}
                          src={img.image}
                        />
                      ))}
                    </div>
                  </Image.PreviewGroup>
                </div>
              </>
            )}

            {currentTicket.record && (
              <>
                <Divider>维修记录</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="维修措施" span={2}>
                    {currentTicket.record.measures}
                  </Descriptions.Item>
                  <Descriptions.Item label="使用材料">
                    {currentTicket.record.materials_used || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="材料费用">
                    {currentTicket.record.material_cost ? `¥${currentTicket.record.material_cost}` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="耗时">
                    {currentTicket.record.time_spent_minutes ? `${currentTicket.record.time_spent_minutes} 分钟` : '-'}
                  </Descriptions.Item>
                </Descriptions>
                {currentTicket.record.after_images && currentTicket.record.after_images.length > 0 && (
                  <>
                    <Divider>维修后照片</Divider>
                    <div>
                      <Image.PreviewGroup>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {currentTicket.record.after_images.map((img: any, idx: number) => (
                            <Image
                              key={idx}
                              width={100}
                              height={100}
                              style={{ objectFit: 'cover' }}
                              src={img.image}
                            />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    </div>
                  </>
                )}
              </>
            )}

            {currentTicket.status_logs && currentTicket.status_logs.length > 0 && (
              <>
                <Divider>操作时间线</Divider>
                <Timeline>
                  {currentTicket.status_logs.map((log: any, idx: number) => (
                    <Timeline.Item key={idx}>
                      <p>
                        <Text strong>{STATUS_TAGS[log.status]?.text || log.status}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {dayjs(log.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </p>
                      <p>操作人：{log.operator_name}</p>
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

export default AdminTickets
