import { createClient } from '@supabase/supabase-js'

// 실제 사용시에는 환경 변수로 관리해야 합니다
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your_supabase_url_here'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here'

export const supabase = createClient(supabaseUrl, supabaseKey)

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