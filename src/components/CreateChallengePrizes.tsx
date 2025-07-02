import { useState, useEffect } from 'react'
import { ArrowLeft, DollarSign, Users, Trophy, Zap, Check, Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { challengeAPI, missionAPI } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Mission {
  id: string
  title: string
  description: string
  missionType: 'boolean' | 'number'
  inputRestriction: 'same_day_only' | 'flexible'
  successConditions: string
}

interface ChallengeBasicInfo {
  title: string
  description: string
  maxParticipants: number
  startDate: string
  durationDays: number
}

interface ScoringCriteria {
  consistencyWeight: number
  volumeWeight: number
  qualityWeight: number
  streakBonus: number
  enableQualityScore: boolean
}

interface PrizeSettings {
  entryFee: number
  distributionType: 'auto' | 'manual'
  prizeDistribution: number[] // 순위별 배분 비율 (%)
}

const CreateChallengePrizes = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [basicInfo, setBasicInfo] = useState<ChallengeBasicInfo | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [scoring, setScoring] = useState<ScoringCriteria | null>(null)
  const [prizes, setPrizes] = useState<PrizeSettings>({
    entryFee: 10000,
    distributionType: 'auto',
    prizeDistribution: [50, 30, 20] // 1등 50%, 2등 30%, 3등 20%
  })
  const [isCreating, setIsCreating] = useState(false)
  const [challengeCode, setChallengeCode] = useState<string | null>(null)

  useEffect(() => {
    // 이전 단계 데이터 로드
    const savedBasicInfo = localStorage.getItem('challengeBasicInfo')
    const savedMissions = localStorage.getItem('challengeMissions')
    const savedScoring = localStorage.getItem('challengeScoring')
    
    if (savedBasicInfo && savedMissions && savedScoring) {
      setBasicInfo(JSON.parse(savedBasicInfo))
      setMissions(JSON.parse(savedMissions))
      setScoring(JSON.parse(savedScoring))
    } else {
      // 이전 단계 데이터가 없으면 첫 번째 단계로 리다이렉트
      navigate('/create-challenge')
    }
  }, [navigate])

  const updatePrizeDistribution = (index: number, value: number) => {
    setPrizes(prev => {
      const newDistribution = [...prev.prizeDistribution]
      newDistribution[index] = value
      
      // 자동 조정: 총합이 100%가 되도록 다른 순위들 조정
      const total = newDistribution.reduce((sum, val) => sum + val, 0)
      if (total !== 100) {
        const excess = total - 100
        const otherIndices = newDistribution.map((_, i) => i).filter(i => i !== index)
        
        // 다른 순위들에서 초과분만큼 비례적으로 차감
        otherIndices.forEach(i => {
          const adjustment = (newDistribution[i] / (total - newDistribution[index])) * excess
          newDistribution[i] = Math.max(0, Math.round(newDistribution[i] - adjustment))
        })
        
        // 반올림 오차 보정
        const finalTotal = newDistribution.reduce((sum, val) => sum + val, 0)
        if (finalTotal !== 100) {
          const diff = 100 - finalTotal
          newDistribution[0] += diff // 1등에게 차이만큼 조정
        }
      }
      
      return {
        ...prev,
        prizeDistribution: newDistribution
      }
    })
  }

  const setAutoDistribution = () => {
    const participants = basicInfo?.maxParticipants || 3
    let distribution: number[] = []
    
    if (participants === 1) {
      distribution = [100]
    } else if (participants === 2) {
      distribution = [70, 30]
    } else if (participants === 3) {
      distribution = [50, 30, 20]
    } else if (participants === 4) {
      distribution = [40, 30, 20, 10]
    } else if (participants >= 5) {
      distribution = [40, 25, 20, 10, 5]
      // 5명 이상일 때는 나머지는 0%
      while (distribution.length < participants) {
        distribution.push(0)
      }
    }
    
    setPrizes(prev => ({
      ...prev,
      prizeDistribution: distribution
    }))
  }

  const handleCreateChallenge = async () => {
    if (!basicInfo || !missions || !scoring || !user?.id) {
      alert('로그인이 필요합니다.')
      return
    }
    
    setIsCreating(true)
    
    try {
      // 챌린지 생성
      const challengeData = {
        title: basicInfo.title,
        description: basicInfo.description,
        creator_id: user.id,
        max_participants: basicInfo.maxParticipants,
        start_date: basicInfo.startDate,
        duration_days: basicInfo.durationDays,
        entry_fee: prizes.entryFee,
        prize_distribution: prizes.prizeDistribution,
        scoring_method: {
          consistency: scoring.consistencyWeight,
          volume: scoring.volumeWeight,
          quality: scoring.qualityWeight,
          streak_bonus: scoring.streakBonus,
          enable_quality: scoring.enableQualityScore
        },
        status: 'planning' as const
      }

      const challengeResult = await challengeAPI.createChallenge(challengeData)
      if (challengeResult.error || !challengeResult.data) {
        throw new Error('챌린지 생성 실패')
      }
      
      // 미션 생성
      for (const mission of missions) {
        await missionAPI.createMission({
          challenge_id: challengeResult.data.id,
          title: mission.title,
          description: mission.description,
          mission_type: mission.missionType,
          input_restriction: mission.inputRestriction,
          success_conditions: mission.successConditions,
          order_index: missions.indexOf(mission)
        })
      }
      
      setChallengeCode(challengeResult.data.challenge_code)
      
      // 로컬스토리지 임시 데이터 정리
      localStorage.removeItem('challengeBasicInfo')
      localStorage.removeItem('challengeMissions')
      localStorage.removeItem('challengeScoring')
      
    } catch (error) {
      console.error('챌린지 생성 실패:', error)
      alert('챌린지 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('코드가 복사되었습니다!')
    } catch (err) {
      // 폴백: 텍스트 선택
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('코드가 복사되었습니다!')
    }
  }

  const handleBack = () => {
    navigate('/create-challenge/scoring')
  }

  const handleGoToDashboard = () => {
    navigate('/dashboard')
  }

  if (!basicInfo || missions.length === 0 || !scoring) {
    return <div>로딩 중...</div>
  }

  const totalPrizePool = (basicInfo.maxParticipants * prizes.entryFee)
  const distributionTotal = prizes.prizeDistribution.reduce((sum, val) => sum + val, 0)

  // 챌린지 생성 완료 화면
  if (challengeCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-800 mb-2">챌린지 생성 완료!</h1>
              <p className="text-gray-600 mb-8">친구들과 공유할 챌린지 코드가 생성되었습니다</p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{basicInfo.title}</h3>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">챌린지 코드</p>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-mono text-2xl font-bold tracking-wider">
                      {challengeCode}
                    </div>
                    <button
                      onClick={() => copyToClipboard(challengeCode)}
                      className="p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    친구들이 이 코드로 챌린지에 참여할 수 있습니다
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-blue-600 font-medium">참가비</p>
                  <p className="text-blue-800 font-bold">{prizes.entryFee.toLocaleString()}원</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-purple-600 font-medium">총 상금</p>
                  <p className="text-purple-800 font-bold">{totalPrizePool.toLocaleString()}원</p>
                </div>
              </div>
              
              <button
                onClick={handleGoToDashboard}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
              >
                대시보드로 가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-800">새 챌린지 만들기</h1>
            <p className="text-gray-600">4단계: 상금 설정</p>
          </div>
        </div>

        {/* 진행률 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">진행률</span>
            <span className="text-sm font-medium text-indigo-600">4/4 단계</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full w-full transition-all duration-300"></div>
          </div>
        </div>

        {/* 챌린지 요약 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">챌린지 최종 요약</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">제목:</span>
              <p className="font-medium">{basicInfo.title}</p>
            </div>
            <div>
              <span className="text-gray-600">참여자:</span>
              <p className="font-medium">{basicInfo.maxParticipants}명</p>
            </div>
            <div>
              <span className="text-gray-600">기간:</span>
              <p className="font-medium">{basicInfo.durationDays}일</p>
            </div>
            <div>
              <span className="text-gray-600">주요 미션:</span>
              <p className="font-medium">{missions[0]?.title || '-'}</p>
            </div>
            <div>
              <span className="text-gray-600">평가 방식:</span>
              <p className="font-medium">
                꾸준함 {scoring.consistencyWeight}% + 총량 {scoring.volumeWeight}%
                {scoring.enableQualityScore && ` + 충실도 ${scoring.qualityWeight}%`}
              </p>
            </div>
            <div>
              <span className="text-gray-600">시작일:</span>
              <p className="font-medium">{new Date(basicInfo.startDate).toLocaleDateString('ko-KR')}</p>
            </div>
          </div>
        </div>

        {/* 상금 설정 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">상금 및 배분 설정</h3>
          
          {/* 참가비 설정 */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <DollarSign className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-800">개인별 참가비</h4>
                <p className="text-sm text-gray-600">각 참여자가 내는 참가비를 설정하세요</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1000"
                max="100000"
                step="1000"
                value={prizes.entryFee}
                onChange={(e) => setPrizes(prev => ({ ...prev, entryFee: parseInt(e.target.value) || 0 }))}
                className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-gray-600">원</span>
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-600">총 상금 풀</p>
                <p className="text-xl font-bold text-green-600">
                  {totalPrizePool.toLocaleString()}원
                </p>
              </div>
            </div>
          </div>

          {/* 배분 방식 선택 */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-800">상금 배분 방식</h4>
                <p className="text-sm text-gray-600">순위에 따른 상금 배분 방식을 선택하세요</p>
              </div>
            </div>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => {
                  setPrizes(prev => ({ ...prev, distributionType: 'auto' }))
                  setAutoDistribution()
                }}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  prizes.distributionType === 'auto'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Zap className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                <p className="font-medium text-gray-800">자동 배분</p>
                <p className="text-sm text-gray-600">추천 배분 비율로 자동 설정</p>
              </button>
              <button
                onClick={() => setPrizes(prev => ({ ...prev, distributionType: 'manual' }))}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  prizes.distributionType === 'manual'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Trophy className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                <p className="font-medium text-gray-800">직접 배분</p>
                <p className="text-sm text-gray-600">순위별 비율을 직접 조정</p>
              </button>
            </div>
          </div>

          {/* 순위별 상금 배분 */}
          <div className="mb-8">
            <h4 className="font-medium text-gray-800 mb-4">순위별 상금 배분</h4>
            <div className="space-y-4">
              {Array.from({ length: Math.min(basicInfo.maxParticipants, 5) }, (_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="w-12 text-gray-600">{index + 1}등</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={prizes.prizeDistribution[index] || 0}
                    onChange={(e) => updatePrizeDistribution(index, parseInt(e.target.value))}
                    disabled={prizes.distributionType === 'auto'}
                    className="flex-1 slider"
                  />
                  <div className="flex items-center space-x-2 w-24">
                    <span className="text-lg font-semibold text-indigo-600">
                      {prizes.prizeDistribution[index] || 0}%
                    </span>
                  </div>
                  <div className="w-24 text-right text-sm text-gray-600">
                    {((totalPrizePool * (prizes.prizeDistribution[index] || 0)) / 100).toLocaleString()}원
                  </div>
                </div>
              ))}
              {basicInfo.maxParticipants > 5 && (
                <p className="text-sm text-gray-500">
                  * 6등 이하는 상금이 없습니다
                </p>
              )}
            </div>
            
            {/* 배분 총합 표시 */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">배분 총합:</span>
                <span className={`text-lg font-bold ${
                  distributionTotal === 100 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {distributionTotal}%
                </span>
              </div>
              {distributionTotal !== 100 && (
                <p className="text-sm text-red-600 mt-1">
                  * 배분 총합이 100%가 되도록 조정해주세요
                </p>
              )}
            </div>
          </div>

          {/* 네비게이션 */}
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              이전 단계
            </button>
            <button
              onClick={handleCreateChallenge}
              disabled={distributionTotal !== 100 || isCreating}
              className={`font-semibold py-3 px-8 rounded-lg transition-colors duration-200 ${
                distributionTotal === 100 && !isCreating
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCreating ? '생성 중...' : '챌린지 생성 완료'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateChallengePrizes 