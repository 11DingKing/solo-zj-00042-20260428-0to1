import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserRole = 'admin' | 'maintenance' | 'owner'

export interface User {
  id: number
  username: string
  email: string | null
  phone: string | null
  role: UserRole
  role_display: string
  house_info?: {
    id: number
    building_number: string
    unit_number: string
    room_number: string
    area: number
  } | null
  date_joined: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  
  setAuth: (data: { user: User; access: string; refresh: string }) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      setAuth: ({ user, access, refresh }) => {
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        localStorage.setItem('user', JSON.stringify(user))
        
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        })
      },
      
      setUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user))
        set({ user })
      },
      
      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
