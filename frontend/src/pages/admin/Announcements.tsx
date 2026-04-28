import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Typography,
  Space,
  Divider,
  Descriptions,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import api from '@/utils/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const AdminAnnouncements: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentAnnouncement, setCurrentAnnouncement] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const response = await api.get('/announcements/')
      setAnnouncements(response.data)
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
      message.error('获取公告列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (announcement: any) => {
    setCurrentAnnouncement(announcement)
    setDetailModalVisible(true)
  }

  const handleCreate = () => {
    setEditMode(false)
    form.resetFields()
    form.setFieldsValue({ is_pinned: false })
    setCreateModalVisible(true)
  }

  const handleEdit = (announcement: any) => {
    setEditMode(true)
    setCurrentAnnouncement(announcement)
    form.setFieldsValue({
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned,
    })
    setCreateModalVisible(true)
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条公告吗？',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/announcements/${id}/`)
          message.success('删除成功')
          fetchAnnouncements()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editMode && currentAnnouncement) {
        await api.put(`/announcements/${currentAnnouncement.id}/`, values)
        message.success('更新成功')
      } else {
        await api.post('/announcements/', values)
        message.success('创建成功')
      }
      setCreateModalVisible(false)
      fetchAnnouncements()
    } catch (error: any) {
      console.error('Failed to save announcement:', error)
      message.error(error.response?.data?.detail || '保存失败')
    }
  }

  const renderContent = (content: string) => {
    return {
      __html: content
    }
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <Space>
          {record.is_pinned && <Tag color="red">置顶</Tag>}
          {title}
        </Space>
      ),
    },
    {
      title: '发布人',
      dataIndex: 'author_name',
      key: 'author_name',
      render: (name: string) => name || '系统',
    },
    {
      title: '阅读统计',
      key: 'read_stats',
      render: (_: any, record: any) => (
        <Text type="secondary">
          已读 {record.read_count || 0} / 未读 {record.unread_count || 0}
        </Text>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
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
        title="公告管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate()}>
            发布公告
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={announcements}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="发布公告"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入公告标题" maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              rows={10}
              placeholder="请输入公告内容（支持 HTML）"
            />
          </Form.Item>

          <Form.Item
            name="is_pinned"
            label="是否置顶"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              {editMode ? '更新' : '发布'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="公告详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {currentAnnouncement && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="标题" span={2}>
                <Space>
                  {currentAnnouncement.is_pinned && <Tag color="red">置顶</Tag>}
                  {currentAnnouncement.title}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="发布人">
                {currentAnnouncement.author_name || '系统'}
              </Descriptions.Item>
              <Descriptions.Item label="发布时间">
                {dayjs(currentAnnouncement.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="阅读统计">
                已读 {currentAnnouncement.read_count || 0} / 未读 {currentAnnouncement.unread_count || 0}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(currentAnnouncement.updated_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>公告内容</Divider>
            <div 
              dangerouslySetInnerHTML={renderContent(currentAnnouncement.content)}
              style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: 4,
                minHeight: 200,
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AdminAnnouncements
