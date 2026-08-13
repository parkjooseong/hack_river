# 강 새로이 API 계약

## 단일 기준

- 기계가 읽는 최종 계약은 [`openapi.yaml`](openapi.yaml)입니다.
- 백엔드는 이 문서의 요청·응답 스키마를 지켜야 합니다.
- 프론트엔드는 이 문서에서 `src/api/schema.d.ts`를 생성하고, 직접 수정하지 않습니다.
- 계약이 바뀌면 백엔드 응답 검사와 프론트 타입 검사를 모두 통과시켜야 합니다.

## 확정된 7개 API

| 기능          | 메서드·경로                   | 요청                  | 성공 응답               | 프론트 사용처         |
| ------------- | ----------------------------- | --------------------- | ----------------------- | --------------------- |
| 서버 상태     | `GET /health`                 | 없음                  | `HealthResponse`        | 배포 점검             |
| 게임 설정     | `GET /api/game/config`        | 없음                  | `GameConfig`            | 하천 선택·챌린지·설문 |
| 정책 계산     | `POST /api/simulations`       | `SimulationRequest`   | `SimulationResult`      | 챌린지 결과           |
| 응답 저장     | `POST /api/responses`         | `SubmissionRequest`   | `SubmissionResponse`    | 최종 제출             |
| 시민 통계     | `GET /api/stats`              | 없음                  | `Statistics`            | 시민 통계             |
| 후보자 리포트 | `GET /api/candidate/report`   | 하천·지역·기간 필터   | `CandidateReport`       | 후보자 대시보드       |
| 후보자 의견   | `GET /api/candidate/comments` | 공통 필터·페이지·정렬 | `CandidateCommentsPage` | 후보자 의견 목록      |

## 공통 규칙

- HTTP JSON 응답과 요청은 `application/json`을 사용합니다.
- 모든 HTTP 응답은 32자 소문자 16진수 `X-Request-ID` 헤더를 포함합니다.
- 오류 본문은 `error.code`, `error.message`, `error.details`, `error.requestId`로 고정합니다.
- `error.requestId`는 응답 헤더의 `X-Request-ID`와 같습니다.
- 요청 객체의 정의되지 않은 필드와 응답 객체의 예상하지 못한 필드를 허용하지 않습니다.
- BOD·등급·예산·점수·결과 판정은 백엔드만 계산하며 프론트는 응답을 표시만 합니다.
- `RiverId`, `PolicyId`, `DistrictId`, `TopPriorityId`, `EventChoiceId`는 OpenAPI에 선언된 열거형만 사용합니다.

## 변경 순서

1. `backend/openapi.yaml`에 요청·응답 변경을 먼저 반영합니다.
2. 백엔드 구현과 `tests/test_openapi_contract.py`를 같이 갱신합니다.
3. 프론트엔드에서 `npm run api:types`로 생성 타입을 갱신합니다.
4. 실제 응답과 프론트 mock을 함께 수정합니다.
5. 아래 검사를 모두 통과한 후 합칩니다.

```bash
cd backend
python3 -m pip install -r requirements-dev.txt
python3 -m unittest discover -s tests -v

cd ../frontend
npm run api:types:check
npm run check
```

## 7.5 대조 결과

- 7개 경로와 메서드는 백엔드·OpenAPI·프론트엔드에 모두 존재합니다.
- 기존에 자유 형식이던 `GameConfig`, `SimulationResult`, `Statistics`, `CandidateReport`의 모든 하위 필드를 명시적 스키마로 확정했습니다.
- 백엔드의 7개 실제 성공 응답과 대표 400·40 OpenAPI 스키마 검사를 자동으로 통과합니다.
- 프론트 mock은 실제 백엔드와 같은 필드명과 완전한 응답 구조를 사용합니다.
- 프론트 화면 모델에서 자유 형식 응답을 보정하던 `unknown` 캐스팅과 임시 필드 추론을 제거했습니다.
