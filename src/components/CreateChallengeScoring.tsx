import { useState, useEffect } from 'react'
import { ArrowLeft, BarChart3, TrendingUp, Star, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
  consistencyWeight: number    // 꾸준함 (연속 달성) 가중치
  volumeWeight: number        // 총량 (누적 달성) 가중치
  qualityWeight: number       // 충실도 (질적 평가) 가중치
  streakBonus: number         // 연속 달성 보너스
  enableQualityScore: boolean // 충실도 평가 활성화 여부
}

const CreateChallengeScoring = () => {
  const navigate = useNavigate()
  const [basicInfo, setBasicInfo] = useState<ChallengeBasicInfo | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [scoring, setScoring] = useState<ScoringCriteria>({
    consistencyWeight: 50,
    volumeWeight: 30,
    qualityWeight: 20,
    streakBonus: 10,
    enableQualityScore: false
  })

  useEffect(() => {
    // 이전 단계 데이터 로드
    const savedBasicInfo = localStorage.getItem('challengeBasicInfo')
    const savedMissions = localStorage.getItem('challengeMissions')
    
    if (savedBasicInfo && savedMissions) {
      setBasicInfo(JSON.parse(savedBasicInfo))
      setMissions(JSON.parse(savedMissions))
    } else {
      // 이전 단계 데이터가 없으면 첫 번째 단계로 리다이렉트
      navigate('/create-challenge')
    }
  }, [navigate])

  const updateWeight = (field: keyof ScoringCriteria, value: number) => {
    setScoring(prev => {
      const newScoring = { ...prev, [field]: value }
      
      // 가중치 자동 조정 (총합 100% 유지)
      if (field === 'consistencyWeight' || field === 'volumeWeight' || field === 'qualityWeight') {
        const total = newScoring.consistencyWeight + newScoring.volumeWeight + newScoring.qualityWeight
        if (total > 100) {
          // 초과된 만큼 다른 가중치에서 차감
          const excess = total - 100
          if (field !== 'consistencyWeight') {
            newScoring.consistencyWeight = Math.max(0, newScoring.consistencyWeight - excess / 2)
          }
          if (field !== 'volumeWeight') {
            newScoring.volumeWeight = Math.max(0, newScoring.volumeWeight - excess / 2)
          }
          if (field !== 'qualityWeight' && newScoring.enableQualityScore) {
            newScoring.qualityWeight = Math.max(0, newScoring.qualityWeight - excess / 2)
          }
        }
      }
      
      return newScoring
    })
  }

  const toggleQualityScore = () => {
    setScoring(prev => {
      if (!prev.enableQualityScore) {
        // 충실도 평가 활성화 시 가중치 재분배
        return {
          ...prev,
          enableQualityScore: true,
          consistencyWeight: 40,
          volumeWeight: 30,
          qualityWeight: 30
        }
      } else {
        // 충실도 평가 비활성화 시 가중치 재분배
        return {
          ...prev,
          enableQualityScore: false,
          consistencyWeight: 60,
          volumeWeight: 40,
          qualityWeight: 0
        }
      }
    })
  }

  const handleNext = () => {
    // 평가 기준 데이터 저장하고 다음 단계로
    localStorage.setItem('challengeScoring', JSON.stringify(scoring))
    navigate('/create-challenge/prizes')
  }

  const handleBack = () => {
    navigate('/create-challenge/missions')
  }

  if (!basicInfo || missions.length === 0) {
    return <div>로딩 중...</div>
  }

  const totalWeight = scoring.consistencyWeight + scoring.volumeWeight + scoring.qualityWeight

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
            <p className="text-gray-600">3단계: 평가 기준 설정</p>
          </div>
        </div>

        {/* 진행률 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">진행률</span>
            <span className="text-sm font-medium text-indigo-600">3/4 단계</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full w-3/4 transition-all duration-300"></div>
          </div>
        </div>

        {/* 챌린지 요약 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">챌린지 요약</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">제목:</span>
              <p className="font-medium">{basicInfo.title}</p>
            </div>
            <div>
              <span className="text-gray-600">미션 개수:</span>
              <p className="font-medium">{missions.length}개</p>
            </div>
            <div>
              <span className="text-gray-600">주요 미션:</span>
              <p className="font-medium">{missions[0]?.title || '-'}</p>
            </div>
            <div>
              <span className="text-gray-600">기간:</span>
              <p className="font-medium">{basicInfo.durationDays}일</p>
            </div>
          </div>
        </div>

        {/* 평가 기준 설정 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">순위 계산 방식</h3>
          
          {/* 평가 설명 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-800">평가 기준 안내</h4>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>꾸준함</strong>: 연속으로 미션을 달성한 기간을 중시</li>
              <li>• <strong>총량</strong>: 전체 미션 달성 횟수를 중시</li>
              <li>• <strong>충실도</strong>: 미션의 질적 수준을 중시 (선택사항)</li>
            </ul>
          </div>

          {/* 가중치 설정 */}
          <div className="space-y-8">
            {/* 꾸준함 가중치 */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-800">꾸준함 (연속 달성)</h4>
                  <p className="text-sm text-gray-600">며칠 연속으로 미션을 달성했는지 평가</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoring.consistencyWeight}
                  onChange={(e) => updateWeight('consistencyWeight', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-green-600">
                    {scoring.consistencyWeight}%
                  </span>
                </div>
              </div>
            </div>

            {/* 총량 가중치 */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-800">총량 (누적 달성)</h4>
                  <p className="text-sm text-gray-600">전체 기간 동안 달성한 총 횟수 평가</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoring.volumeWeight}
                  onChange={(e) => updateWeight('volumeWeight', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-blue-600">
                    {scoring.volumeWeight}%
                  </span>
                </div>
              </div>
            </div>

            {/* 충실도 가중치 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Star className="w-6 h-6 text-purple-600" />
                  <div>
                    <h4 className="font-medium text-gray-800">충실도 (질적 평가)</h4>
                    <p className="text-sm text-gray-600">미션의 질적 수준을 참여자들이 상호 평가</p>
                  </div>
                </div>
                <button
                  onClick={toggleQualityScore}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    scoring.enableQualityScore
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {scoring.enableQualityScore ? '활성화' : '비활성화'}
                </button>
              </div>
              
              {scoring.enableQualityScore && (
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scoring.qualityWeight}
                    onChange={(e) => updateWeight('qualityWeight', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-purple-600">
                      {scoring.qualityWeight}%
                    </span>
                  </div>
                </div>
              )}
              
              {!scoring.enableQualityScore && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  질적 평가를 비활성화하면 꾸준함과 총량만으로 순위가 결정됩니다.
                </div>
              )}
            </div>

            {/* 연속 달성 보너스 */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">연속 달성 보너스</h4>
                  <p className="text-sm text-gray-600">7일, 14일, 30일 등 특정 연속 달성 시 추가 점수</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={scoring.streakBonus}
                  onChange={(e) => updateWeight('streakBonus', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-orange-600">
                    {scoring.streakBonus}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 가중치 총합 표시 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">기본 가중치 총합:</span>
              <span className={`text-lg font-bold ${
                totalWeight === 100 ? 'text-green-600' : 'text-red-600'
              }`}>
                {totalWeight}%
              </span>
            </div>
            {totalWeight !== 100 && (
              <p className="text-sm text-red-600 mt-1">
                * 기본 가중치의 총합이 100%가 되도록 조정해주세요
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              연속 달성 보너스는 기본 점수에 추가로 적용됩니다
            </p>
          </div>

          {/* 점수 계산 예시 */}
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h5 className="font-medium text-indigo-800 mb-2">점수 계산 예시</h5>
            <div className="text-sm text-indigo-700">
              <p className="mb-2">
                <strong>A님:</strong> 연속 15일, 총 18일 달성 
                {scoring.enableQualityScore && ', 평균 품질 4.2/5'}
              </p>
              <div className="bg-white p-3 rounded text-indigo-800">
                점수 = (연속일 × {scoring.consistencyWeight}%) + (총달성 × {scoring.volumeWeight}%)
                {scoring.enableQualityScore && ` + (품질 × ${scoring.qualityWeight}%)`}
                + 연속달성보너스({scoring.streakBonus}%)
                <br />
                = (15 × 0.{scoring.consistencyWeight}) + (18 × 0.{scoring.volumeWeight})
                {scoring.enableQualityScore && ` + (4.2 × 0.${scoring.qualityWeight})`}
                + 보너스점수
              </div>
            </div>
          </div>

          {/* 네비게이션 */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              이전 단계
            </button>
            <button
              onClick={handleNext}
              disabled={totalWeight !== 100}
              className={`font-semibold py-3 px-8 rounded-lg transition-colors duration-200 ${
                totalWeight === 100
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              다음 단계
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateChallengeScoring 