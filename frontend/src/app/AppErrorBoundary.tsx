import { Component, type ErrorInfo, type ReactNode } from 'react'

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
          <main className="page-placeholder" role="alert">
            <p className="page-placeholder__label">오류</p>
            <h1>화면을 불러오지 못했습니다.</h1>
            <p>잠시 후 다시 시도해 주세요.</p>
            <div className="page-placeholder__links">
              <button type="button" onClick={this.handleReload}>
                새로고침
              </button>
            </div>
          </main>
        </div>
      )
    }

    return this.props.children
  }
}
