import type { ReactNode } from 'react'

import { AppHeader, Badge, Card, PageLayout, RequiredNotices } from './index'

type PagePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
  backTo?: string
  showRepresentativeness?: boolean
}

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  children,
  backTo,
  showRepresentativeness = false,
}: PagePlaceholderProps) {
  return (
    <PageLayout
      header={<AppHeader backTo={backTo} />}
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      <Card
        tone="outlined"
        title="기능 기반 준비 중"
        description="최종 디자인이 전달되면 토큰과 공통 컴포넌트 외형을 교체합니다."
      >
        <div className="button-stack">
          <Badge tone="info">디자인 적용 전 화면</Badge>
          {children}
        </div>
      </Card>
      <RequiredNotices showRepresentativeness={showRepresentativeness} />
    </PageLayout>
  )
}
