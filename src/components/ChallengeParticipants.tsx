import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Search } from 'lucide-react'
import { challengeAPI, missionAPI, koreaTimeUtils } from '../lib/supabase'
import { ScoringSystem } from '../lib/scoring'

interface Challenge {
  id: string
  title: string
  start_date: string
  end_date: string
  status: string
  scoring_method?: {
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
  mission_type: 'boolean' | 'number'
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

interface MissionLog {
  id: string
  mission_id: string
  user_id: string
  log_date: string
  value: any
  is_late: boolean
}

interface ParticipantProgress {
  participant: Participant
  dailyProgress: Record<string, Record<string, MissionLog>>
  totalCompleted: number
  streak: number
  score: number
  consistency_score: number
  volume_score: number
  quality_score: number
  completion_rate: number
}

const ChallengeParticipants = () => {
  const { code: id } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [allLogs, setAllLogs] = useState<MissionLog[]>([])
  const [participantProgress, setParticipantProgress] = useState<ParticipantProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (id) {
      loadChallengeData()
    }
  }, [id])

  useEffect(() => {
    if (participants.length && missions.length && allLogs.length) {
      calculateParticipantProgress()
    }
  }, [participants, missions, allLogs])

  const loadChallengeData = async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      // id가 UUID 형태인지 6자리 코드인지 확인하여 적절한 API 호출
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      
      let challengeResult
      if (isUUID) {
        // UUID 형태면 ID로 조회
        challengeResult = await challengeAPI.getChallengeById(id)
      } else {
        // 6자리 코드 형태면 코드로 조회
        challengeResult = await challengeAPI.getChallengeByCode(id)
      }
      
      if (challengeResult.error || !challengeResult.data) {
        console.error('챌린지 조회 실패:', challengeResult.error)
        navigate('/dashboard')
        return
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

      // 모든 참여자의 미션 로그 로드
      if (participantsResult.data) {
        const allLogsPromises = participantsResult.data.map(participant =>
          missionAPI.getUserMissionLogs(challengeData.id, participant.user_id)
        )
        
        const allLogsResults = await Promise.all(allLogsPromises)
        const combinedLogs = allLogsResults.flatMap(result => result.data || [])
        setAllLogs(combinedLogs)
      }

    } catch (error) {
      console.error('챌린지 데이터 로드 실패:', error)
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateParticipantProgress = () => {
    if (!challenge?.scoring_method) {
      console.warn('No scoring method found, using simple calculation')
      
      const progress = participants.map(participant => {
        const userLogs = allLogs.filter(log => log.user_id === participant.user_id)
        
        // 날짜별, 미션별로 그룹화
        const dailyProgress: Record<string, Record<string, MissionLog>> = {}
        
        userLogs.forEach(log => {
          if (!dailyProgress[log.log_date]) {
            dailyProgress[log.log_date] = {}
          }
          dailyProgress[log.log_date][log.mission_id] = log
        })

        // 연속 달성일 계산
        const sortedDates = Object.keys(dailyProgress).sort()
        let streak = 0
        const today = koreaTimeUtils.getKoreaToday()
        
        for (let i = sortedDates.length - 1; i >= 0; i--) {
          const date = sortedDates[i]
          if (date <= today) {
            const dayLogs = Object.keys(dailyProgress[date])
            if (dayLogs.length === missions.length) {
              streak++
            } else {
              break
            }
          }
        }

        // 간단한 점수 계산 (fallback)
        const score = userLogs.length * 10 + streak * 50
        const completionRate = missions.length > 0 ? 
          (userLogs.length / (missions.length * Math.max(1, sortedDates.length))) * 100 : 0

        return {
          participant,
          dailyProgress,
          totalCompleted: userLogs.length,
          streak,
          score,
          consistency_score: streak * 10,
          volume_score: completionRate,
          quality_score: 0,
          completion_rate: Math.round(completionRate)
        }
      })

      // 점수순으로 정렬
      progress.sort((a, b) => b.score - a.score)
      setParticipantProgress(progress)
      return
    }

    // ScoringSystem 사용
    const scoringSystem = new ScoringSystem(
      missions,
      challenge.scoring_method,
      challenge.start_date,
      challenge.end_date
    )

    const userIds = participants.map(p => p.user_id)
    const rankings = scoringSystem.calculateRankings(allLogs, userIds)

    const progress = participants.map(participant => {
      const userLogs = allLogs.filter(log => log.user_id === participant.user_id)
      const userRanking = rankings.find(r => r.user_id === participant.user_id)
      
      // 날짜별, 미션별로 그룹화
      const dailyProgress: Record<string, Record<string, MissionLog>> = {}
      
      userLogs.forEach(log => {
        if (!dailyProgress[log.log_date]) {
          dailyProgress[log.log_date] = {}
        }
        dailyProgress[log.log_date][log.mission_id] = log
      })

      return {
        participant,
        dailyProgress,
        totalCompleted: userRanking?.total_completed || userLogs.length,
        streak: userRanking?.current_streak || 0,
        score: userRanking?.total_score || 0,
        consistency_score: userRanking?.consistency_score || 0,
        volume_score: userRanking?.volume_score || 0,
        quality_score: userRanking?.quality_score || 0,
        completion_rate: userRanking?.completion_rate || 0
      }
    })

    // 점수순으로 정렬
    progress.sort((a, b) => b.score - a.score)
    setParticipantProgress(progress)
  }

  const getDatesInRange = () => {
    if (!challenge) return []
    
    const startDate = new Date(challenge.start_date)
    const endDate = new Date(challenge.end_date)
    const dates = []
    
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate).toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }

  const getProfileEmoji = (profileId: number) => {
    const emojis = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐻', '🐷', '🐯', '🐨']
    return emojis[profileId - 1] || '🐱'
  }

  const getMissionStatusIcon = (progress: ParticipantProgress, date: string, missionId: string, isCompact = false) => {
    const dayProgress = progress.dailyProgress[date]
    const missionLog = dayProgress?.[missionId]
    
    const iconSize = isCompact ? 'w-5 h-5' : 'w-6 h-6'
    const textSize = isCompact ? 'text-xs' : 'text-xs'
    
    if (!missionLog) {
      return <div className={`${iconSize} bg-gray-200 rounded-full`}></div>
    }
    
    const isLate = missionLog.is_late
    const mission = missions.find(m => m.id === missionId)
    
    if (mission?.mission_type === 'boolean') {
      return (
        <div className={`${iconSize} rounded-full flex items-center justify-center text-white ${textSize} font-bold ${
          isLate ? 'bg-orange-500' : 'bg-green-500'
        }`}>
          ✓
        </div>
      )
    } else {
      return (
        <div className={`${iconSize} rounded-full flex items-center justify-center text-white ${textSize} font-bold ${
          isLate ? 'bg-orange-500' : 'bg-blue-500'
        }`}>
          {missionLog.value?.count || 0}
        </div>
      )
    }
  }

  const filteredProgress = participantProgress.filter(progress => 
    progress.participant.users.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const dates = getDatesInRange()
  
  // 오늘을 기준으로 한 최근 7일 계산
  const getRecentDates = () => {
    const today = koreaTimeUtils.getKoreaToday()
    const todayIndex = dates.indexOf(today)
    
    if (todayIndex >= 0) {
      // 오늘이 챌린지 기간 내에 있는 경우
      const startIndex = Math.max(0, todayIndex - 6) // 7일 전부터
      return dates.slice(startIndex, todayIndex + 1)
    } else {
      // 오늘이 챌린지 기간을 벗어난 경우
      const challengeEndDate = challenge?.end_date
      if (challengeEndDate && today > challengeEndDate) {
        // 챌린지가 끝난 경우 - 마지막 7일
        return dates.slice(-7)
      } else {
        // 챌린지가 아직 시작 안한 경우 - 처음 7일
        return dates.slice(0, 7)
      }
    }
  }

  const getVisibleDates = () => {
    if (!selectedDate) {
      return getRecentDates() // 기본: 최근 7일
    } else if (selectedDate === 'all') {
      return dates // 전체 기간
    } else {
      return [selectedDate] // 특정 날짜
    }
  }

  const visibleDates = getVisibleDates()

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/challenge/${id}/overview`)}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 truncate mx-4">참여자 현황</h1>
          <div className="flex space-x-2">
            <button
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
              title="Excel 다운로드"
            >
              <Download className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{challenge.title}</h2>
              <p className="text-gray-600">{participants.length}명 참여 • {missions.length}개 미션</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="참여자 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              {/* 날짜 필터 */}
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">최근 7일</option>
                <option value="all">전체 기간</option>
                <optgroup label="특정 날짜">
                  {dates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString()}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* 참여자 순위 요약 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">현재 순위</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredProgress.slice(0, 3).map((progress, index) => (
              <div key={progress.participant.id} className={`p-4 rounded-lg border-2 ${
                index === 0 ? 'border-yellow-300 bg-yellow-50' :
                index === 1 ? 'border-gray-300 bg-gray-50' :
                'border-amber-300 bg-amber-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    'bg-amber-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg">
                    {getProfileEmoji(progress.participant.users.profile_id)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{progress.participant.users.nickname}</p>
                    <p className="text-sm text-gray-600">{progress.score}점 • {progress.streak}일 연속</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 진행상황 테이블 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {selectedDate === 'all' && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">
                  전체 기간 표시 중 ({dates.length}일) • 좌우로 스크롤하여 모든 날짜를 확인하세요
                </span>
              </div>
            </div>
          )}
          <div className={`overflow-x-auto ${selectedDate === 'all' ? 'max-h-96 overflow-y-auto' : ''}`}>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                    순위
                  </th>
                  <th className="sticky left-16 bg-gray-50 px-6 py-4 text-left text-sm font-semibold text-gray-700 border-r border-gray-200">
                    참여자
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200">
                    점수
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200">
                    연속
                  </th>
                  {visibleDates.map(date => (
                    <th key={date} className={`px-2 py-4 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 ${
                      selectedDate === 'all' ? 'min-w-12' : 'min-w-20'
                    }`}>
                      <div>{new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                      {selectedDate !== 'all' && (
                        <div className="text-gray-500">{new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' })}</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProgress.map((progress, index) => (
                  <tr key={progress.participant.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-6 py-4 border-r border-gray-200">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="sticky left-16 bg-white px-6 py-4 border-r border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          {getProfileEmoji(progress.participant.users.profile_id)}
                        </div>
                        <span className="font-medium text-gray-800">{progress.participant.users.nickname}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center border-r border-gray-200">
                      <span className="font-semibold text-indigo-600">{progress.score}</span>
                    </td>
                    <td className="px-4 py-4 text-center border-r border-gray-200">
                      <span className="font-semibold text-orange-600">{progress.streak}일</span>
                    </td>
                    {visibleDates.map(date => (
                      <td key={date} className={`border-r border-gray-200 ${
                        selectedDate === 'all' ? 'px-1 py-2' : 'px-2 py-4'
                      }`}>
                        <div className={`flex flex-col items-center ${
                          selectedDate === 'all' ? 'space-y-0.5' : 'space-y-1'
                        }`}>
                          {missions.map(mission => (
                            <div key={mission.id} title={mission.title}>
                              {getMissionStatusIcon(progress, date, mission.id, selectedDate === 'all')}
                            </div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 범례 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">범례</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`bg-green-500 rounded-full flex items-center justify-center text-white text-xs ${selectedDate === 'all' ? 'w-5 h-5' : 'w-6 h-6'}`}>✓</div>
              <span className="text-sm text-gray-600">완료형 미션 (정시)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`bg-orange-500 rounded-full flex items-center justify-center text-white text-xs ${selectedDate === 'all' ? 'w-5 h-5' : 'w-6 h-6'}`}>✓</div>
              <span className="text-sm text-gray-600">완료형 미션 (지연)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold ${selectedDate === 'all' ? 'w-5 h-5' : 'w-6 h-6'}`}>5</div>
              <span className="text-sm text-gray-600">숫자형 미션 (정시)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`bg-gray-200 rounded-full ${selectedDate === 'all' ? 'w-5 h-5' : 'w-6 h-6'}`}></div>
              <span className="text-sm text-gray-600">미완료</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChallengeParticipants 