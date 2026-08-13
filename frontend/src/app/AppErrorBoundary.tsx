import { Component, type ErrorInfo, type ReactNode } from 'react'

import { AppHeader, Button, ErrorState, PageLayout } from '../components'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('렌더링 중 처리하지 못한 오류가 발생했습니다.', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <PageLayout header={<AppHeader />} eyebrow="오류" title="화면을 불러오지 못했습니다.">
            <ErrorState
              description="잠시 후 다시 시도해 주세요."
              action={<Button onClick={this.handleReload}>새로고침</Button>}
            />
          </PageLayout>
        </div>
      )
    }

    return this.props.children
  }
}
