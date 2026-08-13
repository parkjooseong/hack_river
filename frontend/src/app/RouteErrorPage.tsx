import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { AppHeader, ErrorState, LinkButton, PageLayout } from '../components'

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} 오류로 화면을 불러오지 못했습니다.`
  }

  return '예상하지 못한 오류로 화면을 불러오지 못했습니다.'
}

export function RouteErrorPage() {
  const error = useRouteError()

  return (
    <div className="app-shell">
      <PageLayout header={<AppHeader />} eyebrow="라우트 오류" title="문제가 발생했습니다.">
        <ErrorState
          description={getErrorMessage(error)}
          action={<LinkButton to="/">첫 화면으로</LinkButton>}
        />
      </PageLayout>
    </div>
  )
}
