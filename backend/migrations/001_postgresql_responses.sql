-- PostgreSQL/Supabase 배포용 스키마입니다. 애플리케이션에서 생성한 UUID를 저장하므로 확장이 필요 없습니다.
CREATE TABLE IF NOT EXISTS responses (
    id uuid PRIMARY KEY,
    river_id text NOT NULL CHECK (river_id IN ('dongcheon', 'goejeongcheon', 'oncheoncheon')),
    character_name text NOT NULL,
    initial_bod numeric(4, 1) NOT NULL,
    final_bod numeric(4, 1) NOT NULL CHECK (final_bod >= 0.8),
    initial_grade text NOT NULL,
    final_grade text NOT NULL,
    grade_improvement integer NOT NULL,
    mission_success boolean NOT NULL,
    perfect_clear boolean NOT NULL,
    selected_policy_ids jsonb NOT NULL,
    top_priority text NOT NULL,
    budget_used integer NOT NULL CHECK (budget_used BETWEEN 0 AND 100),
    ecology_score integer NOT NULL CHECK (ecology_score BETWEEN 0 AND 100),
    citizen_score integer NOT NULL CHECK (citizen_score BETWEEN 0 AND 100),
    monitoring_score integer NOT NULL CHECK (monitoring_score BETWEEN 0 AND 100),
    pledge_match_rate integer NOT NULL CHECK (pledge_match_rate BETWEEN 0 AND 100),
    district text NOT NULL,
    comment varchar(200) NOT NULL DEFAULT '',
    consent_to_aggregate boolean NOT NULL CHECK (consent_to_aggregate = true),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_river_id ON responses(river_id);
CREATE INDEX IF NOT EXISTS idx_responses_top_priority ON responses(top_priority);
