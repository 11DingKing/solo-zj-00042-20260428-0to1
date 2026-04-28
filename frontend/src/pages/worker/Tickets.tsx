import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Upload,
  message,
  Typography,
  Space,
  Divider,
  Timeline,
  Image,
  Descriptions,
  Rate,
} from 'antd'
import { PlusOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import api from '@/utils/api'
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

const WorkerTickets: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [completeModalVisible, setCompleteModalVisible] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<any>(null)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const response = await api.get('/maintenance/tickets/')
      setTickets(response.data)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      message.error('获取工单列表失败')
    } finally {
      setLoading(false)
    }
  }

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: async (file) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
      if (!isJpgOrPng) {
        message.error('只能上传 JPG/PNG 格式的图片')
        return false
      }
      const isLt2M = file.size / 1024 / 1024 < 5
      if (!isLt2M) {
        message.error('图片大小不能超过 5MB')
        return false
      }
      if (fileList.length >= 5) {
        message.error('最多只能上传 5 张图片')
        return false
      }
      return false
    },
    onChange: (info) => {
      let newFileList = [...info.fileList]
      newFileList = newFileList.slice(-5)
      newFileList = newFileList.map((file) => {
        if (file.response) {
          file.url = file.response.url
        }
        return file
      })
      setFileList(newFileList)
    },
    onPreview: async (file) => {
      if (!file.url && !file.preview) {
        file.preview = await getBase64(file.originFileObj as File)
      }
    },
  }

  const handleViewDetail = (ticket: any) => {
    setCurrentTicket(ticket)
    setDetailModalVisible(true)
  }

  const handleAccept = async (ticketId: number) => {
    Modal.confirm({
      title: '确认接单',
      content: '确认接受该工单吗？',
      onOk: async () => {
        try {
          await api.post(`/maintenance/tickets/${ticketId}/accept/`)
          message.success('接单成功')
          fetchTickets()
          setDetailModalVisible(false)
        } catch (error) {
          message.error('接单失败')
        }
      },
    })
  }

  const handleComplete = (ticket: any) => {
    setCurrentTicket(ticket)
    form.resetFields()
    setFileList([])
    setCompleteModalVisible(true)
  }

  const handleSubmitComplete = async (values: any) => {
    const formData = new FormData()
    
    formData.append('measures', values.measures)
    if (values.materials_used) {
      formData.append('materials_used', values.materials_used)
    }
    if (values.material_cost) {
      formData.append('material_cost', values.material_cost.toString())
    }
    if (values.time_spent_minutes) {
      formData.append('time_spent_minutes', values.time_spent_minutes.toString())
    }

    fileList.forEach((file, index) => {
      if (file.originFileObj) {
        formData.append(`after_images[${index}]`, file.originFileObj)
      }
    })

    try {
      await api.post(`/maintenance/tickets/${currentTicket.id}/complete/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      message.success('维修记录提交成功')
      setCompleteModalVisible(false)
      fetchTickets()
    } catch (error: any) {
      console.error('Failed to complete ticket:', error)
      message.error(error.response?.data?.detail || '提交失败')
    }
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
      title: '房屋地址',
      dataIndex: 'house_address',
      key: 'house_address',
      render: (addr: string) => addr || '-',
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
          {record.status === 'assigned' && (
            <Button type="primary" size="small" onClick={() => handleAccept(record.id)}>
              接单
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button type="primary" size="small" onClick={() => handleComplete(record)}>
              完成维修
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title="我的工单">
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="工单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={currentTicket?.status === 'assigned' ? [
          <Button key="accept" type="primary" onClick={() => handleAccept(currentTicket.id)}>
            接单
          </Button>,
        ] : currentTicket?.status === 'in_progress' ? [
          <Button key="complete" type="primary" onClick={() => handleComplete(currentTicket)}>
            完成维修
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
              <Descriptions.Item label="评分">
                {currentTicket.rating ? (
                  <Rate disabled value={currentTicket.rating} allowHalf />
                ) : (
                  '-'
                )}
              </Descriptions.Item>
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

      <Modal
        title="提交维修记录"
        open={completeModalVisible}
        onCancel={() => setCompleteModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitComplete}>
          <Form.Item
            name="measures"
            label="维修措施"
            rules={[{ required: true, message: '请填写维修措施' }]}
          >
            <TextArea rows={4} placeholder="请详细描述维修措施" maxLength={500} showCount />
          </Form.Item>

          <Form.Item name="materials_used" label="使用材料">
            <TextArea rows={2} placeholder="请填写使用的材料（可选）" />
          </Form.Item>

          <Form.Item name="material_cost" label="材料费用（元）">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="请输入材料费用" />
          </Form.Item>

          <Form.Item name="time_spent_minutes" label="耗时（分钟）">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入维修耗时" />
          </Form.Item>

          <Form.Item label="维修后照片">
            <Upload
              {...uploadProps}
              listType="picture-card"
            >
              {fileList.length >= 5 ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
            <Text type="secondary">最多上传 5 张维修后照片</Text>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setCompleteModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              提交
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WorkerTickets
