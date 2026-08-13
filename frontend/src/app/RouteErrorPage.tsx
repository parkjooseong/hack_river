import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

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
      <main className="page-placeholder" role="alert">
        <p className="page-placeholder__label">라우트 오류</p>
        <h1>문제가 발생했습니다.</h1>
        <p>{getErrorMessage(error)}</p>
        <div className="page-placeholder__links">
          <Link to="/">첫 화면으로</Link>
        </div>
      </main>
    </div>
  )
}
