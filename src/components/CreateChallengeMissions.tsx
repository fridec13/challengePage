import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
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

const CreateChallengeMissions = () => {
  const navigate = useNavigate()
  const [basicInfo, setBasicInfo] = useState<ChallengeBasicInfo | null>(null)
  const [missions, setMissions] = useState<Mission[]>([
    {
      id: '1',
      title: '',
      description: '',
      missionType: 'boolean',
      inputRestriction: 'same_day_only',
      successConditions: ''
    }
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // 이전 단계 데이터 로드
    const savedBasicInfo = localStorage.getItem('challengeBasicInfo')
    if (savedBasicInfo) {
      setBasicInfo(JSON.parse(savedBasicInfo))
    } else {
      // 이전 단계 데이터가 없으면 첫 번째 단계로 리다이렉트
      navigate('/create-challenge')
    }
  }, [navigate])

  const addMission = () => {
    const newMission: Mission = {
      id: Date.now().toString(),
      title: '',
      description: '',
      missionType: 'boolean',
      inputRestriction: 'same_day_only',
      successConditions: ''
    }
    setMissions(prev => [...prev, newMission])
  }

  const removeMission = (id: string) => {
    if (missions.length > 1) {
      setMissions(prev => prev.filter(mission => mission.id !== id))
      // 해당 미션의 에러도 제거
      setErrors(prev => {
        const newErrors = { ...prev }
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`${id}_`)) {
            delete newErrors[key]
          }
        })
        return newErrors
      })
    }
  }

  const updateMission = (id: string, field: keyof Mission, value: string) => {
    setMissions(prev => prev.map(mission => 
      mission.id === id ? { ...mission, [field]: value } : mission
    ))
    
    // 에러 제거
    const errorKey = `${id}_${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const toggleMissionType = (id: string) => {
    setMissions(prev => prev.map(mission => 
      mission.id === id 
        ? { ...mission, missionType: mission.missionType === 'boolean' ? 'number' : 'boolean' }
        : mission
    ))
  }

  const toggleInputRestriction = (id: string) => {
    setMissions(prev => prev.map(mission => 
      mission.id === id 
        ? { 
            ...mission, 
            inputRestriction: mission.inputRestriction === 'same_day_only' ? 'flexible' : 'same_day_only' 
          }
        : mission
    ))
  }

  const validateMissions = (): boolean => {
    const newErrors: Record<string, string> = {}

    missions.forEach(mission => {
      if (!mission.title.trim()) {
        newErrors[`${mission.id}_title`] = '미션 제목을 입력해주세요'
      } else if (mission.title.length < 2) {
        newErrors[`${mission.id}_title`] = '미션 제목은 최소 2자 이상이어야 합니다'
      }

      if (!mission.successConditions.trim()) {
        newErrors[`${mission.id}_successConditions`] = '성공 조건을 입력해주세요'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateMissions()) {
      // 미션 데이터 저장하고 다음 단계로
      localStorage.setItem('challengeMissions', JSON.stringify(missions))
      navigate('/create-challenge/scoring')
    }
  }

  const handleBack = () => {
    navigate('/create-challenge')
  }

  if (!basicInfo) {
    return <div>로딩 중...</div>
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
            <p className="text-gray-600">2단계: 미션 설정</p>
          </div>
        </div>

        {/* 진행률 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">진행률</span>
            <span className="text-sm font-medium text-indigo-600">2/4 단계</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full w-2/4 transition-all duration-300"></div>
          </div>
        </div>

        {/* 기본 정보 요약 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">챌린지 정보</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">제목:</span>
              <p className="font-medium">{basicInfo.title}</p>
            </div>
            <div>
              <span className="text-gray-600">인원:</span>
              <p className="font-medium">{basicInfo.maxParticipants}명</p>
            </div>
            <div>
              <span className="text-gray-600">시작일:</span>
              <p className="font-medium">{new Date(basicInfo.startDate).toLocaleDateString('ko-KR')}</p>
            </div>
            <div>
              <span className="text-gray-600">기간:</span>
              <p className="font-medium">{basicInfo.durationDays}일</p>
            </div>
          </div>
        </div>

        {/* 미션 설정 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">일일 미션 설정</h3>
            <button
              onClick={addMission}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>미션 추가</span>
            </button>
          </div>

          <div className="space-y-6">
            {missions.map((mission, index) => (
              <div key={mission.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-800">미션 {index + 1}</h4>
                  {missions.length > 1 && (
                    <button
                      onClick={() => removeMission(mission.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 미션 제목 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      미션 제목 *
                    </label>
                    <input
                      type="text"
                      value={mission.title}
                      onChange={(e) => updateMission(mission.id, 'title', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors[`${mission.id}_title`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="예: 블로그 글 작성하기"
                      maxLength={50}
                    />
                    {errors[`${mission.id}_title`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`${mission.id}_title`]}</p>
                    )}
                  </div>

                  {/* 미션 설명 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      미션 설명 (선택)
                    </label>
                    <textarea
                      value={mission.description}
                      onChange={(e) => updateMission(mission.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="미션에 대한 추가 설명"
                      maxLength={200}
                    />
                  </div>

                  {/* 미션 타입 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      미션 타입
                    </label>
                    <button
                      onClick={() => toggleMissionType(mission.id)}
                      className="flex items-center space-x-3 w-full p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {mission.missionType === 'boolean' ? (
                        <ToggleLeft className="w-8 h-8 text-indigo-600" />
                      ) : (
                        <ToggleRight className="w-8 h-8 text-indigo-600" />
                      )}
                      <div className="text-left">
                        <p className="font-medium">
                          {mission.missionType === 'boolean' ? '완료/미완료' : '숫자 입력'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {mission.missionType === 'boolean' 
                            ? '단순히 했다/안했다를 기록' 
                            : '수치를 입력해서 기록'
                          }
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* 입력 제한 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      입력 제한
                    </label>
                    <button
                      onClick={() => toggleInputRestriction(mission.id)}
                      className="flex items-center space-x-3 w-full p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {mission.inputRestriction === 'same_day_only' ? (
                        <ToggleLeft className="w-8 h-8 text-orange-600" />
                      ) : (
                        <ToggleRight className="w-8 h-8 text-green-600" />
                      )}
                      <div className="text-left">
                        <p className="font-medium">
                          {mission.inputRestriction === 'same_day_only' ? '당일만 입력' : '언제든 입력'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {mission.inputRestriction === 'same_day_only' 
                            ? '24시까지만 입력 가능' 
                            : '이후에도 입력 가능'
                          }
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* 성공 조건 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      성공 조건 및 인정 범위 *
                    </label>
                    <textarea
                      value={mission.successConditions}
                      onChange={(e) => updateMission(mission.id, 'successConditions', e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                        errors[`${mission.id}_successConditions`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="예: 최소 300자 이상의 블로그 글 작성. 깃허브 정리, 자소서 작성 등 유사한 글쓰기 활동도 인정"
                      maxLength={300}
                    />
                    {errors[`${mission.id}_successConditions`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`${mission.id}_successConditions`]}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      모든 참여자가 공유하는 규칙입니다. 명확하게 작성해주세요.
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              다음 단계
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateChallengeMissions 