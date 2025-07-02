import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Medal, Award, Crown, Zap, Target, Clock } from 'lucide-react'
import { challengeAPI, missionAPI } from '../lib/supabase'
import { ScoringSystem } from '../lib/scoring'

interface Challenge {
  id: string
  title: string
  start_date: string
  end_date: string
  duration_days: number
  scoring_method: {
    consistency: number
    volume: number
    quality: number
    streak_bonus: number
    enable_quality: boolean
  }
  prize_distribution: Record<string, number>
  entry_fee: number
}

interface Mission {
  id: string
  title: string
  mission_type: 'boolean' | 'number'
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

interface ParticipantScore {
  user_id: string
  consistency_score: number
  volume_score: number
  quality_score: number
  streak_bonus_score: number
  total_score: number
  current_streak: number
  max_streak: number
  total_completed: number
  completion_rate: number
  late_submissions: number
  daily_completion_rate: Record<string, number>
}

const ChallengeRanking = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [rankings, setRankings] = useState<ParticipantScore[]>([])
  const [selectedTab, setSelectedTab] = useState<'ranking' | 'statistics'>('ranking')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
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
        
        // 모든 미션 로그 로드
        const allLogs: MissionLog[] = []
        for (const participant of participantsResult.data) {
          const logsResult = await missionAPI.getUserMissionLogs(participant.user_id, challengeData.id)
          if (logsResult.data) {
            allLogs.push(...logsResult.data)
          }
        }

        // 점수 계산 및 순위 매기기
        if (missionsResult.data) {
          const scoringSystem = new ScoringSystem(
            missionsResult.data,
            challengeData.scoring_method,
            challengeData.start_date,
            challengeData.end_date
          )
          
          const userIds = participantsResult.data.map(p => p.user_id)
          const calculatedRankings = scoringSystem.calculateRankings(allLogs, userIds)
          setRankings(calculatedRankings)
        }
      }

    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getParticipantNickname = (userId: string) => {
    const participant = participants.find(p => p.user_id === userId)
    return participant?.users.nickname || '알 수 없음'
  }

  const getProfileId = (userId: string) => {
    const participant = participants.find(p => p.user_id === userId)
    return participant?.users.profile_id || 0
  }

  const getProfileEmoji = (profileId: number) => {
    const profiles = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯']
    return profiles[profileId] || '🐶'
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />
      case 2: return <Medal className="w-6 h-6 text-gray-400" />
      case 3: return <Award className="w-6 h-6 text-amber-600" />
      default: return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-400'
      case 3: return 'bg-gradient-to-r from-amber-500 to-amber-600'
      default: return 'bg-gray-100'
    }
  }

  const calculatePrizeAmount = (rank: number) => {
    if (!challenge) return 0
    const totalPool = challenge.entry_fee * participants.length
    const percentage = challenge.prize_distribution[rank.toString()] || 0
    return Math.floor(totalPool * (percentage / 100))
  }

  const getDaysFromStart = () => {
    if (!challenge) return 0
    const start = new Date(challenge.start_date)
    const today = new Date()
    const diffTime = today.getTime() - start.getTime()
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
    return Math.min(diffDays, challenge.duration_days)
  }

  const getSelectedUserStats = () => {
    if (!selectedUser) return null
    return rankings.find(r => r.user_id === selectedUser)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">순위를 계산하는 중...</p>
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
          <h1 className="text-xl font-bold text-gray-800 truncate mx-4">순위 및 통계</h1>
          <div className="w-10"></div>
        </div>

        {/* 탭 선택 */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6">
          <div className="flex">
            <button
              onClick={() => setSelectedTab('ranking')}
              className={`flex-1 py-3 px-4 rounded-xl text-center font-medium transition-colors ${
                selectedTab === 'ranking'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Trophy className="w-5 h-5 inline mr-2" />
              실시간 순위
            </button>
            <button
              onClick={() => setSelectedTab('statistics')}
              className={`flex-1 py-3 px-4 rounded-xl text-center font-medium transition-colors ${
                selectedTab === 'statistics'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Target className="w-5 h-5 inline mr-2" />
              상세 통계
            </button>
          </div>
        </div>

        {selectedTab === 'ranking' && (
          <div className="space-y-6">
            {/* 챌린지 진행 현황 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">챌린지 진행 현황</h3>
                <div className="text-sm text-gray-500">
                  {getDaysFromStart()}일 / {challenge.duration_days}일
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{participants.length}</div>
                  <div className="text-sm text-gray-600">참여자</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{missions.length}</div>
                  <div className="text-sm text-gray-600">미션</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{getDaysFromStart()}</div>
                  <div className="text-sm text-gray-600">진행일</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(challenge.entry_fee * participants.length).toLocaleString()}원
                  </div>
                  <div className="text-sm text-gray-600">상금풀</div>
                </div>
              </div>
            </div>

            {/* TOP 3 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">🏆 TOP 3</h3>
              
              <div className="flex items-end justify-center space-x-4 mb-6">
                {rankings.slice(0, 3).map((participant, index) => {
                  const rank = index + 1
                  const nickname = getParticipantNickname(participant.user_id)
                  const profileEmoji = getProfileEmoji(getProfileId(participant.user_id))
                  const prizeAmount = calculatePrizeAmount(rank)
                  
                  return (
                    <div key={participant.user_id} className={`text-center ${rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'}`}>
                      <div className={`relative ${rank === 1 ? 'h-24' : rank === 2 ? 'h-20' : 'h-16'} mb-3`}>
                        <div className={`w-full h-full ${getRankColor(rank)} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}>
                          <div className="text-center">
                            <div className="text-2xl">{profileEmoji}</div>
                            <div className="text-xs mt-1">{rank}등</div>
                          </div>
                        </div>
                        {rank === 1 && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Crown className="w-8 h-8 text-yellow-500" />
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-gray-800">{nickname}</div>
                      <div className="text-sm text-indigo-600 font-medium">{participant.total_score}점</div>
                      {prizeAmount > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          {prizeAmount.toLocaleString()}원
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 전체 순위 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">전체 순위</h3>
              
              <div className="space-y-3">
                {rankings.map((participant, index) => {
                  const rank = index + 1
                  const nickname = getParticipantNickname(participant.user_id)
                  const profileEmoji = getProfileEmoji(getProfileId(participant.user_id))
                  const prizeAmount = calculatePrizeAmount(rank)
                  
                  return (
                    <div
                      key={participant.user_id}
                      className={`flex items-center p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                        rank <= 3 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedUser(participant.user_id)}
                    >
                      <div className="flex-shrink-0 mr-4">
                        {getRankIcon(rank)}
                      </div>
                      
                      <div className="flex-shrink-0 mr-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">{profileEmoji}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{nickname}</div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>🔥 {participant.current_streak}일</span>
                          <span>✅ {participant.completion_rate}%</span>
                          <span>📊 {participant.total_score}점</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-indigo-600">{participant.total_score}점</div>
                        {prizeAmount > 0 && (
                          <div className="text-sm text-green-600">{prizeAmount.toLocaleString()}원</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'statistics' && (
          <div className="space-y-6">
            {/* 사용자 선택 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">통계 보기</h3>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">참여자를 선택하세요</option>
                {rankings.map((participant, index) => (
                  <option key={participant.user_id} value={participant.user_id}>
                    {index + 1}위 - {getParticipantNickname(participant.user_id)}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && getSelectedUserStats() && (
              <>
                {/* 개인 통계 대시보드 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-xl">{getProfileEmoji(getProfileId(selectedUser))}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {getParticipantNickname(selectedUser)}
                      </h3>
                      <div className="text-sm text-gray-600">
                        현재 {rankings.findIndex(r => r.user_id === selectedUser) + 1}위
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {getSelectedUserStats()!.current_streak}
                      </div>
                      <div className="text-sm text-gray-600">현재 연속일</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {getSelectedUserStats()!.total_completed}
                      </div>
                      <div className="text-sm text-gray-600">총 완료</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {getSelectedUserStats()!.completion_rate}%
                      </div>
                      <div className="text-sm text-gray-600">완료율</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {getSelectedUserStats()!.total_score}
                      </div>
                      <div className="text-sm text-gray-600">총점</div>
                    </div>
                  </div>
                </div>

                {/* 점수 구성 분석 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">점수 구성 분석</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">꾸준함</div>
                          <div className="text-sm text-gray-600">가중치 {challenge.scoring_method.consistency}%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">
                          {Math.round(getSelectedUserStats()!.consistency_score * challenge.scoring_method.consistency / 100)}점
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.round(getSelectedUserStats()!.consistency_score)}점 → 가중치 적용
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Target className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">총량</div>
                          <div className="text-sm text-gray-600">가중치 {challenge.scoring_method.volume}%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {Math.round(getSelectedUserStats()!.volume_score * challenge.scoring_method.volume / 100)}점
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.round(getSelectedUserStats()!.volume_score)}점 → 가중치 적용
                        </div>
                      </div>
                    </div>

                    {challenge.scoring_method.enable_quality && (
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <Award className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">충실도</div>
                            <div className="text-sm text-gray-600">가중치 {challenge.scoring_method.quality}%</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">
                            {Math.round(getSelectedUserStats()!.quality_score * challenge.scoring_method.quality / 100)}점
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.round(getSelectedUserStats()!.quality_score)}점 → 가중치 적용
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">연속 달성 보너스</div>
                          <div className="text-sm text-gray-600">
                            {getSelectedUserStats()!.current_streak}일 × {challenge.scoring_method.streak_bonus}점
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-yellow-600">
                          +{getSelectedUserStats()!.streak_bonus_score}점
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span className="text-gray-800">최종 점수</span>
                      <span className="text-indigo-600">{getSelectedUserStats()!.total_score}점</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChallengeRanking
