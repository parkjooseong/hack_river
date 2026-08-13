import { Link } from 'react-router-dom'

import { PagePlaceholder } from '../components/PagePlaceholder'

export default function SelectRiverPage() {
  return (
    <PagePlaceholder
      eyebrow="하천 선택"
      title="도전할 하천을 선택하세요."
      description="하천 데이터와 캐릭터 카드는 API 연동 단계에서 추가합니다."
    >
      <Link to="/challenge/dongcheon">동천</Link>
      <Link to="/challenge/goejeongcheon">괴정천</Link>
      <Link to="/challenge/oncheoncheon">온천천</Link>
      <Link to="/">첫 화면으로</Link>
    </PagePlaceholder>
  )
}
