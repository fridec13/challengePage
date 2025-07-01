import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../lib/supabase'

// 프로필 아바타 색상 조합들
const profileOptions = [
  { id: 1, bg: 'bg-red-400', text: '🌟' },
  { id: 2, bg: 'bg-blue-400', text: '🚀' },
  { id: 3, bg: 'bg-green-400', text: '🌱' },
  { id: 4, bg: 'bg-yellow-400', text: '⚡' },
  { id: 5, bg: 'bg-purple-400', text: '🎯' },
  { id: 6, bg: 'bg-pink-400', text: '💎' },
  { id: 7, bg: 'bg-indigo-400', text: '🎨' },
  { id: 8, bg: 'bg-orange-400', text: '🔥' },
  { id: 9, bg: 'bg-teal-400', text: '🌊' },
  { id: 10, bg: 'bg-cyan-400', text: '❄️' },
]

interface SignupFormProps {
  onBack: () => void
}

const SignupForm = ({ onBack }: SignupFormProps) => {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    nickname: '',
    pinCode: ''
  })
  const [selectedProfile, setSelectedProfile] = useState(profileOptions[0])
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

  const getRandomProfile = () => {
    const randomIndex = Math.floor(Math.random() * profileOptions.length)
    setSelectedProfile(profileOptions[randomIndex])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 닉네임 중복 확인
      const { exists, error: checkError } = await authAPI.checkNickname(formData.nickname)
      
      if (checkError) {
        setError('닉네임 확인 중 오류가 발생했습니다.')
        return
      }

      if (exists) {
        setError('이미 사용 중인 닉네임입니다.')
        return
      }

      // 회원가입
      const { data, error } = await authAPI.signUp(
        formData.nickname, 
        formData.pinCode, 
        selectedProfile.id
      )
      
      if (error) {
        setError('회원가입에 실패했습니다. 다시 시도해주세요.')
        console.error('Signup error:', error)
        return
      }

      if (data && data[0]) {
        login(data[0])
      }
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.')
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-pretendard">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center mb-6">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 ml-4">새로시작하기</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 프로필 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로필 아바타
              </label>
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full ${selectedProfile.bg} flex items-center justify-center text-2xl`}>
                  {selectedProfile.text}
                </div>
                <button
                  type="button"
                  onClick={getRandomProfile}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm">랜덤</span>
                </button>
              </div>
            </div>

            {/* 닉네임 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="닉네임을 입력하세요"
                required
                minLength={2}
                maxLength={12}
              />
              <p className="text-xs text-gray-500 mt-1">2-12자로 입력해주세요</p>
            </div>

            {/* 핀코드 */}
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
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="4자리 숫자"
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
              <p className="text-xs text-gray-500 mt-1">로그인할 때 사용할 4자리 숫자</p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.nickname || formData.pinCode.length !== 4}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? '계정 생성 중...' : '계정 만들기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SignupForm 