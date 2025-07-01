import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import Dashboard from './Dashboard'

const Home = () => {
  const { isAuthenticated, loading } = useAuth()
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'signup'>('home')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-pretendard flex items-center justify-center">
        <div className="text-2xl text-gray-600">로딩 중...</div>
      </div>
    )
  }

  // 로그인된 사용자는 대시보드로
  if (isAuthenticated) {
    return <Dashboard />
  }

  // 로그인 폼
  if (currentView === 'login') {
    return <LoginForm onBack={() => setCurrentView('home')} />
  }

  // 회원가입 폼
  if (currentView === 'signup') {
    return <SignupForm onBack={() => setCurrentView('home')} />
  }

  // 홈 화면
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-pretendard">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Challenge!
            </h1>
            <p className="text-gray-600 text-lg">
              마음대로 설정하고, 기록하세요!
            </p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => setCurrentView('login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              로그인
            </button>
            <button 
              onClick={() => setCurrentView('signup')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              새로시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home 