import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Target, Clock, Flame, Users, CheckCircle, Plus, Minus, BarChart3, Eye } from 'lucide-react'
import { challengeAPI, missionAPI } from '../lib/supabase'

interface Challenge {
  id: string
  title: string
  description?: string
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

interface MissionLog {
  id: string
  mission_id: string
  value: any
  logged_at: string
  is_late: boolean
}

interface Participant {
  id: string
  user_id: string
  users: {
    nickname: string
    profile_id: number
  }
}

const ChallengeMain = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [todayLogs, setTodayLogs] = useState<MissionLog[]>([])
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (id) {
      loadChallengeData()
    }
  }, [id])

  const loadChallengeData = async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      // 챌린지 정보 로드 - ID로 시도 후 코드로 폴백
      let challengeResult = await challengeAPI.getChallengeById(id)
      
      if (challengeResult.error || !challengeResult.data) {
        // ID로 실패하면 코드로 시도
        challengeResult = await challengeAPI.getChallengeByCode(id)
        
        if (challengeResult.error || !challengeResult.data) {
          navigate('/dashboard')
          return
        }
      }

      const challengeData = challengeResult.data
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

      // 오늘의 미션 로그 로드
      const logsResult = await missionAPI.getDayMissionLogs(challengeData.id, user.id, today)
      if (logsResult.data) {
        setTodayLogs(logsResult.data)
      }

    } catch (error) {
      console.error('챌린지 데이터 로드 실패:', error)
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMissionComplete = async (mission: Mission, value: any) => {
    if (!challenge) return
    
    setIsSubmitting(true)
    try {
      const result = await missionAPI.logMission({
        mission_id: mission.id,
        user_id: user.id,
        challenge_id: challenge.id,
        log_date: today,
        value: value,
        is_late: false // 이 값은 API에서 자동으로 계산됨
      })

      if (result.error) {
        alert('미션 기록에 실패했습니다')
        return
      }

      // 오늘의 로그 새로고침
      const logsResult = await missionAPI.getDayMissionLogs(challenge.id, user.id, today)
      if (logsResult.data) {
        setTodayLogs(logsResult.data)
      }

    } catch (error) {
      console.error('미션 완료 실패:', error)
      alert('미션 기록에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isMissionCompleted = (missionId: string) => {
    return todayLogs.some(log => log.mission_id === missionId)
  }

  const getMissionLogValue = (missionId: string) => {
    const log = todayLogs.find(log => log.mission_id === missionId)
    return log?.value || null
  }

  const getProfileEmoji = (profileId: number) => {
    const emojis = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐻', '🐷', '🐯', '🐨']
    return emojis[profileId - 1] || '🐱'
  }

  const calculateDayProgress = () => {
    if (!challenge) return 0
    
    const startDate = new Date(challenge.start_date)
    const endDate = new Date(challenge.end_date)
    const currentDate = new Date()
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const passedDays = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return Math.min(Math.max(passedDays / totalDays * 100, 0), 100)
  }

  const calculateTodayProgress = () => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const passedMs = now.getTime() - todayStart.getTime()
    const totalMs = 24 * 60 * 60 * 1000
    
    return Math.min(passedMs / totalMs * 100, 100)
  }

  const getConsecutiveDays = () => {
    // TODO: 실제 연속 달성일 계산 로직 구현
    return Math.floor(Math.random() * 10) + 1
  }

  const getTotalCompletions = () => {
    // TODO: 실제 총 달성 횟수 계산 로직 구현
    return Math.floor(Math.random() * 20) + 5
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">챌린지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!challenge || !missions.length) {
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

  const currentMission = missions[currentMissionIndex]
  const dayProgress = calculateDayProgress()
  const todayProgress = calculateTodayProgress()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 truncate mx-4">{challenge.title}</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/challenge/${id}/overview`)}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
              title="챌린지 현황"
            >
              <Eye className="w-6 h-6 text-gray-600" />
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

        {/* 24시간 진행률 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">오늘의 진행률</h2>
            <p className="text-gray-600">오늘 하루가 {Math.round(todayProgress)}% 지났어요</p>
          </div>
          
          <div className="relative">
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out"
                style={{ width: `${todayProgress}%` }}
              ></div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>00:00</span>
              <span>{new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>24:00</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Flame className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600">연속</p>
              <p className="text-lg font-bold text-orange-600">{getConsecutiveDays()}일</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">총 달성</p>
              <p className="text-lg font-bold text-blue-600">{getTotalCompletions()}회</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">챌린지</p>
              <p className="text-lg font-bold text-purple-600">{Math.round(dayProgress)}%</p>
            </div>
          </div>
        </div>

        {/* 미션 카드 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">오늘의 미션</h3>
            {missions.length > 1 && (
              <div className="flex space-x-1">
                {missions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMissionIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentMissionIndex ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">{currentMission.title}</h4>
              {currentMission.description && (
                <p className="text-gray-600 mb-3">{currentMission.description}</p>
              )}
              {currentMission.success_conditions && (
                <p className="text-sm text-indigo-600 bg-indigo-50 p-2 rounded-lg mb-4">
                  💡 {currentMission.success_conditions}
                </p>
              )}
            </div>

            {/* 미션 입력 UI */}
            {currentMission.mission_type === 'boolean' ? (
              <BooleanMissionInput
                mission={currentMission}
                isCompleted={isMissionCompleted(currentMission.id)}
                onComplete={handleMissionComplete}
                isSubmitting={isSubmitting}
              />
            ) : (
              <NumberMissionInput
                mission={currentMission}
                currentValue={getMissionLogValue(currentMission.id)}
                onComplete={handleMissionComplete}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>

        {/* 순위 정보 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">참여자 현황</h3>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{participants.length}명 참여</span>
            </div>
          </div>

          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    {getProfileEmoji(participant.users.profile_id)}
                  </div>
                  <span className="font-medium text-gray-800">
                    {participant.users.nickname}
                    {participant.user_id === user.id && (
                      <span className="text-indigo-600 text-sm ml-1">(나)</span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">오늘</p>
                  <p className="font-semibold text-green-600">
                    {participant.user_id === user.id ? todayLogs.length : Math.floor(Math.random() * missions.length)}/{missions.length}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Boolean 미션 입력 컴포넌트
const BooleanMissionInput = ({ 
  mission, 
  isCompleted, 
  onComplete, 
  isSubmitting 
}: { 
  mission: Mission
  isCompleted: boolean
  onComplete: (mission: Mission, value: any) => void
  isSubmitting: boolean
}) => {
  if (isCompleted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p className="text-green-600 font-semibold">미션 완료!</p>
        <p className="text-sm text-gray-500">오늘의 미션을 성공적으로 완료했습니다</p>
      </div>
    )
  }

  return (
    <div className="text-center py-4">
      <button
        onClick={() => onComplete(mission, { completed: true })}
        disabled={isSubmitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-4 rounded-xl transition-colors duration-200"
      >
        {isSubmitting ? '기록 중...' : '미션 완료하기'}
      </button>
    </div>
  )
}

// Number 미션 입력 컴포넌트
const NumberMissionInput = ({ 
  mission, 
  currentValue, 
  onComplete, 
  isSubmitting 
}: { 
  mission: Mission
  currentValue: any
  onComplete: (mission: Mission, value: any) => void
  isSubmitting: boolean
}) => {
  const [value, setValue] = useState(currentValue?.count || 0)

  useEffect(() => {
    if (currentValue?.count) {
      setValue(currentValue.count)
    }
  }, [currentValue])

  const handleSubmit = () => {
    if (value > 0) {
      onComplete(mission, { count: value })
    }
  }

  return (
    <div className="space-y-6">
      {/* 다이얼 입력 */}
      <div className="text-center">
        <div className="bg-gray-50 rounded-2xl p-8 mb-4">
          <div className="text-6xl font-bold text-indigo-600 mb-4">{value}</div>
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={() => setValue(Math.max(0, value - 1))}
              className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <Minus className="w-6 h-6" />
            </button>
            <button
              onClick={() => setValue(value + 1)}
              className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={value === 0 || isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-4 rounded-xl transition-colors duration-200"
      >
        {isSubmitting ? '기록 중...' : currentValue ? '기록 업데이트' : '기록하기'}
      </button>

      {currentValue && (
        <p className="text-center text-sm text-gray-500">
          현재 기록: {currentValue.count}회
        </p>
      )}
    </div>
  )
}

export default ChallengeMain 