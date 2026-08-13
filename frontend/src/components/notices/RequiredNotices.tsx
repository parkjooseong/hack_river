import { Notice } from '../ui'
import { DEFAULT_REQUIRED_NOTICES, type RequiredNoticeContent } from './content'

export type RequiredNoticesProps = {
  content?: Partial<RequiredNoticeContent>
  showRepresentativeness?: boolean
}

export function RequiredNotices({ content, showRepresentativeness = false }: RequiredNoticesProps) {
  const notices = { ...DEFAULT_REQUIRED_NOTICES, ...content }

  return (
    <aside className="notice-list" aria-label="서비스 이용 안내">
      <Notice tone="info" title="체험용 시뮬레이션 안내">
        {notices.simulation}
      </Notice>
      <Notice title="데모 데이터 안내">{notices.demoData}</Notice>
      <Notice tone="warning" title="익명 의견 작성 안내" icon="!">
        {notices.privacy}
      </Notice>
      {showRepresentativeness ? (
        <Notice title="통계 해석 안내">{notices.representativeness}</Notice>
      ) : null}
    </aside>
  )
}
