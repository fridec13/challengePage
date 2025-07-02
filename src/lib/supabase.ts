import { createClient } from '@supabase/supabase-js'

// 환경 변수 확인 및 디버깅
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경 변수 확인 완료

// 환경 변수가 없으면 에러 발생
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// 사용자 인증 상태 관리
let currentUserId: string | null = null

// 현재 사용자 ID 설정 (RLS용)
export const setCurrentUser = (userId: string) => {
  currentUserId = userId
}

// 현재 사용자 ID 가져오기
export const getCurrentUser = () => currentUserId

// Supabase Auth와 연동 (백그라운드 익명 로그인)
export const syncAuthSession = async (userId: string) => {
  try {
    // 이미 로그인되어 있으면 스킵
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(userId)
      return true
    }

    // 익명 로그인으로 세션 생성
    const { error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          custom_user_id: userId
        }
      }
    })

    if (error) {
      console.warn('Anonymous auth failed:', error)
      return false
    }

    setCurrentUser(userId)
    return true
  } catch (error) {
    console.warn('Auth sync failed:', error)
    return false
  }
}

// 타입 정의
export interface Challenge {
  id: string
  title: string
  description?: string
  creator_id: string
  max_participants: number
  start_date: string
  duration_days: number
  end_date: string
  challenge_code: string
  entry_fee: number
  prize_distribution?: any
  scoring_method?: any
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface Mission {
  id: string
  challenge_id: string
  title: string
  description?: string
  mission_type: 'boolean' | 'number'
  input_restriction: 'same_day_only' | 'flexible'
  success_conditions?: string
  order_index: number
  created_at: string
}

export interface MissionLog {
  id: string
  mission_id: string
  user_id: string
  challenge_id: string
  log_date: string
  value: any
  logged_at: string
  is_late: boolean
}

// 사용자 관련 API 함수들
export const authAPI = {
  // 닉네임과 핀코드로 회원가입
  async signUp(nickname: string, pinCode: string, profileId: number) {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          nickname,
          pin_code: pinCode,
          profile_id: profileId,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    // 회원가입 성공 시 Supabase Auth와 연동
    if (data && data[0] && !error) {
      await syncAuthSession(data[0].id)
    }

    return { data, error }
  },

  // 닉네임과 핀코드로 로그인
  async signIn(nickname: string, pinCode: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', nickname)
      .eq('pin_code', pinCode)
      .single()

    // 로그인 성공 시 Supabase Auth와 연동
    if (data && !error) {
      await syncAuthSession(data.id)
    }

    return { data, error }
  },

  // 닉네임 중복 확인
  async checkNickname(nickname: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', nickname)

    return { exists: data && data.length > 0, error }
  }
}

// 챌린지 관련 API 함수들
export const challengeAPI = {
  // 챌린지 생성
  async createChallenge(challengeData: Omit<Challenge, 'id' | 'challenge_code' | 'end_date' | 'created_at' | 'updated_at'>) {
    // 챌린지 코드 생성
    const { data: codeData, error: codeError } = await supabase.rpc('generate_challenge_code')
    if (codeError) return { data: null, error: codeError }

    // 챌린지 생성
    const { data: challengeData_result, error: challengeError } = await supabase
      .from('challenges')
      .insert([{
        ...challengeData,
        challenge_code: codeData
      }])
      .select()
      .single()

    if (challengeError) return { data: null, error: challengeError }

    // 생성자를 자동으로 참여자로 추가
    const { error: participantError } = await supabase
      .from('challenge_participants')
      .insert([{
        challenge_id: challengeData_result.id,
        user_id: challengeData.creator_id,
        status: 'active'
      }])

    if (participantError) {
      console.warn('Failed to add creator as participant:', participantError)
      // 챌린지는 이미 생성되었으므로 에러를 반환하지 않음
    }

    return { data: challengeData_result, error: null }
  },

  // 챌린지 코드로 조회
  async getChallengeByCode(code: string) {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenge_code', code)
      .single()

    return { data, error }
  },

  // 챌린지 ID로 조회
  async getChallengeById(id: string) {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single()

    return { data, error }
  },

  // 사용자의 현재 참여 챌린지 조회
  async getUserActiveChallenge(userId: string) {
    try {
      // RPC 함수 시도
      const { data, error } = await supabase.rpc('get_user_active_challenge', {
        user_uuid: userId
      })

      if (!error && data) {
        return { data: data?.[0] || null, error: null }
      }
    } catch (rpcError) {
      console.warn('RPC function not available, using fallback query')
    }

    // Fallback: 일반 쿼리 사용
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        challenges!challenge_id (
          id,
          title,
          status,
          start_date,
          end_date
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('challenges.status', ['planning', 'active'])
      .limit(1)
      .single()

    if (fallbackError) return { data: null, error: fallbackError }

    // 데이터 형식을 RPC 결과와 맞춤
    const formattedData = fallbackData?.challenges ? {
      challenge_id: fallbackData.challenges.id,
      title: fallbackData.challenges.title,
      status: fallbackData.challenges.status,
      start_date: fallbackData.challenges.start_date,
      end_date: fallbackData.challenges.end_date,
      joined_at: fallbackData.joined_at
    } : null

    return { data: formattedData, error: null }
  },

  // 챌린지 참여
  async joinChallenge(challengeId: string, userId: string) {
    // 1. 챌린지 상태 확인
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('status, max_participants')
      .eq('id', challengeId)
      .single()

    if (challengeError) return { data: null, error: challengeError }
    
    if (challenge.status !== 'planning') {
      return { data: null, error: { message: '참여 가능한 챌린지가 아닙니다.' } }
    }

    // 2. 이미 참여 중인지 확인
    const { data: existingParticipant } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (existingParticipant) {
      return { data: null, error: { message: '이미 참여 중인 챌린지입니다.' } }
    }

    // 3. 참여자 수 확인
    const { data: participants, error: countError } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('status', 'active')

    if (countError) return { data: null, error: countError }

    if (participants && participants.length >= challenge.max_participants) {
      return { data: null, error: { message: '참여자 수가 가득 찼습니다.' } }
    }

    // 4. 참여 처리
    const { data, error } = await supabase
      .from('challenge_participants')
      .insert([{
        challenge_id: challengeId,
        user_id: userId,
        status: 'active'
      }])
      .select()
      .single()

    return { data, error }
  },

  // 챌린지 참여자 목록 조회
  async getChallengeParticipants(challengeId: string) {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        users:user_id (
          id,
          nickname,
          profile_id
        )
      `)
      .eq('challenge_id', challengeId)
      .eq('status', 'active')

    return { data, error }
  },

  // 챌린지 상태 업데이트
  async updateChallengeStatus(challengeId: string, status: Challenge['status']) {
    const { data, error } = await supabase
      .from('challenges')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', challengeId)
      .select()
      .single()

    return { data, error }
  },

  // 챌린지 자동 종료 체크 및 업데이트
  async checkAndUpdateChallengeStatus(challengeId: string) {
    // 먼저 챌린지 정보 가져오기
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (fetchError || !challenge) {
      return { data: null, error: fetchError }
    }

    // 현재 날짜와 종료일 비교
    const today = new Date()
    const endDate = new Date(challenge.end_date)
    
    // 오늘이 종료일을 지났고, 상태가 아직 active라면 completed로 변경
    if (today > endDate && challenge.status === 'active') {
      const { error } = await supabase
        .from('challenges')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single()

      if (error) {
        return { data: challenge, error }
      }

      // 업데이트된 챌린지 반환
      return { data: { ...challenge, status: 'completed' }, error: null }
    }

    // 시작일이 되었는데 아직 planning 상태라면 active로 변경
    const startDate = new Date(challenge.start_date)
    if (today >= startDate && challenge.status === 'planning') {
      const { error } = await supabase
        .from('challenges')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single()

      if (error) {
        return { data: challenge, error }
      }

      // 업데이트된 챌린지 반환
      return { data: { ...challenge, status: 'active' }, error: null }
    }

    // 상태 변경이 필요없으면 기존 챌린지 그대로 반환
    return { data: challenge, error: null }
  },

  // 사용자의 완료된 챌린지 목록 조회 (아카이브용)
  async getUserCompletedChallenges(userId: string) {
    // 올바른 Supabase 관계형 쿼리 구문 사용
    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        challenges!challenge_id (
          id,
          title,
          description,
          start_date,
          end_date,
          status,
          max_participants,
          entry_fee,
          prize_distribution,
          creator_id,
          users!creator_id (
            nickname
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('challenges.status', 'completed')

    return { data, error }
  },

  // 챌린지 최종 결과 조회
  async getChallengeResults(challengeId: string) {
    // 챌린지 기본 정보
    const challengeResult = await this.getChallengeById(challengeId)
    if (challengeResult.error || !challengeResult.data) {
      return { data: null, error: challengeResult.error }
    }

    // 참여자 목록
    const participantsResult = await this.getChallengeParticipants(challengeId)
    if (participantsResult.error) {
      return { data: null, error: participantsResult.error }
    }

    // 미션 목록
    const missionsResult = await missionAPI.getChallengeMissions(challengeId)
    if (missionsResult.error) {
      return { data: null, error: missionsResult.error }
    }

    // 모든 미션 로그
    const { data: allLogs, error: logsError } = await supabase
      .from('mission_logs')
      .select(`
        *,
        missions!mission_id (
          title,
          mission_type
        ),
        users!user_id (
          nickname,
          profile_id
        )
      `)
      .eq('challenge_id', challengeId)

    if (logsError) {
      return { data: null, error: logsError }
    }

    return {
      data: {
        challenge: challengeResult.data,
        participants: participantsResult.data || [],
        missions: missionsResult.data || [],
        logs: allLogs || []
      },
      error: null
    }
  }
}

// 미션 관련 API 함수들
export const missionAPI = {
  // 미션 생성
  async createMission(missionData: Omit<Mission, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('missions')
      .insert([missionData])
      .select()
      .single()

    return { data, error }
  },

  // 챌린지의 미션 목록 조회
  async getChallengeMissions(challengeId: string) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('order_index')

    return { data, error }
  },

  // 미션 로그 기록
  async logMission(logData: Omit<MissionLog, 'id' | 'logged_at'>) {
    const currentTime = new Date()
    const logDate = new Date(logData.log_date)
    const isLate = currentTime.getDate() !== logDate.getDate() || 
                   currentTime.getMonth() !== logDate.getMonth() ||
                   currentTime.getFullYear() !== logDate.getFullYear()

    const { data, error } = await supabase
      .from('mission_logs')
      .insert([{
        ...logData,
        is_late: isLate
      }])
      .select()
      .single()

    return { data, error }
  },

  // 사용자의 미션 로그 조회
  async getUserMissionLogs(challengeId: string, userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('mission_logs')
      .select(`
        *,
        missions!mission_id (
          title,
          mission_type
        )
      `)
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)

    if (startDate) query = query.gte('log_date', startDate)
    if (endDate) query = query.lte('log_date', endDate)

    const { data, error } = await query.order('log_date', { ascending: false })

    return { data, error }
  },

  // 특정 날짜의 미션 로그 조회
  async getDayMissionLogs(challengeId: string, userId: string, date: string) {
    const { data, error } = await supabase
      .from('mission_logs')
      .select(`
        *,
        missions!mission_id (
          id,
          title,
          mission_type
        )
      `)
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .eq('log_date', date)

    return { data, error }
  }
} 