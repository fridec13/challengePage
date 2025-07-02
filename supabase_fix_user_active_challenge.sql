-- get_user_active_challenge 함수에 challenge_code 필드 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 함수 삭제
DROP FUNCTION IF EXISTS get_user_active_challenge(uuid);

-- 2. 새로운 함수 생성 (challenge_code 포함)
CREATE OR REPLACE FUNCTION get_user_active_challenge(user_uuid UUID)
RETURNS TABLE (
  challenge_id UUID,
  title VARCHAR(100),
  status VARCHAR(20),
  start_date DATE,
  end_date DATE,
  challenge_code VARCHAR(6),
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
    c.challenge_code,
    cp.joined_at
  FROM challenges c
  JOIN challenge_participants cp ON c.id = cp.challenge_id
  WHERE cp.user_id = user_uuid 
    AND cp.status = 'active' 
    AND c.status IN ('planning', 'active')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 함수 권한 설정
GRANT EXECUTE ON FUNCTION get_user_active_challenge(UUID) TO anon, authenticated;

-- 4. 테스트
SELECT * FROM get_user_active_challenge('00000000-0000-0000-0000-000000000000'); 