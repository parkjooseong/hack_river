import { Link, useParams } from 'react-router-dom'

import { PagePlaceholder } from '../components/PagePlaceholder'

export default function ChallengePage() {
  const { river = 'unknown' } = useParams()

  return (
    <PagePlaceholder
      eyebrow="챌린지"
      title={`${river} 하천 미션`}
      description="정책 선택, 서버 계산, 돌발상황, 결과와 의견 제출 흐름은 후속 작업에서 연결합니다."
    >
      <Link to="/select">다른 하천 선택</Link>
      <Link to="/stats">시민 통계 보기</Link>
    </PagePlaceholder>
  )
}
