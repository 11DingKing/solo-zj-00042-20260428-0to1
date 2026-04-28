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
  message,
  Typography,
  Space,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import api from '@/utils/api'

const { Text } = Typography

const BuildingManagement: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [buildings, setBuildings] = useState<any[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentBuilding, setCurrentBuilding] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchBuildings()
  }, [])

  const fetchBuildings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/properties/buildings/')
      setBuildings(response.data)
    } catch (error) {
      console.error('Failed to fetch buildings:', error)
      message.error('获取楼栋列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditMode(false)
    setCurrentBuilding(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (building: any) => {
    setEditMode(true)
    setCurrentBuilding(building)
    form.setFieldsValue({
      building_number: building.building_number,
      unit_count: building.unit_count,
      floor_count: building.floor_count,
      description: building.description || '',
    })
    setModalVisible(true)
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这栋楼吗？该操作不可恢复。',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/properties/buildings/${id}/`)
          message.success('删除成功')
          fetchBuildings()
        } catch (error: any) {
          console.error('Failed to delete building:', error)
          message.error(error.response?.data?.detail || '删除失败')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editMode && currentBuilding) {
        await api.put(`/properties/buildings/${currentBuilding.id}/`, values)
        message.success('更新成功')
      } else {
        await api.post('/properties/buildings/', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchBuildings()
    } catch (error: any) {
      console.error('Failed to save building:', error)
      message.error(error.response?.data?.detail || '保存失败')
    }
  }

  const columns = [
    {
      title: '楼栋号',
      dataIndex: 'building_number',
      key: 'building_number',
      render: (number: string) => (
        <Text strong>{number}栋</Text>
      ),
    },
    {
      title: '单元数',
      dataIndex: 'unit_count',
      key: 'unit_count',
      render: (count: number) => <Tag color="blue">{count} 单元</Tag>,
    },
    {
      title: '楼层数',
      dataIndex: 'floor_count',
      key: 'floor_count',
      render: (count: number) => <Tag color="green">{count} 层</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: '房屋数量',
      dataIndex: 'house_count',
      key: 'house_count',
      render: (count: number) => count || 0,
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
        title="楼栋管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate()}>
            添加楼栋
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={buildings}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editMode ? '编辑楼栋' : '添加楼栋'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="building_number"
            label="楼栋号"
            rules={[{ required: true, message: '请输入楼栋号' }]}
          >
            <Input placeholder="例如：1、2、3 或 A、B" />
          </Form.Item>

          <Form.Item
            name="unit_count"
            label="单元数"
            rules={[{ required: true, message: '请输入单元数' }]}
          >
            <InputNumber min={1} placeholder="例如：2" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="floor_count"
            label="楼层数"
            rules={[{ required: true, message: '请输入楼层数' }]}
          >
            <InputNumber min={1} placeholder="例如：6" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="描述信息（可选）" />
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

export default BuildingManagement
