import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Medal, Award, TrendingUp, Calendar, Users, Target, Star, Crown } from 'lucide-react'
import { challengeAPI } from '../lib/supabase'
import { ScoringSystem } from '../lib/scoring'
import { useAuth } from '../contexts/AuthContext'

interface Challenge {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  status: string
  max_participants: number
  entry_fee: number
  prize_distribution?: any
  scoring_method?: any
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
  missions: {
    title: string
    mission_type: string
  }
  users: {
    nickname: string
    profile_id: number
  }
}

interface ChallengeResultData {
  challenge: Challenge
  participants: Participant[]
  missions: Mission[]
  logs: MissionLog[]
}

const ChallengeResults = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [resultData, setResultData] = useState<ChallengeResultData | null>(null)
  const [rankings, setRankings] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadResultData()
    }
  }, [id])

  const loadResultData = async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      const result = await challengeAPI.getChallengeResults(id)
      
      if (result.error || !result.data) {
        navigate('/dashboard')
        return
      }

      const data = result.data
      setResultData(data)

      // 점수 계산 및 순위 생성
      if (data.challenge.scoring_method) {
        const scoringSystem = new ScoringSystem(
          data.missions,
          data.challenge.scoring_method,
          data.challenge.start_date,
          data.challenge.end_date
        )

        const userIds = data.participants.map(p => p.user_id)
        const participantRankings = scoringSystem.calculateRankings(data.logs, userIds)

        // 사용자 정보와 매핑
        const enrichedRankings = participantRankings.map(ranking => {
          const participant = data.participants.find(p => p.user_id === ranking.user_id)
          return {
            ...ranking,
            nickname: participant?.users.nickname || '',
            profileId: participant?.users.profile_id || 1,
            userId: ranking.user_id,
            totalScore: ranking.total_score,
            streakDays: ranking.current_streak,
            completionRate: ranking.completion_rate
          }
        })

        setRankings(enrichedRankings)

        // 전체 통계 계산
        const totalMissions = data.missions.length
        const totalDays = Math.ceil((new Date(data.challenge.end_date).getTime() - new Date(data.challenge.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
        const totalPossibleLogs = data.participants.length * totalMissions * totalDays
        const actualLogs = data.logs.length
        const avgCompletionRate = (actualLogs / totalPossibleLogs) * 100

        setStats({
          totalParticipants: data.participants.length,
          totalMissions,
          totalDays,
          avgCompletionRate,
          totalLogs: actualLogs,
          winner: participantRankings[0]
        })
      }

    } catch (error) {
      console.error('결과 데이터 로드 실패:', error)
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const getProfileEmoji = (profileId: number) => {
    const emojis = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐻', '🐷', '🐯', '🐨']
    return emojis[profileId - 1] || '🐱'
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />
      case 2: return <Medal className="w-6 h-6 text-gray-400" />
      case 3: return <Award className="w-6 h-6 text-amber-600" />
      default: return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  const calculatePrizeDistribution = () => {
    if (!resultData?.challenge.prize_distribution || !rankings.length) return []
    
    const totalPrize = resultData.challenge.entry_fee * resultData.participants.length
    const distribution = resultData.challenge.prize_distribution
    
    return rankings.map((ranking, index) => {
      const rank = index + 1
      const percentage = distribution[`rank${rank}`] || 0
      const prize = Math.floor(totalPrize * percentage / 100)
      
      return {
        ...ranking,
        rank,
        prize,
        percentage
      }
    }).filter(item => item.prize > 0)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결과를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!resultData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">결과를 찾을 수 없습니다</p>
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

  const prizeDistribution = calculatePrizeDistribution()
  const myRanking = rankings.find(r => r.userId === user?.id)
  const myRank = rankings.findIndex(r => r.userId === user?.id) + 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 mx-4 text-center">
            <h1 className="text-xl font-bold text-gray-800">{resultData.challenge.title}</h1>
            <p className="text-sm text-blue-600 font-medium">🏁 챌린지 완료</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* 우승자 축하 섹션 */}
        {stats.winner && (
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 mb-6 text-center">
            <Crown className="w-12 h-12 text-yellow-800 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-yellow-900 mb-2">🎉 축하합니다! 🎉</h2>
            <div className="flex items-center justify-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-yellow-300 rounded-full flex items-center justify-center">
                {getProfileEmoji(stats.winner.profileId)}
              </div>
              <span className="text-xl font-bold text-yellow-900">{stats.winner.nickname}</span>
            </div>
            <p className="text-yellow-800">
              총 {formatCurrency(stats.winner.totalScore)}점으로 1위를 차지했습니다!
            </p>
            {prizeDistribution[0]?.prize > 0 && (
              <p className="text-lg font-bold text-yellow-900 mt-2">
                🏆 상금: {formatCurrency(prizeDistribution[0].prize)}원
              </p>
            )}
          </div>
        )}

        {/* 내 결과 요약 */}
        {myRanking && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Star className="w-5 h-5 text-indigo-600 mr-2" />
              내 결과
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-indigo-50 rounded-xl">
                <div className="text-2xl font-bold text-indigo-600">{myRank}위</div>
                <div className="text-sm text-gray-600">최종 순위</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{myRanking.totalScore}</div>
                <div className="text-sm text-gray-600">총 점수</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{myRanking.streakDays}일</div>
                <div className="text-sm text-gray-600">최대 연속</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">{myRanking.completionRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">달성률</div>
              </div>
            </div>
            {prizeDistribution.find(p => p.rank === myRank)?.prize > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-xl text-center">
                <p className="text-lg font-bold text-yellow-700">
                  🎁 상금: {formatCurrency(prizeDistribution.find(p => p.rank === myRank)!.prize)}원
                </p>
              </div>
            )}
          </div>
        )}

        {/* 최종 순위 및 상금 배분 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Trophy className="w-5 h-5 text-yellow-600 mr-2" />
            최종 순위 및 상금 배분
          </h3>
          <div className="space-y-3">
            {rankings.map((ranking, index) => {
              const rank = index + 1
              const prize = prizeDistribution.find(p => p.rank === rank)
              
              return (
                <div
                  key={ranking.userId}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' : 'bg-gray-50'
                  } ${ranking.userId === user?.id ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(rank)}
                    </div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      {getProfileEmoji(ranking.profileId)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {ranking.nickname}
                        {ranking.userId === user?.id && (
                          <span className="text-indigo-600 text-sm ml-1">(나)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ranking.streakDays}일 연속 • {ranking.completionRate.toFixed(1)}% 달성
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(ranking.totalScore)}</p>
                    {prize && prize.prize > 0 && (
                      <p className="text-sm font-medium text-green-600">
                        +{formatCurrency(prize.prize)}원
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 챌린지 통계 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
            챌린지 통계
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{stats.totalParticipants}</div>
              <div className="text-sm text-gray-600">참여자</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.totalMissions}</div>
              <div className="text-sm text-gray-600">미션 수</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{stats.totalDays}</div>
              <div className="text-sm text-gray-600">진행 일수</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{stats.avgCompletionRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">평균 달성률</div>
            </div>
          </div>
        </div>

        {/* 챌린지 정보 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">챌린지 정보</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>진행 기간</span>
              <span className="font-medium">
                {new Date(resultData.challenge.start_date).toLocaleDateString()} ~ 
                {new Date(resultData.challenge.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>총 상금 풀</span>
              <span className="font-medium text-green-600">
                {formatCurrency(resultData.challenge.entry_fee * resultData.participants.length)}원
              </span>
            </div>
            <div className="flex justify-between">
              <span>참가비</span>
              <span className="font-medium">{formatCurrency(resultData.challenge.entry_fee)}원</span>
            </div>
            <div className="flex justify-between">
              <span>전체 미션 기록</span>
              <span className="font-medium">{stats.totalLogs}개</span>
            </div>
          </div>
        </div>

        {/* 네비게이션 버튼들 */}
        <div className="mt-6 flex flex-col space-y-3">
          <button
            onClick={() => navigate(`/challenge/${id}/ranking`)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            상세 순위 보기
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChallengeResults 