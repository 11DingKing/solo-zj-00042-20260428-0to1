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
  message,
  Typography,
  Space,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DisconnectOutlined,
} from '@ant-design/icons'
import api, { extractListData } from '@/utils/api'

const { Text } = Typography

const HouseManagement: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [houses, setHouses] = useState<any[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [owners, setOwners] = useState<any[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentHouse, setCurrentHouse] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchHouses()
    fetchBuildings()
    fetchOwners()
  }, [])

  const fetchHouses = async () => {
    setLoading(true)
    try {
      const response = await api.get('/properties/houses/')
      setHouses(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch houses:', error)
      message.error('获取房屋列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchBuildings = async () => {
    try {
      const response = await api.get('/properties/buildings/')
      setBuildings(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch buildings:', error)
    }
  }

  const fetchOwners = async () => {
    try {
      const response = await api.get('/accounts/users/?role=owner')
      setOwners(extractListData(response.data))
    } catch (error) {
      console.error('Failed to fetch owners:', error)
    }
  }

  const handleCreate = () => {
    setEditMode(false)
    setCurrentHouse(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (house: any) => {
    setEditMode(true)
    setCurrentHouse(house)
    form.setFieldsValue({
      building: house.building,
      unit_number: house.unit_number,
      room_number: house.room_number,
      floor: house.floor,
      area: house.area,
      owner: house.owner || null,
    })
    setModalVisible(true)
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个房屋吗？',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/properties/houses/${id}/`)
          message.success('删除成功')
          fetchHouses()
        } catch (error: any) {
          console.error('Failed to delete house:', error)
          message.error(error.response?.data?.detail || '删除失败')
        }
      },
    })
  }

  const handleUnbind = (id: number) => {
    Modal.confirm({
      title: '确认解绑',
      content: '确定要解除该房屋与业主的绑定吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.post(`/properties/houses/${id}/unbind_owner/`)
          message.success('解绑成功')
          fetchHouses()
        } catch (error: any) {
          console.error('Failed to unbind owner:', error)
          message.error(error.response?.data?.detail || '解绑失败')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editMode && currentHouse) {
        await api.put(`/properties/houses/${currentHouse.id}/`, values)
        message.success('更新成功')
      } else {
        await api.post('/properties/houses/', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchHouses()
    } catch (error: any) {
      console.error('Failed to save house:', error)
      message.error(error.response?.data?.detail || '保存失败')
    }
  }

  const columns = [
    {
      title: '房屋地址',
      key: 'address',
      render: (_: any, record: any) => (
        <Text strong>
          {record.building_number}栋{record.unit_number}单元{record.room_number}室
        </Text>
      ),
    },
    {
      title: '楼栋',
      dataIndex: 'building_number',
      key: 'building_number',
      render: (num: string) => <Tag color="blue">{num}栋</Tag>,
    },
    {
      title: '单元',
      dataIndex: 'unit_number',
      key: 'unit_number',
      render: (num: string) => `${num}单元`,
    },
    {
      title: '房号',
      dataIndex: 'room_number',
      key: 'room_number',
    },
    {
      title: '楼层',
      dataIndex: 'floor',
      key: 'floor',
      render: (num: number) => num ? `${num}层` : '-',
    },
    {
      title: '面积',
      dataIndex: 'area',
      key: 'area',
      render: (area: number) => (
        <Tag color="green">{area} ㎡</Tag>
      ),
    },
    {
      title: '业主',
      dataIndex: 'owner_name',
      key: 'owner_name',
      render: (name: string) => name ? <Tag color="purple">{name}</Tag> : <Text type="secondary">未绑定</Text>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.owner && (
            <Button type="link" icon={<DisconnectOutlined />} onClick={() => handleUnbind(record.id)}>
              解绑
            </Button>
          )}
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
        title="房屋管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate()}>
            添加房屋
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={houses}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editMode ? '编辑房屋' : '添加房屋'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="building"
            label="所属楼栋"
            rules={[{ required: true, message: '请选择楼栋' }]}
          >
            <Select placeholder="请选择楼栋">
              {buildings.map((building: any) => (
                <Select.Option key={building.id} value={building.id}>
                  {building.building_number}栋
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="unit_number"
            label="单元号"
            rules={[{ required: true, message: '请输入单元号' }]}
          >
            <Input placeholder="例如：1、2" />
          </Form.Item>

          <Form.Item
            name="room_number"
            label="房号"
            rules={[{ required: true, message: '请输入房号' }]}
          >
            <Input placeholder="例如：101、102" />
          </Form.Item>

          <Form.Item name="floor" label="楼层">
            <InputNumber min={1} placeholder="例如：1" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="area"
            label="房屋面积（㎡）"
            rules={[{ required: true, message: '请输入面积' }]}
          >
            <InputNumber min={0} step={0.01} placeholder="例如：100.5" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="owner" label="绑定业主">
            <Select placeholder="请选择业主（可选）" allowClear>
              {owners.map((owner: any) => (
                <Select.Option key={owner.id} value={owner.id}>
                  {owner.username}
                </Select.Option>
              ))}
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

export default HouseManagement
