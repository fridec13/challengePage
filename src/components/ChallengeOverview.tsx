import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, Target, Flame, TrendingUp, Clock, Settings, BarChart3, Trophy } from 'lucide-react'
import { challengeAPI, missionAPI } from '../lib/supabase'

interface Challenge {
  id: string
  title: string
  description?: string
  creator_id: string
  start_date: string
  duration_days: number
  end_date: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  scoring_method: {
    consistency: number
    volume: number
    quality: number
    streak_bonus: number
    enable_quality: boolean
  }
  entry_fee: number
  prize_distribution: any
  max_participants: number
}

interface Mission {
  id: string
  title: string
  description?: string
  mission_type: 'boolean' | 'number'
  success_conditions?: string
  order_index: number
}

interface MissionLog {
  id: string
  mission_id: string
  log_date: string
  value: any
  is_late: boolean
  missions: {
    title: string
    mission_type: string
  }
}

interface Participant {
  id: string
  user_id: string
  users: {
    nickname: string
    profile_id: number
  }
}

const ChallengeOverview = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myLogs, setMyLogs] = useState<MissionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const user = JSON.parse(localStorage.getItem('user') || '{}')

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

      // 내 미션 로그 로드 (전체 기간)
      const logsResult = await missionAPI.getUserMissionLogs(challengeData.id, user.id)
      if (logsResult.data) {
        setMyLogs(logsResult.data)
      }

    } catch (error) {
      console.error('챌린지 데이터 로드 실패:', error)
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }



  const calculateMyStats = () => {
    if (!myLogs.length) return { streak: 0, totalCompleted: 0, successRate: 0 }

    // 날짜별로 그룹화
    const logsByDate = myLogs.reduce((acc, log) => {
      if (!acc[log.log_date]) acc[log.log_date] = []
      acc[log.log_date].push(log)
      return acc
    }, {} as Record<string, MissionLog[]>)

    const totalCompleted = myLogs.length

    // 연속 달성일 계산 (간단한 버전)
    const sortedDates = Object.keys(logsByDate).sort()
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const date = sortedDates[i]
      if (date <= today) {
        const dayLogs = logsByDate[date]
        if (dayLogs.length === missions.length) {
          streak++
        } else {
          break
        }
      }
    }

    const totalPossibleLogs = calculateTotalPossibleLogs()
    const successRate = totalPossibleLogs > 0 ? (totalCompleted / totalPossibleLogs) * 100 : 0

    return { streak, totalCompleted, successRate: Math.round(successRate) }
  }

  const calculateTotalPossibleLogs = () => {
    if (!challenge) return 0
    
    const startDate = new Date(challenge.start_date)
    const today = new Date()
    const currentDate = today < new Date(challenge.end_date) ? today : new Date(challenge.end_date)
    
    const daysPassed = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    return daysPassed * missions.length
  }

  const getDaysRemaining = () => {
    if (!challenge) return 0
    const today = new Date()
    const endDate = new Date(challenge.end_date)
    const diffTime = endDate.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  const getProgressPercentage = () => {
    if (!challenge) return 0
    const startDate = new Date(challenge.start_date)
    const endDate = new Date(challenge.end_date)
    const today = new Date()
    
    const totalDuration = endDate.getTime() - startDate.getTime()
    const elapsed = today.getTime() - startDate.getTime()
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
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

  const myStats = calculateMyStats()
  const progressPercentage = getProgressPercentage()
  const daysRemaining = getDaysRemaining()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 truncate mx-4">챌린지 현황</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/challenge/${id}`)}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
              title="메인 화면"
            >
              <Target className="w-6 h-6 text-gray-600" />
            </button>
            <button
              onClick={() => navigate(`/challenge/${id}/participants`)}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
              title="참여자 현황"
            >
              <BarChart3 className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 챌린지 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{challenge.title}</h2>
              {challenge.description && (
                <p className="text-gray-600 mb-3">{challenge.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(challenge.start_date).toLocaleDateString()} ~ {new Date(challenge.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{participants.length}/{challenge.max_participants}명</span>
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              challenge.status === 'active' ? 'bg-green-100 text-green-800' :
              challenge.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
              challenge.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {challenge.status === 'active' ? '진행 중' :
               challenge.status === 'planning' ? '시작 대기' :
               challenge.status === 'completed' ? '완료' : challenge.status}
            </div>
          </div>

          {/* 진행률 바 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>전체 진행률</span>
              <span>{Math.round(progressPercentage)}% • {daysRemaining}일 남음</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 내 통계 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 성과 요약 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">내 성과 요약</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{myStats.streak}</p>
                  <p className="text-sm text-gray-600">연속 달성</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{myStats.totalCompleted}</p>
                  <p className="text-sm text-gray-600">총 달성</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{myStats.successRate}%</p>
                  <p className="text-sm text-gray-600">성공률</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{participants.findIndex(p => p.user_id === user.id) + 1}</p>
                  <p className="text-sm text-gray-600">현재 순위</p>
                </div>
              </div>
            </div>

            {/* 최근 활동 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">최근 활동</h3>
              {myLogs.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {myLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${log.is_late ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                        <div>
                          <p className="font-medium text-gray-800">{log.missions.title}</p>
                          <p className="text-sm text-gray-500">{new Date(log.log_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {log.missions.mission_type === 'boolean' ? (
                          <span className="text-green-600 font-medium">완료</span>
                        ) : (
                          <span className="text-blue-600 font-medium">{log.value.count}회</span>
                        )}
                        {log.is_late && (
                          <p className="text-xs text-orange-500">지연 입력</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>아직 기록된 활동이 없습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 미션 목록 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">미션 목록</h3>
              <div className="space-y-3">
                {missions.map((mission) => (
                  <div key={mission.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-800">{mission.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        mission.mission_type === 'boolean' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {mission.mission_type === 'boolean' ? '완료형' : '숫자형'}
                      </span>
                    </div>
                    {mission.description && (
                      <p className="text-sm text-gray-600 mb-2">{mission.description}</p>
                    )}
                    {mission.success_conditions && (
                      <p className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded">
                        💡 {mission.success_conditions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 상금 정보 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">상금 정보</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">참가비</span>
                  <span className="font-semibold">{challenge.entry_fee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">총 상금</span>
                  <span className="font-semibold text-indigo-600">
                    {(challenge.entry_fee * participants.length).toLocaleString()}원
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">순위별 배분</p>
                  {challenge.prize_distribution && Object.entries(challenge.prize_distribution).map(([rank, percentage]) => (
                    <div key={rank} className="flex justify-between text-sm">
                      <span>{rank}등</span>
                      <span>{String(percentage)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 관리 메뉴 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">관리</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate(`/challenge/${id}/participants`)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">참여자 현황</span>
                </button>
                <button 
                  onClick={() => navigate(`/challenge/${id}/ranking`)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Trophy className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-700">순위 및 통계</span>
                </button>
                {challenge?.status === 'completed' && (
                  <button 
                    onClick={() => navigate(`/challenge/${id}/results`)}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-yellow-50 rounded-lg transition-colors border border-yellow-200"
                  >
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-700 font-medium">🏆 최종 결과</span>
                  </button>
                )}
                <button 
                  onClick={() => navigate(`/challenge/${id}/rules`)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span className="text-gray-700">규칙 확인</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChallengeOverview 