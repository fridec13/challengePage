import { createClient } from '@supabase/supabase-js'

// 실제 사용시에는 환경 변수로 관리해야 합니다
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your_supabase_url_here'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here'

export const supabase = createClient(supabaseUrl, supabaseKey)

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

    const { data, error } = await supabase
      .from('challenges')
      .insert([{
        ...challengeData,
        challenge_code: codeData
      }])
      .select()
      .single()

    return { data, error }
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

  // 사용자의 현재 참여 챌린지 조회
  async getUserActiveChallenge(userId: string) {
    const { data, error } = await supabase.rpc('get_user_active_challenge', {
      user_uuid: userId
    })

    return { data: data?.[0] || null, error }
  },

  // 챌린지 참여
  async joinChallenge(challengeId: string, userId: string) {
    const { data, error } = await supabase
      .from('challenge_participants')
      .insert([{
        challenge_id: challengeId,
        user_id: userId
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
        missions:mission_id (
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
        missions:mission_id (
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