import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type AppHeaderProps = {
  title?: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
}

export function AppHeader({
  title = '강 새로이',
  backTo,
  backLabel = '이전 화면으로',
  action,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      {backTo ? (
        <Link className="app-header__back" to={backTo} aria-label={backLabel}>
          <span aria-hidden="true">←</span>
        </Link>
      ) : (
        <span className="app-header__placeholder" aria-hidden="true" />
      )}
      <p className="app-header__title">{title}</p>
      {action ? (
        <div className="app-header__action">{action}</div>
      ) : (
        <span className="app-header__placeholder" aria-hidden="true" />
      )}
    </header>
  )
}
