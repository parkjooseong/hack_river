import { Link } from 'react-router-dom'

import { PagePlaceholder } from '../components/PagePlaceholder'

export default function NotFoundPage() {
  return (
    <PagePlaceholder
      eyebrow="404"
      title="페이지를 찾을 수 없습니다."
      description="주소가 올바른지 확인하거나 첫 화면으로 돌아가 주세요."
    >
      <Link to="/">첫 화면으로</Link>
    </PagePlaceholder>
  )
}
