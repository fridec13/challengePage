import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, Target, Flame, TrendingUp, Clock, Settings, BarChart3, Trophy } from 'lucide-react'
import { challengeAPI, missionAPI, koreaTimeUtils } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ScoringSystem } from '../lib/scoring'

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
  input_restriction: 'same_day_only' | 'flexible'
  success_conditions?: string
  order_index: number
}

interface MissionLog {
  id: string
  mission_id: string
  user_id: string
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
  const { code: id } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myLogs, setMyLogs] = useState<MissionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showMissionForm, setShowMissionForm] = useState(false)
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [missionValue, setMissionValue] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      if (user?.id) {
        const logsResult = await missionAPI.getUserMissionLogs(challengeData.id, user.id!)
        if (logsResult.data) {
          setMyLogs(logsResult.data)
        }
      }

    } catch (error) {
      console.error('챌린지 데이터 로드 실패:', error)
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMyStats = () => {
    if (!myLogs.length || !challenge || !user?.id) return { streak: 0, totalCompleted: 0, successRate: 0 }

    const totalCompleted = myLogs.length

    // ScoringSystem을 사용한 정확한 연속 달성일 계산
    let currentStreak = 0
    try {
      const scoringSystem = new ScoringSystem(
        missions,
        challenge.scoring_method,
        challenge.start_date,
        challenge.end_date
      )
      
      const userScore = scoringSystem.calculateRankings(myLogs, [user.id!])[0]
      if (userScore) {
        currentStreak = userScore.current_streak
      }
    } catch (error) {
      console.error('연속 달성일 계산 오류:', error)
      
      // 기존 간단한 계산 로직을 fallback으로 사용
      const logsByDate = myLogs.reduce((acc, log) => {
        if (!acc[log.log_date]) acc[log.log_date] = []
        acc[log.log_date].push(log)
        return acc
      }, {} as Record<string, MissionLog[]>)

      const sortedDates = Object.keys(logsByDate).sort()
      const today = koreaTimeUtils.getKoreaToday()
      
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const date = sortedDates[i]
        if (date <= today) {
          const dayLogs = logsByDate[date]
          if (dayLogs.length === missions.length) {
            currentStreak++
          } else {
            break
          }
        }
      }
    }

    // 정확한 성공률 계산
    const successRate = calculateSuccessRate()

    return { streak: currentStreak, totalCompleted, successRate: Math.round(successRate) }
  }

  const calculateSuccessRate = () => {
    if (!challenge || !missions.length || challenge.status === 'planning') return 0

    // 챌린지 진행 가능한 날짜 범위 계산 (한국 시간 기준)
    const startDate = koreaTimeUtils.parseKoreaDate(challenge.start_date)
    const endDate = koreaTimeUtils.parseKoreaDate(challenge.end_date)
    const today = koreaTimeUtils.getKoreaNow()
    
    // 실제 진행된 날짜까지만 계산 (오늘까지 또는 챌린지 끝날까지 중 빠른 것)
    const currentEndDate = today < endDate ? today : endDate
    
    // 챌린지가 아직 시작 안했으면 0%
    if (today < startDate) return 0
    
    // 진행된 날짜 수 계산
    const daysPassed = Math.max(0, Math.floor((currentEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    const totalPossibleMissions = daysPassed * missions.length
    
    console.log('성공률 계산:', {
      startDate: challenge.start_date,
      today: koreaTimeUtils.getKoreaToday(),
      daysPassed,
      missionsPerDay: missions.length,
      totalPossible: totalPossibleMissions,
      totalCompleted: myLogs.length,
      successRate: totalPossibleMissions > 0 ? (myLogs.length / totalPossibleMissions) * 100 : 0
    })
    
    return totalPossibleMissions > 0 ? (myLogs.length / totalPossibleMissions) * 100 : 0
  }

  const getDaysRemaining = () => {
    if (!challenge) return 0
    // 한국 시간 기준으로 계산
    const today = koreaTimeUtils.getKoreaNow()
    const endDate = koreaTimeUtils.parseKoreaDate(challenge.end_date)
    const diffTime = endDate.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  const getProgressPercentage = () => {
    if (!challenge) return 0
    // 한국 시간 기준으로 계산
    const startDate = koreaTimeUtils.parseKoreaDate(challenge.start_date)
    const endDate = koreaTimeUtils.parseKoreaDate(challenge.end_date)
    const today = koreaTimeUtils.getKoreaNow()
    
    const totalDuration = endDate.getTime() - startDate.getTime()
    const elapsed = today.getTime() - startDate.getTime()
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
  }

  const getFlexibleMissions = () => {
    return missions.filter(mission => mission.input_restriction === 'flexible')
  }

  const getPastDates = () => {
    if (!challenge) return []
    
    const startDate = koreaTimeUtils.parseKoreaDate(challenge.start_date)
    const today = koreaTimeUtils.getKoreaNow()
    const dates = []
    
    const currentDate = new Date(startDate)
    while (currentDate < today) {
      dates.push(new Date(currentDate).toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates.reverse() // 최신 날짜부터 표시
  }

  const hasLogForDate = (missionId: string, date: string) => {
    return myLogs.some(log => log.mission_id === missionId && log.log_date === date)
  }

  const handleMissionSubmit = async () => {
    if (!selectedMission || !selectedDate || !challenge || !user?.id) return
    
    if (hasLogForDate(selectedMission.id, selectedDate)) {
      alert('이미 해당 날짜에 미션을 완료했습니다.')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const logData = {
        mission_id: selectedMission.id,
        user_id: user.id,
        challenge_id: challenge.id,
        log_date: selectedDate,
        value: selectedMission.mission_type === 'boolean' 
          ? { completed: true }
          : { count: missionValue || 0 },
        is_late: true // 지연입력은 항상 is_late true
      }
      
      const result = await missionAPI.logMission(logData)
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      // 성공 시 로그 목록 새로고침
      const logsResult = await missionAPI.getUserMissionLogs(challenge.id, user.id)
      if (logsResult.data) {
        setMyLogs(logsResult.data)
      }
      
      // 폼 초기화
      setShowMissionForm(false)
      setSelectedMission(null)
      setSelectedDate('')
      setMissionValue(null)
      
      alert('미션이 성공적으로 기록되었습니다!')
      
    } catch (error) {
      console.error('미션 기록 실패:', error)
      alert('미션 기록에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openMissionForm = (mission: Mission) => {
    setSelectedMission(mission)
    setShowMissionForm(true)
    setSelectedDate('')
    setMissionValue(mission.mission_type === 'boolean' ? true : 0)
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
                  <p className="text-2xl font-bold text-purple-600">{user?.id ? participants.findIndex(p => p.user_id === user.id) + 1 : '-'}</p>
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
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          mission.mission_type === 'boolean' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {mission.mission_type === 'boolean' ? '완료형' : '숫자형'}
                        </span>
                        {mission.input_restriction === 'flexible' && (
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                            지연입력 가능
                          </span>
                        )}
                      </div>
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

            {/* 과거 미션 입력 */}
            {getFlexibleMissions().length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">과거 미션 입력</h3>
                <p className="text-sm text-gray-600 mb-4">지연입력 가능한 미션을 과거 날짜에 기록할 수 있습니다.</p>
                
                <div className="space-y-3">
                  {getFlexibleMissions().map((mission) => (
                    <div key={mission.id} className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-800">{mission.title}</h4>
                          <p className="text-sm text-gray-600">{mission.description}</p>
                        </div>
                        <button
                          onClick={() => openMissionForm(mission)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                        >
                          기록하기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 미션 입력 모달 */}
            {showMissionForm && selectedMission && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    과거 미션 입력: {selectedMission.title}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* 날짜 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        날짜 선택
                      </label>
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="">날짜를 선택하세요</option>
                        {getPastDates().map((date) => (
                          <option
                            key={date}
                            value={date}
                            disabled={hasLogForDate(selectedMission.id, date)}
                          >
                            {new Date(date).toLocaleDateString('ko-KR')}
                            {hasLogForDate(selectedMission.id, date) && ' (완료됨)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 미션 값 입력 */}
                    {selectedMission.mission_type === 'number' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수량 입력
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={missionValue || ''}
                          onChange={(e) => setMissionValue(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="수량을 입력하세요"
                        />
                      </div>
                    )}

                    {/* 버튼 */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowMissionForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleMissionSubmit}
                        disabled={!selectedDate || isSubmitting}
                        className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? '기록 중...' : '기록하기'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  {challenge.prize_distribution && Array.isArray(challenge.prize_distribution) && challenge.prize_distribution.map((percentage, index) => {
                    const rank = index + 1
                    const amount = Math.floor((challenge.entry_fee * participants.length) * (percentage / 100))
                    return (
                      <div key={rank} className="flex justify-between text-sm">
                        <span>{rank}등</span>
                        <div className="text-right">
                          <span className="font-semibold">{amount.toLocaleString()}원</span>
                          <span className="text-gray-500 ml-2">({percentage}%)</span>
                        </div>
                      </div>
                    )
                  })}
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