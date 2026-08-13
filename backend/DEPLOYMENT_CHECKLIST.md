# 강 새로이 배포 체크리스트

## 자동 검증 완료

- [x] 게임 설정 → 계산 → 저장 → 통계 → 후보자 리포트 → 의견 조회 HTTP 통합 테스트
- [x] 서버 재시작 후 SQLite 참여 데이터 유지
- [x] 결과값 변조·집계 미동의·개인정보·예산 초과 요청 거부
- [x] 허용 Origin에만 CORS 헤더 제공
- [x] Supabase 마이그레이션 1~3과 실제 테이블 읽기
- [x] 데모 데이터·비예측·개인정보 비수집·통계 비대표성 안내 데이터 제공
- [x] OpenAPI 문법과 내부 참조 검증

## 운영 전에 사람이 확정할 항목

- [ ] 프런트엔드 HTTPS 배포 주소 확정
- [ ] 배포 환경의 `ALLOWED_ORIGINS`를 해당 주소로 제한
- [ ] Supabase 프로젝트의 백업 또는 복구 정책 확인
- [ ] 확인 후 배포 환경에 `BACKUP_POLICY_CONFIRMED=true` 설정
- [ ] 프런트 화면에서 API의 필수 안내 문구가 실제로 표시되는지 확인
- [ ] 운영 Supabase에 테스트 응답 1건을 저장하고 통계·리포트 반영 확인
- [ ] 테스트 응답을 관리자 SQL로 삭제하거나 실제 응답으로 유지할지 결정

현재 저장소에는 프런트엔드 코드와 실제 배포 주소가 없으므로 화면 표시와 운영 CORS는 백엔드만으로 확정할 수 없습니다. 운영 DB 쓰기 테스트는 통계를 변경하므로 명시적인 승인 후 실행합니다.

## 자동 점검 명령

```bash
cd backend
python3 -m unittest discover -s tests -v
python3 scripts/predeploy_check.py --check-database
```

점검 도구는 URL이나 Secret key의 실제 값을 출력하지 않습니다. 운영 설정이 올바르면 모든 항목이 `[PASS]`이고 마지막 줄이 `result=PASS failed=0`이어야 합니다.

## 운영 환경변수

```dotenv
STORAGE_BACKEND=supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
SUPABASE_TABLE=responses
SUPABASE_TIMEOUT_SECONDS=10
ALLOWED_ORIGINS=https://YOUR_FRONTEND_DOMAIN
BACKUP_POLICY_CONFIRMED=true
```

`.env` 파일을 배포하지 말고 배포 서비스의 Secret 또는 Environment Variables 기능을 사용합니다.
