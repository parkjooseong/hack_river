# 강 새로이 Backend

기획안의 디자인 비의존 기능을 먼저 구현한 Python 3.12 API입니다. 외부 패키지 없이 실행되며, 서버가 BOD·등급·예산·점수를 다시 계산한 뒤 익명 응답만 저장합니다. 로컬 SQLite와 Supabase 공유 DB를 선택할 수 있습니다.

## 바로 실행

```bash
cd backend
python3 -m unittest discover -s tests -v
python3 -m river_api
```

기본 주소는 `http://127.0.0.1:8000`, 데이터 파일은 `data/river_api.db`입니다.

기본 설정은 `backend/.env`에서 읽습니다. Supabase 계정 연결은 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)를 따르세요.
운영 배포 전에는 [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)를 확인하고 다음 명령을 실행하세요.

```bash
python3 scripts/predeploy_check.py --check-database
```

## API

| Method | Path | 용도 |
|---|---|---|
| `GET` | `/health` | 서버 상태 |
| `GET` | `/api/game/config` | 하천·정책·등급·선택지 |
| `POST` | `/api/simulations` | 선택 조합의 서버 계산 |
| `POST` | `/api/responses` | 동의한 익명 결과 저장 |
| `GET` | `/api/stats` | 시민 통계 |
| `GET` | `/api/candidate/report` | 후보자 리포트 집계 |
| `GET` | `/api/candidate/comments` | 후보자용 시민 의견 페이지 조회 |

프런트엔드 연동 계약은 `openapi.yaml`에도 정리되어 있습니다.

계산 요청 예시:

```json
{
  "riverId": "dongcheon",
  "policyIds": ["sewer", "treatment", "sourceBlock"],
  "eventChoice": "INVESTIGATE"
}
```

응답 저장 요청 예시:

```json
{
  "riverId": "dongcheon",
  "policyIds": ["sewer", "treatment", "sourceBlock"],
  "eventChoice": "INVESTIGATE",
  "topPriority": "source_control",
  "district": "busanjin",
  "comment": "생활하수 문제부터 해결해 주세요.",
  "consentToAggregate": true
}
```

`finalBod`, 점수, 성공 여부 같은 계산 결과는 클라이언트가 저장 요청에 넣을 수 없습니다. 서버가 정책 ID를 기준으로 다시 계산합니다. 이름·전화번호·이메일·정확한 주소처럼 정의되지 않은 필드도 거부합니다.

## 돌발상황

정책이 두 개 이상이면 `하류 악취 신고 급증` 이벤트가 한 번 활성화됩니다.

- 계산 요청에서 `eventChoice`를 생략하면 `event.status`가 `PENDING`으로 반환됩니다.
- `INVESTIGATE`는 추가 조사 비용 5억원, 관리 능력 +10, 시민 만족도 +5를 반영합니다.
- 스마트 수질센서가 포함되면 조사 비용은 0억원, 관리 능력은 +15가 되며 시민 만족도 +5는 유지됩니다.
- `WAIT`는 비용 없이 시민 만족도 -10과 임시 캐릭터 상태 `WORRIED`를 반환합니다.
- 최종 저장에서 정책이 두 개 이상이면 `eventChoice`가 필수입니다. 한 개만 선택한 경우에는 이벤트가 발생하지 않습니다.
- 정책비와 이벤트비의 합계가 100억원을 넘으면 요청을 거부합니다.

`/api/stats`와 후보자 리포트의 `eventStatistics`에는 이벤트 대상자·응답률·선택률·센서 활용 조사율이 포함됩니다.

## 결과 안내

`POST /api/simulations`와 응답 저장 결과에는 프런트엔드가 별도 계산 없이 결과 화면을 만들 수 있도록 다음 항목이 포함됩니다.

- `resultStatus`, `resultTitle`, `resultMessage`: 실패·성공·퍼펙트 상태와 안내 문구
- `badges`: 확정 기준으로 판정한 배지 ID·이름·설명
- `strengths`: 선택한 각 정책의 장점 설명
- `remainingBodToMission`: 좋음 등급까지 남은 BOD
- `recommendations`: 실패 시 남은 예산으로 추가 가능한 직접 수질개선 정책 최대 3개와 예상 결과

추천 정책은 이미 선택한 정책을 제외하고 예산 안에서만 계산합니다. 예상 BOD·등급·결과 상태·잔여 예산도 서버가 같은 시뮬레이션 규칙으로 다시 계산해 제공합니다. 성공 또는 퍼펙트 결과에는 추천 정책을 제공하지 않습니다.

배지 기준은 좋음 달성 `BOD ≤ 2.0`, 1mg 퍼펙트 `BOD ≤ 1.0`, 생태·시민·관리 점수 각각 `70점 이상`, 알뜰 정책 `미션 성공 및 잔여 예산 20억원 이상`입니다. 퍼펙트 달성 시 좋음 달성 배지도 함께 지급합니다.

## 후보자 리포트와 의견 조회

후보자 리포트는 하천·지역·기간을 각각 또는 함께 필터링할 수 있습니다.

```text
GET /api/candidate/report?riverId=dongcheon&district=busanjin&from=2026-08-01&to=2026-08-31
```

의견 전용 API는 같은 필터와 함께 페이지·정렬 조건을 지원합니다.

```text
GET /api/candidate/comments?riverId=dongcheon&page=1&pageSize=20&sort=latest
```

- `from`, `to`는 `YYYY-MM-DD` 형식이며 저장된 UTC 날짜를 기준으로 양끝을 모두 포함합니다.
- `page` 기본값은 1, `pageSize` 기본값은 20이고 최대 100입니다.
- `sort`는 최신순 `latest` 또는 오래된 순 `oldest`입니다.
- 빈 조회 결과도 `200`과 빈 집계를 반환합니다.
- 의견 응답에는 전체 의견 수, 전체 페이지 수, 이전·다음 페이지 여부가 포함됩니다.

## 시민 의견 키워드 분석

`/api/stats`와 후보자 리포트의 `commentKeywordAnalysis`는 내용이 있는 시민 의견을 다음 여섯 범주로 집계합니다.

- 악취
- 오염원·생활하수
- 데이터 공개
- 생태 복원
- 산책로·편의시설
- 기타

분류는 외부 AI 없이 한국어 키워드 사전으로 실행됩니다. 한 의견에서 여러 범주가 감지되면 일치한 키워드가 가장 많은 범주, 의견에 먼저 등장한 범주, 고정 범주 순서의 순으로 대표 범주 하나를 결정합니다. 따라서 범주별 `count`의 합은 항상 `totalComments`와 같습니다. 키워드가 없는 의견은 삭제하거나 변경하지 않고 `OTHER`로 집계하며, 원문 조회 기능은 그대로 유지됩니다.

`topCategories`는 집계 수가 있는 상위 세 범주이고, 후보자 리포트에 하천·지역·기간 필터가 적용되면 키워드 분석에도 같은 필터가 적용됩니다.

## 개인정보와 오류 처리

- 한 줄 의견은 Unicode를 정규화하고 제어문자와 불필요한 공백을 정리합니다.
- 이메일, 휴대전화·유선전화, 주민등록번호, 명시적인 실명, 상세 주소 패턴은 저장하지 않습니다.
- HTML 태그는 허용하지 않습니다. 프런트엔드도 의견을 HTML이 아닌 일반 텍스트로 렌더링해야 합니다.
- 모든 오류는 `code`, `message`, `details`, `requestId` 구조를 사용합니다.
- 모든 HTTP 응답의 `X-Request-ID` 헤더로 서버 로그와 오류를 연결할 수 있습니다.
- 로그에는 의견 원문, API 키, DB 접속 정보가 기록되지 않습니다.
- POST 요청은 `Content-Type: application/json`만 허용하며 본문은 16KiB로 제한합니다.

## 현재 데모 밸런스

기획안에는 하천별 BOD 감소량이 숫자로 확정되어 있지 않아 `river_api/domain.py`의 `RIVERS`에 게임용 밸런스를 격리했습니다. 모든 하천에서 직접 개선 정책 2~4개로 `좋음(Ib)`과 `매우좋음(Ia)` 조합을 만들 수 있습니다. 이 값은 실제 환경공학적 예측이 아닙니다.

점수는 화면에서 즉시 쓰기 쉽도록 기본 30점에서 정책 효과를 합산하고 100점으로 제한합니다. 이 초기값도 기획 확정 시 `BASE_SCORE` 한 곳에서 변경할 수 있습니다.

## 공유 DB 배포 메모

현재 SQLite 저장소는 로컬 개발과 단일 서버 MVP에 적합합니다. 여러 서버 인스턴스로 배포할 때는 `migrations/001_postgresql_responses.sql`, `migrations/002_candidate_query_indexes.sql`, `migrations/003_add_event_result.sql`을 순서대로 Supabase SQL Editor에서 실행하고 `.env` 또는 배포 환경변수에 다음 값을 입력합니다.

```dotenv
STORAGE_BACKEND=supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
ALLOWED_ORIGINS=https://YOUR_FRONTEND_DOMAIN
BACKUP_POLICY_CONFIRMED=true
```

Secret key는 서버에서만 사용하며 프런트엔드나 GitHub에 포함하지 않습니다. Supabase 장애가 발생하면 저장·통계 API는 내부 접속 정보를 노출하지 않고 `503 DATABASE_UNAVAILABLE`을 반환합니다.
