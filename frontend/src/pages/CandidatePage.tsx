import { Link } from 'react-router-dom'

import { PagePlaceholder } from '../components/PagePlaceholder'

export default function CandidatePage() {
  return (
    <PagePlaceholder
      eyebrow="후보자 대시보드"
      title="시민 정책 리포트"
      description="필터, 통계, 의견 목록과 인쇄 기능은 후속 작업에서 연결합니다."
    >
      <Link to="/">첫 화면으로</Link>
      <Link to="/stats">시민 통계 보기</Link>
    </PagePlaceholder>
  )
}
