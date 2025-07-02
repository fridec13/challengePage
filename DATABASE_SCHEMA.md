# Challenge! 데이터베이스 스키마 설계

## 📊 전체 구조 개요

```
users (기존)
├── challenges (1:M) - 챌린지 기본 정보
│   ├── challenge_participants (M:M) - 챌린지 참여자
│   └── missions (1:M) - 챌린지별 미션 설정
│       └── mission_logs (1:M) - 일일 미션 달성 기록
```

---

## 🗄️ 테이블 상세 설계

### 1. `users` 테이블 (기존)
```sql
-- 이미 구현됨
id: UUID (Primary Key)
nickname: VARCHAR(50) UNIQUE NOT NULL
pin_code: VARCHAR(4) NOT NULL
profile_id: INTEGER NOT NULL (1-10)
created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### 2. `challenges` 테이블
```sql
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
  entry_fee INTEGER DEFAULT 0, -- 원 단위
  prize_distribution JSONB, -- 순위별 상금 배분
  scoring_method JSONB, -- 평가 방식 설정
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_challenges_code ON challenges(challenge_code);
CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_status ON challenges(status);
```

### 3. `challenge_participants` 테이블
```sql
CREATE TABLE challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left', 'completed')),
  
  -- 복합 유니크 제약: 한 사용자는 하나의 챌린지에만 한 번 참여
  UNIQUE(challenge_id, user_id)
);

-- 인덱스
CREATE INDEX idx_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_participants_user ON challenge_participants(user_id);
```

### 4. `missions` 테이블
```sql
CREATE TABLE missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  mission_type VARCHAR(20) NOT NULL CHECK (mission_type IN ('boolean', 'number')),
  input_restriction VARCHAR(20) DEFAULT 'same_day_only' CHECK (input_restriction IN ('same_day_only', 'flexible')),
  success_conditions TEXT, -- 성공 조건 설명
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 복합 유니크 제약: 같은 챌린지 내에서 순서 중복 방지
  UNIQUE(challenge_id, order_index)
);

-- 인덱스
CREATE INDEX idx_missions_challenge ON missions(challenge_id);
```

### 5. `mission_logs` 테이블
```sql
CREATE TABLE mission_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE, -- 빠른 조회용
  log_date DATE NOT NULL,
  value JSONB NOT NULL, -- boolean: {"completed": true}, number: {"count": 3}
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE, -- 당일 23:59 이후 기록 여부
  
  -- 복합 유니크 제약: 하나의 미션에 대해 하루에 한 번만 기록
  UNIQUE(mission_id, user_id, log_date)
);

-- 인덱스
CREATE INDEX idx_logs_mission_user_date ON mission_logs(mission_id, user_id, log_date);
CREATE INDEX idx_logs_challenge_date ON mission_logs(challenge_id, log_date);
CREATE INDEX idx_logs_user_challenge ON mission_logs(user_id, challenge_id);
```

---

## 🔗 관계 설정

### Foreign Key 관계
- `challenges.creator_id` → `users.id`
- `challenge_participants.challenge_id` → `challenges.id`
- `challenge_participants.user_id` → `users.id`
- `missions.challenge_id` → `challenges.id`
- `mission_logs.mission_id` → `missions.id`
- `mission_logs.user_id` → `users.id`
- `mission_logs.challenge_id` → `challenges.id`

### 비즈니스 룰
1. 한 사용자는 동시에 하나의 active 챌린지에만 참여 가능
2. 챌린지 시작 전에만 참여 가능
3. 미션 기록은 챌린지 기간 내에만 가능
4. same_day_only 미션은 당일 23:59까지만 기록 가능

---

## 📋 JSONB 필드 구조

### `challenges.prize_distribution`
```json
{
  "total_amount": 650000,
  "distribution": [
    {"rank": 1, "amount": 300000},
    {"rank": 2, "amount": 200000},
    {"rank": 3, "amount": 100000},
    {"rank": 4, "amount": 50000}
  ]
}
```

### `challenges.scoring_method`
```json
{
  "consistency_weight": 0.7,  // 꾸준함 가중치
  "volume_weight": 0.3,       // 총량 가중치
  "streak_bonus": 0.1         // 연속 달성 보너스
}
```

### `mission_logs.value`
```json
// Boolean 미션
{"completed": true}

// Number 미션  
{"count": 3, "target": 1}
```

---

## 🔍 주요 쿼리 예시

### 사용자의 현재 참여 챌린지 조회
```sql
SELECT c.*, cp.joined_at 
FROM challenges c
JOIN challenge_participants cp ON c.id = cp.challenge_id
WHERE cp.user_id = $1 AND cp.status = 'active' AND c.status IN ('planning', 'active');
```

### 챌린지별 참여자 순위 계산
```sql
WITH user_stats AS (
  SELECT 
    ml.user_id,
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE ml.is_late = false) as on_time_logs,
    MAX(streak_length) as max_streak
  FROM mission_logs ml
  WHERE ml.challenge_id = $1
  GROUP BY ml.user_id
)
SELECT u.nickname, us.total_logs, us.on_time_logs, us.max_streak
FROM user_stats us
JOIN users u ON us.user_id = u.id
ORDER BY (us.on_time_logs * 0.7 + us.total_logs * 0.3) DESC;
```

---

## 🚀 다음 단계
1. Supabase에서 테이블 생성
2. Row Level Security (RLS) 정책 설정
3. API 함수 구현
4. 테스트 데이터 입력

---

**작성일**: 2025-01-02
**상태**: 설계 완료, 구현 대기 