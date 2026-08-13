# 강 새로이 프론트엔드

부산 하천 정책 체험 서비스 `강 새로이`의 모바일 웹 프론트엔드입니다.

현재 단계에서는 디자인 적용 전 개발 기반만 제공합니다. BOD·등급·예산·점수·결과 판정은 프론트에서 계산하지 않고 백엔드 API 응답을 사용합니다.

## 기술 구성

- React
- TypeScript strict mode
- Vite
- React Router
- ESLint
- Prettier
- Vitest

## 요구 환경

- Node.js 24.x (`.nvmrc`: 24.13.0)
- npm 11.x

저장소의 기준 버전은 `package.json`의 `engines`와 `packageManager`에서 확인할 수 있습니다.

## 설치

```bash
cd frontend
npm install
```

로컬 환경변수 파일을 만듭니다.

```bash
cp .env.example .env
```

Windows 명령 프롬프트에서는 다음 명령을 사용할 수 있습니다.

```bat
copy .env.example .env
```

`.env`는 Git에서 제외됩니다. 프론트엔드 환경변수에는 공개 가능한 API 주소만 넣고 Supabase Secret key 등 비밀값을 넣지 마세요.

## 실행

```bash
npm run dev
```

기본 개발 주소는 `http://127.0.0.1:5173`입니다.

## 환경변수

| 이름                | 설명                           | 로컬 예시               |
| ------------------- | ------------------------------ | ----------------------- |
| `VITE_API_BASE_URL` | 강 새로이 백엔드 API 기본 주소 | `http://127.0.0.1:8000` |

Vite의 `VITE_` 접두사가 붙은 값은 브라우저 번들에 포함될 수 있으므로 비밀값을 사용하면 안 됩니다.

## 명령

| 명령                   | 설명                                   |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | 개발 서버 실행                         |
| `npm run build`        | 타입 검사 후 운영 빌드 생성            |
| `npm run preview`      | 운영 빌드 미리보기                     |
| `npm run lint`         | ESLint 검사                            |
| `npm run typecheck`    | TypeScript 검사                        |
| `npm run test`         | Vitest 단위 테스트 실행                |
| `npm run check`        | lint, typecheck, test 순서로 전체 검사 |
| `npm run format`       | Prettier로 파일 정리                   |
| `npm run format:check` | Prettier 형식 검사                     |

## 라우트

| 경로                | 용도                          |
| ------------------- | ----------------------------- |
| `/`                 | 서비스 소개                   |
| `/select`           | 하천 선택                     |
| `/challenge/:river` | 하천 정책 챌린지              |
| `/stats`            | 시민 통계                     |
| `/candidate`        | 후보자 대시보드와 정책 리포트 |
| 그 외               | 404 안내                      |

각 페이지는 lazy loading으로 분리되어 있습니다. 라우트 렌더링 오류는 라우트 오류 화면이 처리하고, 그 밖의 렌더링 오류는 최상위 오류 경계가 처리합니다.

## 모바일 화면 기준

- 디자인 기준: 412×917px
- 콘텐츠 최대 너비: 412px
- 최소 지원 너비: 320px
- 긴 화면은 세로 스크롤 허용
- 모바일 안전 영역 적용

현재 스타일은 구조 확인을 위한 임시값이며 최종 디자인이 아닙니다.

## 백엔드 함께 실행하기

백엔드는 기본적으로 `http://127.0.0.1:8000`을 사용합니다. 다른 주소를 사용한다면 `.env`의 `VITE_API_BASE_URL`을 바꾸고, 백엔드 `ALLOWED_ORIGINS`에 실제 프론트엔드 주소를 허용해야 합니다.
