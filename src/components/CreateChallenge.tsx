import { useState } from 'react'
import { ArrowLeft, Calendar, Users, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ChallengeBasicInfo {
  title: string
  description: string
  maxParticipants: number
  startDate: string
  durationDays: number
}

interface FormErrors {
  title?: string
  description?: string
  maxParticipants?: string
  startDate?: string
  durationDays?: string
}

const CreateChallenge = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ChallengeBasicInfo>({
    title: '',
    description: '',
    maxParticipants: 4,
    startDate: '',
    durationDays: 100
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'maxParticipants') {
      setFormData(prev => ({
        ...prev,
        maxParticipants: parseInt(value) || 0
      }))
    } else if (name === 'durationDays') {
      setFormData(prev => ({
        ...prev,
        durationDays: parseInt(value) || 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      } as ChallengeBasicInfo))
    }
    
    // 에러 제거
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = '챌린지 제목을 입력해주세요'
    } else if (formData.title.length < 2) {
      newErrors.title = '제목은 최소 2자 이상이어야 합니다'
    }
    
    if (!formData.startDate) {
      newErrors.startDate = '시작일을 선택해주세요'
    } else {
      const selectedDate = new Date(formData.startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.startDate = '시작일은 오늘 이후여야 합니다'
      }
    }
    
    if (formData.maxParticipants < 2) {
      newErrors.maxParticipants = '최소 2명 이상이어야 합니다'
    } else if (formData.maxParticipants > 10) {
      newErrors.maxParticipants = '최대 10명까지 가능합니다'
    }
    
    if (formData.durationDays < 1) {
      newErrors.durationDays = '최소 1일 이상이어야 합니다'
    } else if (formData.durationDays > 365) {
      newErrors.durationDays = '최대 365일까지 가능합니다'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      // 다음 단계로 이동 (미션 설정)
      // 임시로 데이터 저장하고 다음 페이지로
      localStorage.setItem('challengeBasicInfo', JSON.stringify(formData))
      navigate('/create-challenge/missions')
    }
  }

  // 종료일 계산
  const getEndDate = () => {
    if (!formData.startDate || !formData.durationDays) return ''
    const startDate = new Date(formData.startDate)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + formData.durationDays - 1)
    return endDate.toLocaleDateString('ko-KR')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 헤더 */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-800">새 챌린지 만들기</h1>
            <p className="text-gray-600">1단계: 기본 정보</p>
          </div>
        </div>

        {/* 진행률 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">진행률</span>
            <span className="text-sm font-medium text-indigo-600">1/4 단계</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full w-1/4 transition-all duration-300"></div>
          </div>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-6">
            {/* 챌린지 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                챌린지 제목 *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 100일 블로그 쓰기 챌린지"
                maxLength={50}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.title.length}/50자
              </p>
            </div>

            {/* 챌린지 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                챌린지 설명 (선택)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="친구들에게 챌린지에 대해 설명해주세요"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/200자
              </p>
            </div>

            {/* 참여 인원 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                최대 참여 인원 *
              </label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="2"
                max="10"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.maxParticipants ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.maxParticipants && (
                <p className="mt-1 text-sm text-red-600">{errors.maxParticipants}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                2-10명까지 설정 가능합니다
              </p>
            </div>

            {/* 시작일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                시작일 *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            {/* 진행 기간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                진행 기간 *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="durationDays"
                  value={formData.durationDays}
                  onChange={handleChange}
                  min="1"
                  max="365"
                  className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.durationDays ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <span className="text-gray-600 font-medium">일</span>
              </div>
              {errors.durationDays && (
                <p className="mt-1 text-sm text-red-600">{errors.durationDays}</p>
              )}
              {getEndDate() && (
                <p className="mt-1 text-sm text-gray-600">
                  종료일: {getEndDate()}
                </p>
              )}
            </div>
          </div>

          {/* 다음 버튼 */}
          <div className="mt-8 flex justify-end">
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

export default CreateChallenge 