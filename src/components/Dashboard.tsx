import { LogOut, Plus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// 프로필 아바타 매핑
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

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const userProfile = profileOptions.find(p => p.id === user?.profile_id) || profileOptions[0]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full ${userProfile.bg} flex items-center justify-center text-xl`}>
                {userProfile.text}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  안녕하세요, {user?.nickname}님!
                </h1>
                <p className="text-gray-600">챌린지를 시작해보세요</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>

        {/* 챌린지 상태 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">참여 중인 챌린지</h2>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Users className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-600">아직 참여 중인 챌린지가 없습니다</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">나의 기록</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">총 챌린지 참여</span>
                <span className="font-semibold">0회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">완료한 챌린지</span>
                <span className="font-semibold">0회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">연속 달성 기록</span>
                <span className="font-semibold">0일</span>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">챌린지 시작하기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/create-challenge')}
              className="flex items-center justify-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-xl transition-colors group"
            >
              <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold">새로 챌린지 시작하기</span>
            </button>
            
            <button 
              onClick={() => navigate('/join-challenge')}
              className="flex items-center justify-center space-x-3 bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-xl transition-colors group"
            >
              <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold">기존 챌린지 참여하기</span>
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
            <p className="text-sm text-gray-700 text-center">
              💡 친구들과 함께 나만의 챌린지를 시작해보세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 