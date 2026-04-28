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
  Rate,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import api, { extractListData } from '@/utils/api'

const { Text } = Typography

const SKILL_TYPES = [
  { value: 'plumbing_electric', label: '水电' },
  { value: 'construction', label: '土建' },
  { value: 'door_window', label: '门窗' },
  { value: 'elevator', label: '电梯' },
  { value: 'network', label: '网络' },
  { value: 'general', label: '综合' },
]

const STATUS_TAGS: Record<string, { color: string; text: string }> = {
  idle: { color: 'green', text: '空闲' },
  busy: { color: 'orange', text: '忙碌' },
}

const WorkerManagement: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [workers, setWorkers] = useState<any[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentWorker, setCurrentWorker] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/properties/workers/')
      setWorkers(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch workers:', error)
      message.error('获取维修工列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditMode(false)
    setCurrentWorker(null)
    form.resetFields()
    form.setFieldsValue({ status: 'idle' })
    setModalVisible(true)
  }

  const handleEdit = (worker: any) => {
    setEditMode(true)
    setCurrentWorker(worker)
    form.setFieldsValue({
      name: worker.name,
      phone: worker.phone || '',
      skill_type: worker.skill_type,
      status: worker.status,
    })
    setModalVisible(true)
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个维修工吗？',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/properties/workers/${id}/`)
          message.success('删除成功')
          fetchWorkers()
        } catch (error: any) {
          console.error('Failed to delete worker:', error)
          message.error(error.response?.data?.detail || '删除失败')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editMode && currentWorker) {
        await api.put(`/properties/workers/${currentWorker.id}/`, values)
        message.success('更新成功')
      } else {
        await api.post('/properties/workers/', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchWorkers()
    } catch (error: any) {
      console.error('Failed to save worker:', error)
      message.error(error.response?.data?.detail || '保存失败')
    }
  }

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: '技能类型',
      dataIndex: 'skill_type_display',
      key: 'skill_type_display',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
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
      title: '平均评分',
      dataIndex: 'avg_rating',
      key: 'avg_rating',
      render: (rating: number) => rating ? (
        <Space>
          <Rate disabled value={rating} allowHalf />
          <Text>{rating}</Text>
        </Space>
      ) : <Text type="secondary">暂无</Text>,
    },
    {
      title: '工单数量',
      dataIndex: 'ticket_count',
      key: 'ticket_count',
      render: (count: number) => count || 0,
    },
    {
      title: '已完成',
      dataIndex: 'completed_count',
      key: 'completed_count',
      render: (count: number) => (
        <Tag color="green">{count || 0}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="维修工管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate()}>
            添加维修工
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={workers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editMode ? '编辑维修工' : '添加维修工'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            name="skill_type"
            label="技能类型"
            rules={[{ required: true, message: '请选择技能类型' }]}
          >
            <Select placeholder="请选择技能类型" options={SKILL_TYPES} />
          </Form.Item>

          <Form.Item
            name="status"
            label="当前状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="idle">空闲</Select.Option>
              <Select.Option value="busy">忙碌</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              {editMode ? '保存' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WorkerManagement
