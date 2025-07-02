-- Challenge! 누락된 함수들 생성
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 함수 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('generate_challenge_code', 'get_user_active_challenge');

-- 2. generate_challenge_code 함수 생성
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. get_user_active_challenge 함수 생성
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

-- 4. 함수 권한 설정 (anon 및 authenticated 역할에게 실행 권한 부여)
GRANT EXECUTE ON FUNCTION generate_challenge_code() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_challenge(UUID) TO anon, authenticated;

-- 5. 테스트
SELECT generate_challenge_code();
SELECT * FROM get_user_active_challenge('00000000-0000-0000-0000-000000000000'); 