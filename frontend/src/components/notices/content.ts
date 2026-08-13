export type RequiredNoticeContent = {
  simulation: string
  demoData: string
  privacy: string
  representativeness: string
}

export const DEFAULT_REQUIRED_NOTICES: RequiredNoticeContent = {
  simulation:
    'BOD 변화량은 정책의 의미를 이해하기 위한 체험용 수치이며 실제 수질 개선량을 예측하거나 보장하지 않습니다.',
  demoData: '현재 하천 수치와 참여 통계에는 기능 검증을 위한 데모 데이터가 포함될 수 있습니다.',
  privacy:
    '의견은 익명으로 집계합니다. 이름, 전화번호, 이메일, 주민등록번호와 정확한 주소를 입력하지 마세요.',
  representativeness: '참여 통계는 자발적 참여 결과이며 부산 시민 전체를 대표하지 않습니다.',
}
