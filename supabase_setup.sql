-- Challenge! 플랫폼 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요

-- 1. challenges 테이블 생성
CREATE TABLE challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  max_participants INTEGER NOT NULL DEFAULT 4,
  start_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  end_date DATE GENERATED ALWAYS AS (start_date + duration_days - 1) STORED,
  challenge_code VARCHAR(6) UNIQUE NOT NULL,
  entry_fee INTEGER DEFAULT 0,
  prize_distribution JSONB,
  scoring_method JSONB,
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- challenges 테이블 인덱스
CREATE INDEX idx_challenges_code ON challenges(challenge_code);
CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_status ON challenges(status);

-- 2. challenge_participants 테이블 생성
CREATE TABLE challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left', 'completed')),
  UNIQUE(challenge_id, user_id)
);

-- challenge_participants 테이블 인덱스
CREATE INDEX idx_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_participants_user ON challenge_participants(user_id);

-- 3. missions 테이블 생성
CREATE TABLE missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  mission_type VARCHAR(20) NOT NULL CHECK (mission_type IN ('boolean', 'number')),
  input_restriction VARCHAR(20) DEFAULT 'same_day_only' CHECK (input_restriction IN ('same_day_only', 'flexible')),
  success_conditions TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, order_index)
);

-- missions 테이블 인덱스
CREATE INDEX idx_missions_challenge ON missions(challenge_id);

-- 4. mission_logs 테이블 생성
CREATE TABLE mission_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  value JSONB NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  UNIQUE(mission_id, user_id, log_date)
);

-- mission_logs 테이블 인덱스
CREATE INDEX idx_logs_mission_user_date ON mission_logs(mission_id, user_id, log_date);
CREATE INDEX idx_logs_challenge_date ON mission_logs(challenge_id, log_date);
CREATE INDEX idx_logs_user_challenge ON mission_logs(user_id, challenge_id);

-- 5. Row Level Security (RLS) 정책 설정

-- challenges 테이블 RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 챌린지 조회 가능
CREATE POLICY "Anyone can view challenges" ON challenges FOR SELECT USING (true);

-- 로그인한 사용자만 챌린지 생성 가능
CREATE POLICY "Users can create challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 챌린지 생성자만 수정 가능
CREATE POLICY "Challenge creators can update" ON challenges FOR UPDATE USING (creator_id = auth.uid());

-- challenge_participants 테이블 RLS
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- 챌린지 참여자들만 참여자 목록 조회 가능
CREATE POLICY "Participants can view challenge participants" ON challenge_participants FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM challenge_participants cp 
  WHERE cp.challenge_id = challenge_participants.challenge_id 
  AND cp.user_id = auth.uid()
));

-- 로그인한 사용자만 챌린지 참여 가능
CREATE POLICY "Users can join challenges" ON challenge_participants FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 본인 참여 상태만 수정 가능
CREATE POLICY "Users can update own participation" ON challenge_participants FOR UPDATE 
USING (user_id = auth.uid());

-- missions 테이블 RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- 챌린지 참여자들만 미션 조회 가능
CREATE POLICY "Participants can view missions" ON missions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM challenge_participants cp 
  WHERE cp.challenge_id = missions.challenge_id 
  AND cp.user_id = auth.uid()
));

-- 챌린지 생성자만 미션 생성/수정 가능
CREATE POLICY "Challenge creators can manage missions" ON missions FOR ALL 
USING (EXISTS (
  SELECT 1 FROM challenges c 
  WHERE c.id = missions.challenge_id 
  AND c.creator_id = auth.uid()
));

-- mission_logs 테이블 RLS
ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;

-- 챌린지 참여자들만 로그 조회 가능
CREATE POLICY "Participants can view mission logs" ON mission_logs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM challenge_participants cp 
  WHERE cp.challenge_id = mission_logs.challenge_id 
  AND cp.user_id = auth.uid()
));

-- 본인만 미션 로그 작성 가능
CREATE POLICY "Users can create own mission logs" ON mission_logs FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 본인 미션 로그만 수정 가능
CREATE POLICY "Users can update own mission logs" ON mission_logs FOR UPDATE 
USING (user_id = auth.uid());

-- 6. 유용한 함수들 생성

-- 챌린지 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_challenge_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  code VARCHAR(6);
  chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  code := '';
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- 중복 체크
  WHILE EXISTS(SELECT 1 FROM challenges WHERE challenge_code = code) LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 사용자의 현재 참여 챌린지 조회 함수
CREATE OR REPLACE FUNCTION get_user_active_challenge(user_uuid UUID)
RETURNS TABLE (
  challenge_id UUID,
  title VARCHAR(100),
  status VARCHAR(20),
  start_date DATE,
  end_date DATE,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.status,
    c.start_date,
    c.end_date,
    cp.joined_at
  FROM challenges c
  JOIN challenge_participants cp ON c.id = cp.challenge_id
  WHERE cp.user_id = user_uuid 
    AND cp.status = 'active' 
    AND c.status IN ('planning', 'active')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 테이블 생성 완료
-- 이제 프론트엔드에서 API 함수를 구현할 수 있습니다. 