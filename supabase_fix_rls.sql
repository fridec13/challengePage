-- Challenge! RLS 문제 해결 (임시)
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 테이블 상태 확인
SELECT table_name, row_security 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'challenges', 'challenge_participants', 'missions', 'mission_logs');

-- 2. 모든 RLS 정책 비활성화 (개발용)
ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mission_logs DISABLE ROW LEVEL SECURITY;

-- 3. 테스트 쿼리 1: 간단한 조회
SELECT COUNT(*) FROM challenges;
SELECT COUNT(*) FROM challenge_participants;

-- 4. 테스트 쿼리 2: 관계형 쿼리 (문제가 되었던 쿼리)
SELECT 
  cp.*,
  c.id as challenge_id,
  c.title,
  c.status as challenge_status
FROM challenge_participants cp
LEFT JOIN challenges c ON cp.challenge_id = c.id
LIMIT 5;

-- 5. 테스트 쿼리 3: PostgREST 스타일 확인
-- (이것이 프론트엔드에서 사용하는 방식)

-- 사용자 테이블 확인
SELECT id, nickname FROM users LIMIT 3;

-- 현재 사용자 ID로 테스트 (실제 ID로 변경)
-- SELECT 
--   cp.*,
--   c.id, c.title, c.status
-- FROM challenge_participants cp
-- LEFT JOIN challenges c ON cp.challenge_id = c.id
-- WHERE cp.user_id = '실제_사용자_ID'
-- AND cp.status = 'active';

-- 6. 결과 확인 후 다시 활성화 (선택사항)
-- ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY; 