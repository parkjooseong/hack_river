import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="app-shell">
      <Suspense
        fallback={
          <div className="route-loading" role="status" aria-live="polite">
            화면을 불러오는 중입니다.
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  )
}
