import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { setCurrentUser, syncAuthSession } from '../lib/supabase'

interface User {
  id: string
  nickname: string
  pin_code: string
  profile_id: number
  created_at: string
}

interface AuthContextType {
  user: User | null
  login: (userData: User) => Promise<void>
  logout: () => void
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 로컬 스토리지에서 사용자 정보 복원
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('challengeUser')
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          // 세션 유효성 확인만 수행 (새로고침 시)
          await syncAuthSession(userData.id)
        } catch (error) {
          console.error('Failed to parse saved user:', error)
          localStorage.removeItem('challengeUser')
        }
      }
      setLoading(false)
    }
    
    initAuth()
  }, [])

  const login = async (userData: User) => {
    setUser(userData)
    localStorage.setItem('challengeUser', JSON.stringify(userData))
    // Supabase Auth와 연동 (로그인 시에만 새로 생성)
    setCurrentUser(userData.id)
    await syncAuthSession(userData.id)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('challengeUser')
    // Supabase Auth 세션도 정리
    setCurrentUser('')
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 