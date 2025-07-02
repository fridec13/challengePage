import { LogOut, Plus, Users, Archive, Trophy, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { challengeAPI, debugAPI } from '../lib/supabase'
import { useState, useEffect } from 'react'

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

interface ActiveChallenge {
  challenge_id: string
  title: string
  status: string
  start_date: string
  end_date: string
  challenge_code: string
}

interface CompletedChallenge {
  challenges: {
    id: string
    title: string
    start_date: string
    end_date: string
    entry_fee: number
    max_participants: number
    challenge_code: string
    users: {
      nickname: string
    }
  }
}

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null)
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingArchive, setIsLoadingArchive] = useState(true)
  
  const userProfile = profileOptions.find(p => p.id === user?.profile_id) || profileOptions[0]

  useEffect(() => {
    // 데이터베이스 상태 확인
    debugAPI.checkTables()
    
    if (user?.id) {
      loadActiveChallenge()
      loadCompletedChallenges()
    }
  }, [user])

  const loadActiveChallenge = async () => {
    if (!user?.id) return
    
    try {
      const result = await challengeAPI.getUserActiveChallenge(user.id)
      if (result.data) {
        setActiveChallenge(result.data)
      }
    } catch (error) {
      console.error('활성 챌린지 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCompletedChallenges = async () => {
    if (!user?.id) return
    
    try {
      const result = await challengeAPI.getUserCompletedChallenges(user.id)
      if (result.data && Array.isArray(result.data)) {
        // null 데이터 추가 필터링
        const safeData = result.data.filter(item => 
          item && 
          item.challenges && 
          item.challenges.title &&
          item.challenges.id
        )
        setCompletedChallenges(safeData)
      } else {
        setCompletedChallenges([])
      }
    } catch (error) {
      console.error('완료된 챌린지 로드 실패:', error)
      setCompletedChallenges([])
    } finally {
      setIsLoadingArchive(false)
    }
  }

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
                  안녕하세요,<br className="sm:hidden" />
                  <span className="sm:ml-1">{user?.nickname}님!</span>
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
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">로딩 중...</p>
              </div>
            ) : activeChallenge ? (
              <div className="space-y-4">
                <div 
                  onClick={() => navigate(`/challenge/${activeChallenge.challenge_code}`)}
                  className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200 cursor-pointer hover:shadow-md transition-all group"
                >
                  <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">{activeChallenge.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>상태: <span className="font-medium text-indigo-600">{
                        activeChallenge.status === 'planning' ? '시작 대기' :
                        activeChallenge.status === 'active' ? '진행 중' :
                        activeChallenge.status === 'completed' ? '완료' : activeChallenge.status
                      }</span></p>
                      <p>기간: {new Date(activeChallenge.start_date).toLocaleDateString()} ~ {new Date(activeChallenge.end_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-indigo-600 group-hover:text-indigo-700">
                      <span className="text-sm font-medium">
                        {activeChallenge.status === 'planning' ? '대기실 입장 →' : 
                         activeChallenge.status === 'active' ? '챌린지 참여 →' : '상세보기 →'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <Users className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-600">아직 참여 중인 챌린지가 없습니다</p>
              </div>
            )}
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

        {/* 완료된 챌린지 아카이브 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Archive className="w-6 h-6 text-gray-600 mr-2" />
              완료된 챌린지
            </h2>
            <span className="text-sm text-gray-500">
              {completedChallenges.length}개
            </span>
          </div>
          
          {isLoadingArchive ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          ) : completedChallenges.length > 0 ? (
            <div className="space-y-4">
              {completedChallenges.slice(0, 3).map((item) => {
                // 안전한 데이터 접근
                const challenge = item?.challenges
                if (!challenge || !challenge.id || !challenge.title) return null
                
                return (
                <div 
                  key={challenge.id}
                  onClick={() => navigate(`/challenge/${challenge.challenge_code}/results`)}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 cursor-pointer hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                        {challenge.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {challenge.start_date ? new Date(challenge.start_date).toLocaleDateString() : '-'} ~ 
                          {challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : '-'}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          최대 {challenge.max_participants || 0}명
                        </div>
                        <div className="text-green-600 font-medium">
                          상금: {new Intl.NumberFormat('ko-KR').format(challenge.entry_fee || 0)}원
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        생성자: {challenge.users?.nickname || '알 수 없음'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-blue-600 group-hover:text-indigo-600">
                        결과 보기
                      </span>
                    </div>
                  </div>
                </div>
                )
              })}
              
              {completedChallenges.length > 3 && (
                <button
                  onClick={() => {/* TODO: 전체 아카이브 페이지로 이동 */}}
                  className="w-full text-center py-3 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  더 많은 챌린지 보기 ({completedChallenges.length - 3}개 더)
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Archive className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-600">아직 완료된 챌린지가 없습니다</p>
              <p className="text-sm text-gray-500 mt-1">첫 번째 챌린지를 시작해보세요!</p>
            </div>
          )}
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