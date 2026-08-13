# 1mg Challenge Backend

기획안의 디자인 비의존 기능을 먼저 구현한 Python 3.12 API입니다. 외부 패키지 없이 실행되며, 서버가 BOD·등급·예산·점수를 다시 계산한 뒤 익명 응답만 저장합니다. 로컬 SQLite와 Supabase 공유 DB를 선택할 수 있습니다.

## 바로 실행

```bash
cd backend
python3 -m unittest discover -s tests -v
python3 -m river_api
```

기본 주소는 `http://127.0.0.1:8000`, 데이터 파일은 `data/river_api.db`입니다.

기본 설정은 `backend/.env`에서 읽습니다. Supabase 계정 연결은 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)를 따르세요.

## API

| Method | Path | 용도 |
|---|---|---|
| `GET` | `/health` | 서버 상태 |
| `GET` | `/api/game/config` | 하천·정책·등급·선택지 |
| `POST` | `/api/simulations` | 선택 조합의 서버 계산 |
| `POST` | `/api/responses` | 동의한 익명 결과 저장 |
| `GET` | `/api/stats` | 시민 통계 |
| `GET` | `/api/candidate/report` | 후보자 리포트 집계 |

프런트엔드 연동 계약은 `openapi.yaml`에도 정리되어 있습니다.

계산 요청 예시:

```json
{
  "riverId": "dongcheon",
  "policyIds": ["sewer", "treatment", "sourceBlock"]
}
```

응답 저장 요청 예시:

```json
{
  "riverId": "dongcheon",
  "policyIds": ["sewer", "treatment", "sourceBlock"],
  "topPriority": "source_control",
  "district": "busanjin",
  "comment": "생활하수 문제부터 해결해 주세요.",
  "consentToAggregate": true
}
```

`finalBod`, 점수, 성공 여부 같은 계산 결과는 클라이언트가 저장 요청에 넣을 수 없습니다. 서버가 정책 ID를 기준으로 다시 계산합니다. 이름·전화번호·이메일·정확한 주소처럼 정의되지 않은 필드도 거부합니다.

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

현재 SQLite 저장소는 로컬 개발과 단일 서버 MVP에 적합합니다. 여러 서버 인스턴스로 배포할 때는 `migrations/001_postgresql_responses.sql`을 Supabase SQL Editor에서 실행하고 `.env` 또는 배포 환경변수에 다음 값을 입력합니다.

```dotenv
STORAGE_BACKEND=supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
```

Secret key는 서버에서만 사용하며 프런트엔드나 GitHub에 포함하지 않습니다. Supabase 장애가 발생하면 저장·통계 API는 내부 접속 정보를 노출하지 않고 `503 DATABASE_UNAVAILABLE`을 반환합니다.
