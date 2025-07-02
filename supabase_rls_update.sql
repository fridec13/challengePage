-- Challenge! RLS 정책 업데이트 (하이브리드 인증용)
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 RLS 정책 제거
DROP POLICY IF EXISTS "Anyone can view challenges" ON challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON challenges;
DROP POLICY IF EXISTS "Challenge creators can update" ON challenges;

DROP POLICY IF EXISTS "Participants can view challenge participants" ON challenge_participants;
DROP POLICY IF EXISTS "Users can join challenges" ON challenge_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON challenge_participants;

DROP POLICY IF EXISTS "Participants can view missions" ON missions;
DROP POLICY IF EXISTS "Challenge creators can manage missions" ON missions;

DROP POLICY IF EXISTS "Participants can view mission logs" ON mission_logs;
DROP POLICY IF EXISTS "Users can create own mission logs" ON mission_logs;
DROP POLICY IF EXISTS "Users can update own mission logs" ON mission_logs;

-- 2. 임시로 RLS 비활성화 (개발용)
ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mission_logs DISABLE ROW LEVEL SECURITY;

-- 3. 새로운 RLS 정책 생성 (나중에 활성화용)

-- challenges 테이블 정책
CREATE POLICY "Public read access" ON challenges 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create" ON challenges 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update own challenges" ON challenges 
FOR UPDATE USING (
  creator_id IN (
    SELECT CAST(auth.jwt()->>'custom_user_id' AS UUID)
    UNION ALL
    SELECT id FROM users WHERE id = creator_id
  )
);

-- challenge_participants 테이블 정책
CREATE POLICY "Public read participants" ON challenge_participants 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join" ON challenge_participants 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own participation" ON challenge_participants 
FOR UPDATE USING (
  user_id IN (
    SELECT CAST(auth.jwt()->>'custom_user_id' AS UUID)
    UNION ALL
    SELECT id FROM users WHERE id = user_id
  )
);

-- missions 테이블 정책
CREATE POLICY "Public read missions" ON missions 
FOR SELECT USING (true);

CREATE POLICY "Challenge creators can manage missions" ON missions 
FOR ALL USING (
  challenge_id IN (
    SELECT id FROM challenges WHERE creator_id IN (
      SELECT CAST(auth.jwt()->>'custom_user_id' AS UUID)
      UNION ALL
      SELECT id FROM users WHERE id = challenges.creator_id
    )
  )
);

-- mission_logs 테이블 정책
CREATE POLICY "Public read mission logs" ON mission_logs 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create logs" ON mission_logs 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own logs" ON mission_logs 
FOR UPDATE USING (
  user_id IN (
    SELECT CAST(auth.jwt()->>'custom_user_id' AS UUID)
    UNION ALL
    SELECT id FROM users WHERE id = user_id
  )
);

-- 4. 테스트용 - 현재는 RLS 비활성화 상태
-- 나중에 필요시 활성화:
-- ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;

-- 5. 익명 인증 활성화 확인
-- Authentication > Settings > Auth providers > Anonymous users: 활성화 필요 