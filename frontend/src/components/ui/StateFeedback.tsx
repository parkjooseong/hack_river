import type { ReactNode } from 'react'

export type LoadingStateProps = {
  label?: string
}

export function LoadingState({ label = '데이터를 불러오는 중입니다.' }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export type EmptyStateProps = {
  title?: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  title = '표시할 데이터가 없습니다.',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="state-feedback">
      <h2 className="state-feedback__title">{title}</h2>
      <p className="state-feedback__description">{description}</p>
      {action}
    </div>
  )
}

export type ErrorStateProps = {
  title?: string
  description: string
  requestId?: string | null
  action?: ReactNode
}

export function ErrorState({
  title = '정보를 불러오지 못했습니다.',
  description,
  requestId,
  action,
}: ErrorStateProps) {
  return (
    <div className="state-feedback" role="alert">
      <h2 className="state-feedback__title">{title}</h2>
      <p className="state-feedback__description">{description}</p>
      {requestId ? <p className="state-feedback__request-id">문의 코드: {requestId}</p> : null}
      {action}
    </div>
  )
}
