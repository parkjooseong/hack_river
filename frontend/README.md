# 강 새로이 프론트엔드

부산 하천 정책 체험 서비스 `강 새로이`의 모바일 웹 프론트엔드입니다.

현재 단계에서는 디자인 적용 전 기능 화면과 개발 기반을 제공합니다. BOD·등급·예산·점수·결과 판정은 프론트에서 계산하지 않고 백엔드 API 응답을 사용합니다.

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

| 명령                        | 설명                                                  |
| --------------------------- | ----------------------------------------------------- |
| `npm run dev`               | 개발 서버 실행                                        |
| `npm run build`             | 타입 검사 후 운영 빌드 생성                           |
| `npm run preview`           | 운영 빌드 미리보기                                    |
| `npm run lint`              | ESLint 검사                                           |
| `npm run typecheck`         | TypeScript 검사                                       |
| `npm run test`              | Vitest 단위 테스트 실행                               |
| `npm run test:design-ready` | 디자인 전 화면·접근성·반응형 기반 검사                |
| `npm run check`             | OpenAPI, 디자인 기반, lint, typecheck, test 전체 검사 |
| `npm run api:types`         | OpenAPI에서 TypeScript 타입 다시 생성                 |
| `npm run api:types:check`   | OpenAPI와 생성된 타입의 일치 여부 검사                |
| `npm run format`            | Prettier로 파일 정리                                  |
| `npm run format:check`      | Prettier 형식 검사                                    |

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
- 주요 터치 영역: 최소 44×44px
- 412px보다 넓은 화면: 앱 영역 가운데 정렬
- 키보드 포커스와 모션 감소 설정 지원

현재 스타일은 구조 확인을 위한 임시값이며 최종 디자인이 아닙니다.

## 캐릭터·애니메이션 교체 구조

하천 캐릭터는 화면에서 임의 표정 문자열을 만들지 않고 다음 상태를 `RiverCharacter`에 전달합니다.

- `riverId`: 동천·괴정천·온천천
- `grade`: Ia·Ib·II·III·IV·V·VI
- `eventState`: 기본·돌발상황 대기·해결·걱정
- `resultStatus`: 진행 중·재도전·성공·퍼펙트

디자인 자산이 없는 현재는 단순 인라인 SVG 표정을 표시합니다. 최종 자산을 받으면 `src/features/character/model.ts`의 `RIVER_CHARACTER_ASSETS`에 SVG 경로를 연결하며, 하천 선택·챌린지·결과 화면의 상태 관리 코드는 변경하지 않습니다. 예상 파일명과 연결 절차는 `src/features/character/README.md`에 정리되어 있습니다.

등급이나 결과가 바뀌면 표정 전환과 결과 효과가 실행되고 BOD 게이지도 새 값으로 이동합니다. `prefers-reduced-motion: reduce` 환경에서는 애니메이션을 제거하되 등급·상태 설명과 결과 문구는 그대로 제공합니다.

## 공통 UI와 디자인 토큰

최종 디자인이 전달되기 전까지 기능 개발에 사용할 공통 UI 뼈대를 제공합니다.

```text
src/
├─ components/
│  ├─ layout/     # 헤더, 페이지, 섹션, 하단 주요 작업 영역
│  ├─ notices/    # 시뮬레이션·데모·개인정보·통계 안내
│  └─ ui/         # 버튼, 카드, 배지, 게이지, 모달, 폼, 상태 화면
└─ styles/
   ├─ tokens.css      # 색상, 글꼴, 간격, 모서리, 그림자, 모션
   ├─ reset.css       # 기본화와 접근성 공통 규칙
   ├─ components.css  # 공통 UI 외형
   └─ global.css      # 412px 앱 컨테이너와 페이지 레이아웃
```

제공하는 주요 컴포넌트는 다음과 같습니다.

- `Button`, `LinkButton`
- `Card`, `Badge`, `ProgressBar`
- `Modal`
- `TextInput`, `Textarea`, `Select`
- `LoadingState`, `EmptyState`, `ErrorState`
- `Notice`, `RequiredNotices`
- `AppHeader`, `PageLayout`, `PageSection`, `BottomActionBar`

```tsx
import { Button, Card, PageLayout, ProgressBar } from './components'

export function ChallengePreview() {
  return (
    <PageLayout title="동천의 수질을 회복하세요.">
      <Card title="현재 상태">
        <ProgressBar label="생태 점수" value={68} valueText="68점" />
      </Card>
      <Button fullWidth>결과 확인하기</Button>
    </PageLayout>
  )
}
```

최종 디자인 적용 시 기능 컴포넌트의 사용 방식을 바꾸지 않고 `src/styles/tokens.css`의 값과 공통 컴포넌트 외형을 우선 교체합니다.

## 시민용 핵심 흐름

디자인 확정 전에도 다음 시민 여정을 실제 API와 연결해 끝까지 진행할 수 있습니다.

1. `/`에서 서비스와 성공 기준 확인
2. `/select`에서 동천·괴정천·온천천 선택
3. `/challenge/:river`에서 정책 선택, 돌발상황 대응, 결과 확인
4. 최우선 정책·지역·한 줄 의견을 익명 결과로 제출
5. `/stats`에서 참여자·정책·달성률·익명 의견 통계 확인

챌린지 화면은 BOD·수질등급·점수·예산·배지·추천 정책을 서버 응답 그대로 표시합니다. 잘못된 하천 주소, 최초 로딩, 네트워크·서버 오류, 통계 0건에도 별도 안내 화면을 제공합니다.

## 시민 통계와 후보자 리포트

`/stats`는 총 참여자·오늘 참여자·달성률·평균 등급 개선과 하천별 성과, 정책 선택률, 시민 의견 키워드, 최신 익명 의견을 표시합니다. 집계가 없을 때는 빈 상태를 보여 주며, 자발적 참여 통계가 부산 시민 전체를 대표하지 않는다는 안내를 함께 제공합니다.

`/candidate`는 다음 조회·공유 기능을 제공합니다.

- 총 참여자, 오늘 참여자, 성공률, 퍼펙트율과 정책 결과
- 하천별·지역별 우선 정책, 의견 키워드, 조사 방법론
- 하천·지역·UTC 날짜 범위 필터
- 시민 의견 최신순·오래된 순 정렬과 10건 단위 페이지네이션
- URL query string을 이용한 필터·정렬·페이지 복원과 링크 공유
- `PDF로 저장·인쇄` 버튼과 A4 인쇄 전용 레이아웃

필터 예시는 `/candidate?riverId=dongcheon&district=busanjin&sort=oldest&page=2`입니다. 존재하지 않는 페이지 번호는 해당 조건의 마지막 유효 페이지로 자동 복구합니다. 후보자 화면은 Supabase Auth 비밀번호 로그인 후에만 열리며, 리포트·의견 API도 같은 액세스 토큰을 검증합니다. 계정 생성과 환경변수는 [`backend/CANDIDATE_AUTH_SETUP.md`](../backend/CANDIDATE_AUTH_SETUP.md)를 따릅니다.

### 챌린지 상태 복구

진행 중인 챌린지는 하천별 `sessionStorage`에만 임시 저장합니다.

- 정책 선택 순서와 한 번 처리한 돌발상황
- 결과 확인·의견 작성 단계
- 최우선 정책, 지역, 작성 중인 한 줄 의견, 익명 집계 동의

새로고침하면 저장값의 정책·이벤트·설문 값을 검증하고 `/api/simulations`를 다시 호출해 최신 서버 결과로 복구합니다. 손상된 값이나 알 수 없는 정책은 복구하지 않으며, 저장소가 차단되어도 현재 메모리 상태로 계속 이용할 수 있습니다.

다시 도전하거나 제출에 성공하면 세션 데이터를 즉시 제거합니다. 제출 완료 결과와 시민 의견은 `localStorage` 등 브라우저 영구 저장소에 보관하지 않습니다. 빠른 정책 변경은 이전 요청을 취소하고 최신 응답만 적용하며, 제출 요청은 처리 중인 요청을 공유해 중복 저장을 막습니다.

## API 계층

`src/api/`가 백엔드 통신을 담당합니다. 화면에서는 URL이나 `fetch`를 직접 사용하지 않고 `riverApi`의 기능 단위 함수를 사용합니다.

```ts
import { isApiError, riverApi } from './api'

try {
  const config = await riverApi.getGameConfig()
  console.log(config.serviceName)
} catch (error) {
  if (isApiError(error)) {
    console.log(error.userMessage, error.requestId)
  }
}
```

제공하는 함수는 다음과 같습니다.

- `getHealth()`
- `getGameConfig()`
- `simulate(request)`
- `submitResponse(request)`
- `getStatistics()`
- `getCandidateReport(accessToken, query)`
- `getCandidateComments(accessToken, query)`

시뮬레이션 요청은 새 요청이 시작되면 이전 요청을 취소합니다. 응답 제출은 처리 중인 요청을 공유해 중복 전송을 막습니다.

API 오류는 다음 정보를 가진 `ApiError`로 변환됩니다.

- `kind`: HTTP, 네트워크, 타임아웃, 취소, 잘못된 응답 구분
- `code`: 백엔드 또는 프론트 오류 코드
- `userMessage`: 내부 정보를 숨긴 사용자용 메시지
- `status`: HTTP 상태
- `requestId`: 백엔드 로그 문의용 요청 ID
- `details`: 검증 오류 상세

### OpenAPI 타입

`src/api/schema.d.ts`는 `backend/openapi.yaml`에서 자동 생성되므로 직접 수정하지 않습니다. 백엔드 계약이 변경되면 다음 명령을 실행합니다.

```bash
npm run api:types
npm run check
```

생성된 타입을 갱신하지 않고 OpenAPI만 변경하면 `npm run api:types:check`가 실패합니다.
백엔드·프론트 공통 계약과 변경 순서는 [`backend/API_CONTRACT.md`](../backend/API_CONTRACT.md)에 정리되어 있습니다. 백엔드 자동 테스트는 7개 실제 성공 응답이 OpenAPI 스키마와 일치하는지 함께 검증합니다.

### Mock API

백엔드 없이 화면을 개발할 때는 `src/api/mock`의 고정 응답을 사용할 수 있습니다.

```ts
import { ApiClient, RiverApi } from './api'
import { createMockFetch } from './api/mock'

const mockApi = new RiverApi(
  new ApiClient({
    baseUrl: 'http://mock.local',
    fetch: createMockFetch(),
  }),
)
```

`createMockFetch`의 `failures`와 `delayMs` 옵션으로 검증 오류, DB 장애, 서버 오류, 로딩과 타임아웃 화면도 재현할 수 있습니다.

## 백엔드 함께 실행하기

백엔드는 기본적으로 `http://127.0.0.1:8000`을 사용합니다. 다른 주소를 사용한다면 `.env`의 `VITE_API_BASE_URL`을 바꾸고, 백엔드 `ALLOWED_ORIGINS`에 실제 프론트엔드 주소를 허용해야 합니다.
