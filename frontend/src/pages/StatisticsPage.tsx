import { Link } from 'react-router-dom'

import { PagePlaceholder } from '../components/PagePlaceholder'

export default function StatisticsPage() {
  return (
    <PagePlaceholder
      eyebrow="시민 통계"
      title="시민의 선택을 확인하세요."
      description="참여자, 정책 선택률, 달성률과 익명 의견은 API 연동 단계에서 표시합니다."
    >
      <Link to="/">첫 화면으로</Link>
      <Link to="/candidate">후보자 대시보드</Link>
    </PagePlaceholder>
  )
}
