import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { LoadingState } from '../components'

export function RootLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 바로가기
      </a>
      <Suspense
        fallback={
          <div className="route-loading">
            <LoadingState label="화면을 불러오는 중입니다." />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  )
}
