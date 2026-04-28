import React, { useState, useEffect } from 'react'
import {
  Card,
  List,
  Tag,
  Button,
  Modal,
  message,
  Typography,
  Space,
  Divider,
  Badge,
  Descriptions,
} from 'antd'
import {
  EyeOutlined,
  BellOutlined,
} from '@ant-design/icons'
import api from '@/utils/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const OwnerAnnouncements: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentAnnouncement, setCurrentAnnouncement] = useState<any>(null)

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
    if (!announcement.is_read) {
      try {
        api.post(`/announcements/${announcement.id}/mark_read/`)
        setAnnouncements(prev => 
          prev.map(item => 
            item.id === announcement.id ? { ...item, is_read: true } : item
          )
        )
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }
  }

  const renderContent = (content: string) => {
    return {
      __html: content
    }
  }

  return (
    <div>
      <Card title="小区公告">
        <List
          loading={loading}
          itemLayout="vertical"
          dataSource={announcements}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(item)}>
                  查看详情
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {item.is_pinned && <Tag color="red">置顶</Tag>}
                    {!item.is_read && <Badge dot status="error" />}
                    <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                  </Space>
                }
                description={
                  <Space>
                    <Text type="secondary">
                      发布时间：{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                    <Text type="secondary">
                      发布人：{item.author_name || '系统'}
                    </Text>
                  </Space>
                }
              />
              <div 
                dangerouslySetInnerHTML={renderContent(item.content.substring(0, 200) + '...')}
                style={{ marginTop: 8, color: '#666' }}
              />
            </List.Item>
          )}
        />
      </Card>

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

export default OwnerAnnouncements
