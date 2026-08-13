-- 돌발상황 선택과 서버 계산 결과를 응답과 함께 보존합니다.
BEGIN;

ALTER TABLE public.responses
    ADD COLUMN IF NOT EXISTS event_id text
        CHECK (event_id IS NULL OR event_id = 'DOWNSTREAM_ODOR_SURGE'),
    ADD COLUMN IF NOT EXISTS event_choice text
        CHECK (event_choice IS NULL OR event_choice IN ('INVESTIGATE', 'WAIT')),
    ADD COLUMN IF NOT EXISTS event_cost integer NOT NULL DEFAULT 0
        CHECK (event_cost IN (0, 5)),
    ADD COLUMN IF NOT EXISTS event_score_effects jsonb NOT NULL
        DEFAULT '{"ecology": 0, "citizen": 0, "monitoring": 0}'::jsonb
        CHECK (jsonb_typeof(event_score_effects) = 'object');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'responses_event_result_consistency'
          AND conrelid = 'public.responses'::regclass
    ) THEN
        ALTER TABLE public.responses
            ADD CONSTRAINT responses_event_result_consistency CHECK (
                (
                    event_id IS NULL
                    AND event_choice IS NULL
                    AND event_cost = 0
                )
                OR (
                    event_id = 'DOWNSTREAM_ODOR_SURGE'
                    AND event_choice IN ('INVESTIGATE', 'WAIT')
                )
            );
    END IF;
END
$$;

COMMIT;
