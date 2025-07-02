-- Challenge! RLS 재활성화 및 정책 수정
-- Supabase SQL Editor에서 실행하세요

-- 1. 모든 RLS 활성화
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 모두 제거
DROP POLICY IF EXISTS "Public read access" ON challenges;
DROP POLICY IF EXISTS "Authenticated users can create" ON challenges;
DROP POLICY IF EXISTS "Creators can update own challenges" ON challenges;

DROP POLICY IF EXISTS "Public read participants" ON challenge_participants;
DROP POLICY IF EXISTS "Authenticated users can join" ON challenge_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON challenge_participants;

DROP POLICY IF EXISTS "Public read missions" ON missions;
DROP POLICY IF EXISTS "Challenge creators can manage missions" ON missions;

DROP POLICY IF EXISTS "Public read mission logs" ON mission_logs;
DROP POLICY IF EXISTS "Authenticated users can create logs" ON mission_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON mission_logs;

-- 3. 새로운 정책 생성 (더 관대한 정책)

-- challenges 테이블 정책
CREATE POLICY "Everyone can read challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "Everyone can create challenges" ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update challenges" ON challenges FOR UPDATE USING (true);

-- challenge_participants 테이블 정책
CREATE POLICY "Everyone can read participants" ON challenge_participants FOR SELECT USING (true);
CREATE POLICY "Everyone can join challenges" ON challenge_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update participation" ON challenge_participants FOR UPDATE USING (true);

-- missions 테이블 정책
CREATE POLICY "Everyone can read missions" ON missions FOR SELECT USING (true);
CREATE POLICY "Everyone can create missions" ON missions FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update missions" ON missions FOR UPDATE USING (true);

-- mission_logs 테이블 정책
CREATE POLICY "Everyone can read mission logs" ON mission_logs FOR SELECT USING (true);
CREATE POLICY "Everyone can create mission logs" ON mission_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update mission logs" ON mission_logs FOR UPDATE USING (true);

-- 4. 테스트 쿼리
SELECT 'RLS policies created successfully' as status;

-- 5. 선택사항: 나중에 더 엄격한 정책으로 교체
-- 개발이 완료되면 아래 정책들로 교체할 수 있습니다
/*
-- 더 엄격한 정책 예시:
CREATE POLICY "Authenticated read challenges" ON challenges FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Own data only" ON challenge_participants FOR SELECT 
USING (auth.uid()::text = user_id::text);
*/ 