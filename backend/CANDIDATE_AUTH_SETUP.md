# 후보자 대시보드 Supabase Auth 설정

후보자 대시보드는 Supabase Auth에 등록한 계정 하나로 접근합니다. 비밀번호 원문은 코드, `.env`, DB 테이블에 저장하지 않습니다.

## 1. 계정과 비밀번호 등록

1. Supabase Dashboard에서 현재 프로젝트를 엽니다.
2. `Authentication` → `Users` → `Add user` → `Create new user`로 이동합니다.
3. 후보자 전용 이메일과 강한 비밀번호를 입력합니다.
4. 이메일 확인 메일을 쓰지 않는 전용 계정이면 `Auto Confirm User`를 켜고 생성합니다.
5. 가능하면 `Authentication` 설정에서 일반 사용자의 자체 회원가입을 끄고, 관리자가 만든 계정만 사용합니다.

`CANDIDATE_AUTH_EMAIL`과 `VITE_CANDIDATE_AUTH_EMAIL`에는 3번에서 생성한 **같은 이메일**을 입력합니다. 비밀번호는 Supabase에서만 설정하고 어떤 환경변수에도 넣지 않습니다.

## 2. API 키 확인

Supabase Dashboard의 `Project Settings` → `API Keys`에서 다음 값을 확인합니다.

- Project URL: 기존 `SUPABASE_URL`과 같은 값
- Publishable key: `sb_publishable_...`로 시작하는 공개 키

`sb_secret_...` Secret key는 기존처럼 백엔드에만 두고 프론트엔드에 입력하지 않습니다.

## 3. 백엔드 설정

`backend/.env`와 Render의 API 서비스 환경변수에 추가합니다.

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
CANDIDATE_AUTH_EMAIL=candidate@your-domain.example
SUPABASE_AUTH_TIMEOUT_SECONDS=10
```

## 4. 프론트엔드 설정

`frontend/.env`와 Render의 Web 서비스 환경변수에 추가합니다.

```dotenv
VITE_API_BASE_URL=https://YOUR_BACKEND_DOMAIN
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
VITE_CANDIDATE_AUTH_EMAIL=candidate@your-domain.example
```

Vite 환경변수는 빌드 시점에 들어가므로 Render에서 수정한 뒤 프론트엔드를 재배포합니다.

## 5. 확인

1. 메인 화면의 `후보자 대시보드`를 누릅니다.
2. Supabase Auth에서 설정한 비밀번호만 입력합니다.
3. 올바른 비밀번호로 리포트가 열리는지, 로그아웃 후 잠기는지 확인합니다.
4. 비로그인 상태에서 `/api/candidate/report`를 호출하면 `401 CANDIDATE_AUTH_REQUIRED`가 반환되어야 합니다.

공용 계정은 소규모 MVP에 적합합니다. 사용자별 접근 기록과 개별 회수가 필요해지면 Supabase Auth 계정을 사용자별로 나누어야 합니다.
