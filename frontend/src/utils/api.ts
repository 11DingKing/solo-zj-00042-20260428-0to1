import axios, { AxiosResponse } from 'axios'
import { message } from 'antd'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post('/api/token/refresh/', {
            refresh: refreshToken,
          })
          
          const { access } = response.data
          localStorage.setItem('access_token', access)
          
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          message.error('登录已过期，请重新登录')
        }
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    
    if (error.response?.data?.error) {
      message.error(error.response.data.error)
    } else if (error.response?.data?.detail) {
      message.error(error.response.data.detail)
    }
    
    return Promise.reject(error)
  }
)

export const extractListData = (data: any): any[] => {
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
    return data.results
  }
  return []
}

export const extractPaginatedData = (data: any) => {
  if (data && typeof data === 'object' && 'results' in data) {
    return {
      items: data.results || [],
      total: data.count || 0,
      next: data.next,
      previous: data.previous,
    }
  }
  return {
    items: Array.isArray(data) ? data : [],
    total: Array.isArray(data) ? data.length : 0,
    next: null,
    previous: null,
  }
}

export default api
