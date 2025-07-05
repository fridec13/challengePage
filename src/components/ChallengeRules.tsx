import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Target, Trophy, Users, Clock, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { challengeAPI, missionAPI } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Challenge {
  id: string
  title: string
  description?: string
  creator_id: string
  start_date: string
  duration_days: number
  end_date: string
  max_participants: number
  entry_fee: number
  challenge_code: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  scoring_method: {
    consistency: number
    volume: number
    quality: number
    streak_bonus: number
    enable_quality: boolean
  }
  prize_distribution: number[] | Record<string, number>
}

interface Mission {
  id: string
  title: string
  description?: string
  mission_type: 'boolean' | 'number'
  input_restriction: 'same_day_only' | 'flexible'
  success_conditions?: string
  order_index: number
}

interface Participant {
  id: string
  user_id: string
  users: {
    nickname: string
    profile_id: number
  }
}

const ChallengeRules = () => {
  const { code: id } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadChallengeData()
    }
  }, [id])

  const loadChallengeData = async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      // 챌린지 정보 로드
      let challengeResult = await challengeAPI.getChallengeById(id)
      
      if (challengeResult.error || !challengeResult.data) {
        challengeResult = await challengeAPI.getChallengeByCode(id)
        if (challengeResult.error || !challengeResult.data) {
          navigate('/dashboard')
          return
        }
      }

      // 챌린지 자동 종료 체크 및 상태 업데이트
      const statusCheckResult = await challengeAPI.checkAndUpdateChallengeStatus(challengeResult.data.id)
      const challengeData = statusCheckResult.data || challengeResult.data
      
      setChallenge(challengeData)

      // 미션 목록 로드
      const missionsResult = await missionAPI.getChallengeMissions(challengeData.id)
      if (missionsResult.data) {
        setMissions(missionsResult.data)
      }

      // 참여자 목록 로드
      const participantsResult = await challengeAPI.getChallengeParticipants(challengeData.id)
      if (participantsResult.data) {
        setParticipants(participantsResult.data)
      }

    } catch (error) {
      console.error('챌린지 데이터 로드 실패:', error)
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return '시작 대기'
      case 'active': return '진행 중'
      case 'completed': return '완료'
      case 'cancelled': return '취소됨'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const getTotalPrizePool = () => {
    return challenge ? challenge.entry_fee * participants.length : 0
  }

  const isCreator = () => {
    return challenge?.creator_id === user?.id
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">규칙을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">챌린지를 찾을 수 없습니다</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/challenge/${id}/overview`)}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 truncate mx-4">챌린지 규칙</h1>
          <div className="w-10"></div>
        </div>

        {/* 챌린지 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{challenge.title}</h2>
              {challenge.description && (
                <p className="text-gray-600 mb-4">{challenge.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>생성자: {isCreator() ? '나' : '다른 사용자'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="w-4 h-4" />
                  <span>코드: {challenge.challenge_code}</span>
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(challenge.status)}`}>
              {getStatusText(challenge.status)}
            </div>
          </div>
        </div>

        {/* 참여 규칙 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">참여 규칙</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">최대 참여 인원</span>
                <span className="font-semibold">{challenge.max_participants}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">현재 참여 인원</span>
                <span className="font-semibold text-indigo-600">{participants.length}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">참여 가능 상태</span>
                <span className="font-semibold">
                  {challenge.status === 'planning' ? '참여 가능' : '참여 마감'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">개인 참가비</span>
                <span className="font-semibold">{challenge.entry_fee.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">총 상금 풀</span>
                <span className="font-semibold text-green-600">{getTotalPrizePool().toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">동시 참여 제한</span>
                <span className="font-semibold">1개 챌린지만</span>
              </div>
            </div>
          </div>
        </div>

        {/* 기간 및 일정 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">기간 및 일정</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">시작일</span>
              <span className="font-semibold">{formatDate(challenge.start_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">종료일</span>
              <span className="font-semibold">{formatDate(challenge.end_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">총 기간</span>
              <span className="font-semibold">{challenge.duration_days}일</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">매일 미션 수행</span>
              <span className="font-semibold text-orange-600">필수</span>
            </div>
          </div>
        </div>

        {/* 미션 규칙 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">미션 규칙</h3>
          </div>
          
          <div className="space-y-4">
            {missions.map((mission, index) => (
              <div key={mission.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">
                    미션 {index + 1}: {mission.title}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    mission.mission_type === 'boolean' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {mission.mission_type === 'boolean' ? '완료/미완료형' : '숫자 입력형'}
                  </span>
                </div>
                
                {mission.description && (
                  <p className="text-gray-600 mb-3">{mission.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">입력 제한:</span>
                    <span className="ml-2 font-medium">
                      {mission.input_restriction === 'same_day_only' ? '당일만 입력 가능' : '언제든 입력 가능'}
                    </span>
                  </div>
                  {mission.success_conditions && (
                    <div className="md:col-span-2">
                      <span className="text-gray-500">성공 조건:</span>
                      <div className="mt-1 text-indigo-600 bg-indigo-50 p-2 rounded">
                        💡 {mission.success_conditions}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 평가 및 점수 계산 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">평가 및 점수 계산</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">점수 구성 요소</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{challenge.scoring_method.consistency}%</div>
                  <div className="text-sm text-gray-600">꾸준함 (연속 달성)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{challenge.scoring_method.volume}%</div>
                  <div className="text-sm text-gray-600">총량 (누적 달성)</div>
                </div>
                {challenge.scoring_method.enable_quality && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{challenge.scoring_method.quality}%</div>
                    <div className="text-sm text-gray-600">충실도 (질적 평가)</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-orange-800">연속 달성 보너스</span>
              </div>
              <div className="text-orange-700">
                <span className="font-bold">{challenge.scoring_method.streak_bonus}점</span> 추가 점수 (연속 달성일당)
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-semibold text-blue-800 mb-2">점수 계산 공식</h5>
              <div className="text-blue-700 text-sm">
                <p><strong>최종 점수 =</strong></p>
                <p className="ml-4">• 꾸준함 점수 × {challenge.scoring_method.consistency}%</p>
                <p className="ml-4">• 총량 점수 × {challenge.scoring_method.volume}%</p>
                {challenge.scoring_method.enable_quality && (
                  <p className="ml-4">• 충실도 점수 × {challenge.scoring_method.quality}%</p>
                )}
                <p className="ml-4">• 연속 달성 보너스 ({challenge.scoring_method.streak_bonus}점 × 연속일)</p>
              </div>
            </div>
          </div>
        </div>

        {/* 상금 배분 규칙 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">상금 배분 규칙</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{challenge.entry_fee.toLocaleString()}원</div>
                <div className="text-sm text-gray-600">개인 참가비</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{getTotalPrizePool().toLocaleString()}원</div>
                <div className="text-sm text-gray-600">총 상금 풀</div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-3">순위별 배분</h5>
              <div className="space-y-2">
                {Array.isArray(challenge.prize_distribution) 
                  ? challenge.prize_distribution.map((percentage, index) => {
                      const rank = index + 1
                      const amount = Math.floor(getTotalPrizePool() * (percentage / 100))
                      return (
                        <div key={rank} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              rank === 1 ? 'bg-yellow-500' :
                              rank === 2 ? 'bg-gray-400' :
                              rank === 3 ? 'bg-amber-600' : 'bg-gray-300'
                            }`}>
                              {rank}
                            </div>
                            <span className="font-medium">{rank}등</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{amount.toLocaleString()}원</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      )
                    })
                  : Object.entries(challenge.prize_distribution).map(([rank, percentage]) => {
                      const amount = Math.floor(getTotalPrizePool() * (Number(percentage) / 100))
                      return (
                        <div key={rank} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              rank === '1' ? 'bg-yellow-500' :
                              rank === '2' ? 'bg-gray-400' :
                              rank === '3' ? 'bg-amber-600' : 'bg-gray-300'
                            }`}>
                              {rank}
                            </div>
                            <span className="font-medium">{rank}등</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{amount.toLocaleString()}원</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      )
                    })
                }
              </div>
            </div>
          </div>
        </div>

        {/* 중요 공지사항 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-800">중요 공지사항</h3>
          </div>
          
          <div className="space-y-3 text-amber-700">
            <p>• 챌린지 시작 후에는 규칙 변경이 불가능합니다.</p>
            <p>• 미션 입력 시간에 따라 정시/지연으로 구분되며, 평가에 반영됩니다.</p>
            <p>• 연속 달성이 중단되면 다시 1일부터 시작됩니다.</p>
            <p>• 상금 배분은 챌린지 완료 후 최종 순위에 따라 자동으로 계산됩니다.</p>
            {challenge.scoring_method.enable_quality && (
              <p>• 충실도 평가는 별도의 심사 과정을 거칩니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChallengeRules
