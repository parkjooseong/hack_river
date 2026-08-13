-- 후보자 리포트 필터와 의견 페이지 조회 성능을 위한 인덱스입니다.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_responses_district
    ON public.responses(district);

CREATE INDEX IF NOT EXISTS idx_responses_river_district_created_at
    ON public.responses(river_id, district, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_responses_comments_created_at
    ON public.responses(created_at DESC)
    WHERE comment <> '';

COMMIT;
