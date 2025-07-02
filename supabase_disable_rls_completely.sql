-- Challenge! RLS 완전 비활성화 (임시 해결)
-- Supabase SQL Editor에서 실행하세요

-- 1. 모든 RLS 정책 제거
DROP POLICY IF EXISTS "Everyone can read challenges" ON challenges;
DROP POLICY IF EXISTS "Everyone can create challenges" ON challenges;
DROP POLICY IF EXISTS "Everyone can update challenges" ON challenges;

DROP POLICY IF EXISTS "Everyone can read participants" ON challenge_participants;
DROP POLICY IF EXISTS "Everyone can join challenges" ON challenge_participants;
DROP POLICY IF EXISTS "Everyone can update participation" ON challenge_participants;

DROP POLICY IF EXISTS "Everyone can read missions" ON missions;
DROP POLICY IF EXISTS "Everyone can create missions" ON missions;
DROP POLICY IF EXISTS "Everyone can update missions" ON missions;

DROP POLICY IF EXISTS "Everyone can read mission logs" ON mission_logs;
DROP POLICY IF EXISTS "Everyone can create mission logs" ON mission_logs;
DROP POLICY IF EXISTS "Everyone can update mission logs" ON mission_logs;

-- 2. 모든 RLS 비활성화
ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mission_logs DISABLE ROW LEVEL SECURITY;

-- 3. 테스트 쿼리
SELECT 'RLS completely disabled' as status;

-- 4. 테이블 상태 확인
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('challenges', 'challenge_participants', 'missions', 'mission_logs'); 