import { Link } from 'react-router-dom'

import { PagePlaceholder } from '../components/PagePlaceholder'

export default function HomePage() {
  return (
    <PagePlaceholder
      eyebrow="첫 화면"
      title="강 새로이"
      description="부산 하천을 새롭게 만드는 시민 정책 체험의 기능 기반 화면입니다."
    >
      <Link to="/select">하천 구하러 가기</Link>
      <Link to="/stats">시민 통계 보기</Link>
      <Link to="/candidate">후보자 대시보드</Link>
    </PagePlaceholder>
  )
}
