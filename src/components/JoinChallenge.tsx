import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Calendar, DollarSign, Trophy, AlertCircle, CheckCircle } from 'lucide-react'
import { challengeAPI } from '../lib/supabase'

interface Challenge {
  id: string
  title: string
  description?: string
  creator_id: string
  max_participants: number
  start_date: string
  duration_days: number
  entry_fee: number
  prize_distribution: number[]
  scoring_method: {
    consistency: number
    volume: number
    quality: number
    streak_bonus: number
    enable_quality: boolean
  }
  status: 'planning' | 'active' | 'completed' | 'cancelled'
}

interface ChallengeParticipant {
  id: string
  user_id: string
  users: {
    nickname: string
    profile_id: number
  }
}

const JoinChallenge = () => {
  const navigate = useNavigate()
  const [challengeCode, setChallengeCode] = useState('')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)

  const handleCodeChange = (value: string) => {
    // 영문 대문자와 숫자만 허용, 최대 6자
    const formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setChallengeCode(formattedValue)
    
    // 에러 리셋
    if (error) setError('')
    if (challenge) setChallenge(null)
  }

  const handleSearchChallenge = async () => {
    if (challengeCode.length !== 6) {
      setError('6자리 코드를 입력해주세요')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 챌린지 조회
      const challengeResult = await challengeAPI.getChallengeByCode(challengeCode)
      
      if (challengeResult.error || !challengeResult.data) {
        setError('존재하지 않는 챌린지 코드입니다')
        return
      }

      const challengeData = challengeResult.data

      // 챌린지 상태 확인
      if (challengeData.status === 'completed') {
        setError('이미 완료된 챌린지입니다')
        return
      }
      if (challengeData.status === 'cancelled') {
        setError('취소된 챌린지입니다')
        return
      }
      if (challengeData.status === 'active') {
        setError('이미 시작된 챌린지는 참여할 수 없습니다')
        return
      }

      // 참여자 목록 조회
      const participantsResult = await challengeAPI.getChallengeParticipants(challengeData.id)
      
      if (participantsResult.error) {
        setError('챌린지 정보를 불러오는데 실패했습니다')
        return
      }

      const participantsList = participantsResult.data || []

      // 인원 제한 확인
      if (participantsList.length >= challengeData.max_participants) {
        setError('참여 인원이 가득 찼습니다')
        return
      }

      // 이미 참여 중인지 확인
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const alreadyJoined = participantsList.some(p => p.user_id === user.id)
      
      if (alreadyJoined) {
        setError('이미 참여 중인 챌린지입니다')
        return
      }

      // 동시 참여 제한 확인
      const activeChallenge = await challengeAPI.getUserActiveChallenge(user.id)
      if (activeChallenge.data) {
        setError('이미 다른 챌린지에 참여 중입니다. 한 번에 하나의 챌린지에만 참여할 수 있습니다.')
        return
      }

      setChallenge(challengeData)
      setParticipants(participantsList)

    } catch (error) {
      console.error('챌린지 검색 실패:', error)
      setError('챌린지 검색에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinChallenge = async () => {
    if (!challenge) return

    setIsJoining(true)
    
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const result = await challengeAPI.joinChallenge(challenge.id, user.id)
      
      if (result.error) {
        setError('챌린지 참여에 실패했습니다')
        return
      }

      setJoined(true)
      
    } catch (error) {
      console.error('챌린지 참여 실패:', error)
      setError('챌린지 참여에 실패했습니다')
    } finally {
      setIsJoining(false)
    }
  }

  const handleGoToDashboard = () => {
    navigate('/dashboard')
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getProfileEmoji = (profileId: number) => {
    const emojis = ['🐱', '🐶', '🐰', '🐼', '🦊', '🐸', '🐻', '🐷', '🐯', '🐨']
    return emojis[profileId - 1] || '🐱'
  }

  // 참여 완료 화면
  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-800 mb-2">참여 완료!</h1>
              <p className="text-gray-600 mb-8">챌린지에 성공적으로 참여했습니다</p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{challenge?.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-blue-600 font-medium">시작일</p>
                    <p className="text-blue-800 font-bold">{challenge && formatDate(challenge.start_date)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-purple-600 font-medium">기간</p>
                    <p className="text-purple-800 font-bold">{challenge?.duration_days}일</p>
                  </div>
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 헤더 */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-800">챌린지 참여하기</h1>
            <p className="text-gray-600">친구가 공유한 챌린지 코드를 입력하세요</p>
          </div>
        </div>

        {/* 코드 입력 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">챌린지 코드 입력</h3>
          
          <div className="flex space-x-4 mb-4">
            <input
              type="text"
              value={challengeCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="6자리 코드 입력"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-xl font-mono tracking-wider uppercase"
              maxLength={6}
            />
            <button
              onClick={handleSearchChallenge}
              disabled={challengeCode.length !== 6 || isLoading}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                challengeCode.length === 6 && !isLoading
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? '검색 중...' : '검색'}
            </button>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* 챌린지 정보 */}
        {challenge && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">챌린지 정보</h3>
            
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">{challenge.title}</h4>
                {challenge.description && (
                  <p className="text-gray-600 mb-4">{challenge.description}</p>
                )}
              </div>

              {/* 상세 정보 그리드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600">시작일</p>
                    <p className="font-semibold text-blue-800">{formatDate(challenge.start_date)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600">기간</p>
                    <p className="font-semibold text-purple-800">{challenge.duration_days}일</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600">참가비</p>
                    <p className="font-semibold text-green-800">{challenge.entry_fee.toLocaleString()}원</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-600">참여자</p>
                    <p className="font-semibold text-orange-800">{participants.length}/{challenge.max_participants}명</p>
                  </div>
                </div>
              </div>

              {/* 평가 방식 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-semibold text-gray-800 mb-2">평가 방식</h5>
                <div className="text-sm text-gray-600">
                  꾸준함 {challenge.scoring_method.consistency}% + 총량 {challenge.scoring_method.volume}%
                  {challenge.scoring_method.enable_quality && ` + 충실도 ${challenge.scoring_method.quality}%`}
                  {challenge.scoring_method.streak_bonus > 0 && ` + 연속달성보너스 ${challenge.scoring_method.streak_bonus}%`}
                </div>
              </div>

              {/* 현재 참여자 */}
              <div>
                <h5 className="font-semibold text-gray-800 mb-3">현재 참여자 ({participants.length}명)</h5>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-lg">
                        {getProfileEmoji(participant.users.profile_id)}
                      </div>
                      <span className="font-medium text-gray-800">{participant.users.nickname}</span>
                    </div>
                  ))}
                  {Array.from({ length: challenge.max_participants - participants.length - 1 }, (_, i) => (
                    <div key={`empty-${i}`} className="flex items-center space-x-3 p-2 bg-gray-100 rounded-lg">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-400 text-sm">?</span>
                      </div>
                      <span className="text-gray-400">대기 중...</span>
                    </div>
                  ))}
                  {/* 내가 참여할 자리 */}
                  <div className="flex items-center space-x-3 p-2 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                    <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center text-lg">
                      👋
                    </div>
                    <span className="font-medium text-indigo-800">당신의 자리</span>
                  </div>
                </div>
              </div>

              {/* 참여 버튼 */}
              <button
                onClick={handleJoinChallenge}
                disabled={isJoining}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors duration-200"
              >
                {isJoining ? '참여 중...' : '챌린지 참여하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JoinChallenge