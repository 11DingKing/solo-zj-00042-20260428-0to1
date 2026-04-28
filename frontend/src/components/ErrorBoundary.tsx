import React, { Component, ReactNode } from 'react'
import { Card, Typography, Button } from 'antd'

const { Title, Text, Paragraph } = Typography

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card style={{ margin: 24 }}>
          <Title level={3} type="danger">页面加载出错</Title>
          <Paragraph>
            <Text strong>错误信息：</Text> {this.state.error?.message}
          </Paragraph>
          {this.state.errorInfo && (
            <Paragraph>
              <Text strong>组件堆栈：</Text>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: 16, 
                borderRadius: 4,
                overflow: 'auto'
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </Paragraph>
          )}
          <Button 
            type="primary" 
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null })
              window.location.reload()
            }}
          >
            刷新页面
          </Button>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
