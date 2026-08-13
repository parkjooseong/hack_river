import { AppHeader, Badge, Card, LinkButton, Notice, PageLayout, PageSection } from '../components'

export default function HomePage() {
  return (
    <PageLayout
      eyebrow="첫 화면"
      title="강 새로이"
      description="부산 하천을 새롭게 만드는 시민 정책 체험"
      header={<AppHeader />}
    >
      <Card className="hero-card" title="좋음까지 회복하면 성공, 1mg은 퍼펙트.">
        <p>
          당신에게 100억원의 정책 예산이 주어졌습니다. 동천·괴정천·온천천의 정책을 선택해 하천
          친구의 표정을 되찾아 주세요.
        </p>
        <div className="badge-row" aria-label="미션 성공 기준">
          <Badge tone="success">BOD 2.0mg/L 이하 성공</Badge>
          <Badge tone="info">BOD 1.0mg/L 이하 퍼펙트</Badge>
        </div>
      </Card>

      <PageSection
        title="어떻게 참여하나요?"
        description="수치는 서버가 계산하며 선택 결과를 직접 비교해 볼 수 있습니다."
      >
        <ol className="step-list">
          <li>도전할 하천을 선택합니다.</li>
          <li>100억원 안에서 정책 조합을 시험합니다.</li>
          <li>돌발상황에 대응하고 결과를 확인합니다.</li>
          <li>원하면 익명 의견을 남기고 시민 통계를 확인합니다.</li>
        </ol>
      </PageSection>

      <Notice tone="info" title="체험용 시뮬레이션 안내">
        본 게임의 BOD 변화는 정책 이해를 돕기 위한 체험용 수치이며 실제 정책 시행 후의 수질을
        예측하거나 보장하지 않습니다.
      </Notice>

      <div className="button-stack">
        <LinkButton to="/select" fullWidth size="large">
          하천 구하러 가기
        </LinkButton>
        <LinkButton to="/stats" variant="secondary" fullWidth>
          시민 통계 보기
        </LinkButton>
        <LinkButton to="/candidate" variant="ghost" fullWidth>
          후보자 대시보드
        </LinkButton>
      </div>
    </PageLayout>
  )
}
