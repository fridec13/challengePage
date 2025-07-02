import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Delete, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../lib/supabase'

// 숫자 키패드 컴포넌트
const NumericKeypad = ({ 
  onNumberClick, 
  onBackspace, 
  onClear 
}: { 
  onNumberClick: (num: string) => void
  onBackspace: () => void
  onClear: () => void
}) => {
  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ]

  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
      <div className="grid grid-cols-3 gap-3 mb-3">
        {numbers.map((row) =>
          row.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onNumberClick(num)}
              className="h-12 bg-white hover:bg-indigo-50 border border-gray-200 rounded-lg font-semibold text-lg text-gray-700 hover:text-indigo-600 transition-colors active:scale-95"
            >
              {num}
            </button>
          ))
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onBackspace}
          className="h-12 bg-white hover:bg-red-50 border border-gray-200 rounded-lg font-semibold text-red-600 transition-colors active:scale-95 flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
        
        <button
          type="button"
          onClick={() => onNumberClick('0')}
          className="h-12 bg-white hover:bg-indigo-50 border border-gray-200 rounded-lg font-semibold text-lg text-gray-700 hover:text-indigo-600 transition-colors active:scale-95"
        >
          0
        </button>
        
        <button
          type="button"
          onClick={onClear}
          className="h-12 bg-white hover:bg-orange-50 border border-gray-200 rounded-lg font-semibold text-orange-600 transition-colors active:scale-95 flex items-center justify-center"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
      
      <div className="text-xs text-gray-500 text-center mt-2">
        <Delete className="w-3 h-3 inline mr-1" />지우기 · 0 · <RotateCcw className="w-3 h-3 inline mx-1" />전체삭제
      </div>
    </div>
  )
}

const LoginForm = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    nickname: '',
    pinCode: ''
  })
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // 핀코드는 숫자 4자리로 제한
    if (name === 'pinCode') {
      const numbers = value.replace(/\D/g, '').slice(0, 4)
      setFormData(prev => ({ ...prev, [name]: numbers }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // 키패드 숫자 클릭 핸들러
  const handleNumberClick = (num: string) => {
    if (formData.pinCode.length < 4) {
      setFormData(prev => ({ ...prev, pinCode: prev.pinCode + num }))
    }
  }

  // 키패드 백스페이스 핸들러
  const handleBackspace = () => {
    setFormData(prev => ({ ...prev, pinCode: prev.pinCode.slice(0, -1) }))
  }

  // 키패드 전체 삭제 핸들러
  const handleClear = () => {
    setFormData(prev => ({ ...prev, pinCode: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await authAPI.signIn(formData.nickname, formData.pinCode)
      
      if (error) {
        setError('로그인에 실패했습니다. 닉네임과 핀코드를 확인해주세요.')
        return
      }

      if (!data) {
        setError('일치하는 사용자를 찾을 수 없습니다.')
        return
      }

      login(data)
      navigate('/dashboard')
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 ml-4">로그인</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="닉네임을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                핀코드 (4자리)
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg tracking-widest"
                  placeholder="••••"
                  maxLength={4}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* 숫자 키패드 */}
              <NumericKeypad 
                onNumberClick={handleNumberClick}
                onBackspace={handleBackspace}
                onClear={handleClear}
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.nickname || formData.pinCode.length !== 4}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginForm 