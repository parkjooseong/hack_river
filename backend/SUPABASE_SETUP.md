# Supabase 공유 DB 설정 방법

백엔드 코드는 Supabase 공유 DB 연결을 지원하도록 구현되어 있습니다. 실제 연결을 완료하려면 Supabase 프로젝트 한 개와 서버 전용 Secret key가 필요합니다.

## 필요한 계정 정보

필수 값은 두 개입니다.

| 환경변수 | 어디에서 확인하는지 | 예시 |
|---|---|---|
| `SUPABASE_URL` | Supabase Dashboard의 `Connect` 또는 `Integrations > Data API` | `https://abcdefgh.supabase.co` |
| `SUPABASE_SECRET_KEY` | `Settings > API Keys > Secret keys` | `sb_secret_...` |

`SUPABASE_SECRET_KEY`는 데이터베이스의 Row Level Security를 우회할 수 있는 서버 전용 비밀키입니다.

- 프런트엔드 React 코드에 넣지 않습니다.
- GitHub에 커밋하지 않습니다.
- 채팅, 메신저, 이메일로 전달하지 않습니다.
- 배포 서비스에서는 해당 서비스의 Secret/Environment Variables 기능에 저장합니다.
- 노출되었다면 Supabase Dashboard에서 즉시 폐기하고 새 키를 발급합니다.

## 1. Supabase 프로젝트 만들기

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인합니다.
2. `New project`를 선택합니다.
3. 프로젝트 이름과 안전한 데이터베이스 비밀번호를 설정합니다.
4. 리전은 실제 서비스 이용자와 가까운 위치를 선택합니다.
5. 프로젝트 생성이 끝날 때까지 기다립니다.

데이터베이스 비밀번호는 현재 REST 연결 코드에는 넣지 않지만, Supabase 관리와 직접 DB 연결에 필요하므로 별도로 안전하게 보관합니다.

## 2. responses 테이블 만들기

1. Supabase Dashboard에서 `SQL Editor`를 엽니다.
2. `New query`를 선택합니다.
3. 이 프로젝트의 `backend/migrations/001_postgresql_responses.sql` 전체를 복사합니다.
4. `Run`을 누릅니다.
5. `backend/migrations/002_candidate_query_indexes.sql`도 새 쿼리에서 실행합니다.
6. `backend/migrations/003_add_event_result.sql`도 새 쿼리에서 실행합니다.

이 SQL은 다음 작업을 함께 수행합니다.

- `public.responses` 테이블 생성
- 필요한 인덱스 생성
- 후보자 리포트의 하천·지역·날짜 필터와 의견 페이지 조회용 인덱스 생성
- 돌발상황 선택·비용·점수 효과 저장 컬럼 생성
- Row Level Security 활성화
- 브라우저용 `anon`, `authenticated` 역할의 직접 접근 차단
- 서버용 `service_role`에 `SELECT`, `INSERT` 권한 부여

## 3. Secret key 만들기

1. Supabase Dashboard에서 `Settings > API Keys`로 이동합니다.
2. `Secret keys`에서 백엔드 전용 키를 생성합니다.
3. 구분하기 쉬운 이름을 사용합니다. 예: `river-backend`
4. 발급된 `sb_secret_...` 값을 안전한 곳에 보관합니다.

기존 프로젝트에 Secret key 메뉴가 없다면 Legacy API Keys의 `service_role` 키도 코드에서 지원합니다. 다만 새 프로젝트는 `SUPABASE_SECRET_KEY` 사용을 권장합니다.

## 4. 로컬 .env 입력

`backend/.env`를 열어 다음 세 값을 수정합니다.

```dotenv
STORAGE_BACKEND=supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
```

나머지 값은 특별한 이유가 없다면 그대로 사용합니다.

```dotenv
SUPABASE_TABLE=responses
SUPABASE_TIMEOUT_SECONDS=10
```

`.env`는 `backend/.gitignore`에 등록되어 Git이 추적하지 않습니다. 공유용 형식은 `.env.example`에만 유지합니다.

## 5. 연결 확인

백엔드 폴더에서 실행합니다.

```bash
python3 -m river_api
```

정상이라면 다음 메시지가 표시됩니다.

```text
강 새로이 API listening on http://127.0.0.1:8000
```

테이블이 없거나 URL·키가 틀리면 서버가 시작되지 않고 Secret key를 포함하지 않는 설정 오류만 표시합니다.

다른 터미널에서 다음 순서로 확인합니다.

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/stats
```

참여 응답을 한 건 제출한 뒤 `/api/stats`의 `totalParticipants`가 증가하고 서버를 재시작해도 유지되면 연결이 완료된 것입니다.

## 6. 배포 환경 설정

Vercel, Render, Railway 등 실제 배포 환경에서는 `.env` 파일을 업로드하지 않고 다음 값을 환경변수 또는 Secret으로 직접 등록합니다.

```text
STORAGE_BACKEND=supabase
SUPABASE_URL=프로젝트 URL
SUPABASE_SECRET_KEY=서버 전용 Secret key
SUPABASE_TABLE=responses
SUPABASE_TIMEOUT_SECONDS=10
ALLOWED_ORIGINS=실제 프런트엔드 주소
BACKUP_POLICY_CONFIRMED=true
```

`ALLOWED_ORIGINS` 예시:

```text
https://river-example.vercel.app
```

운영 환경에는 `localhost` 주소를 남기지 않는 것을 권장합니다.

`BACKUP_POLICY_CONFIRMED`는 애플리케이션 동작을 바꾸지 않는 배포 점검용 값입니다. Supabase Dashboard에서 현재 프로젝트 요금제의 백업·복구 기능과 운영팀의 복구 절차를 확인한 뒤에만 `true`로 설정합니다.

배포 전에 비밀값을 출력하지 않는 자동 점검을 실행합니다.

```bash
python3 scripts/predeploy_check.py --check-database
```

## SQLite로 다시 실행하기

Supabase 연결 없이 로컬 기능만 시험하려면 다음 값으로 되돌립니다.

```dotenv
STORAGE_BACKEND=sqlite
```

이 경우 `DATABASE_PATH`의 로컬 SQLite 파일을 사용합니다.
