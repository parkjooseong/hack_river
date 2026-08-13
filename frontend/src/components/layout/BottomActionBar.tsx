import type { ReactNode } from 'react'

export type BottomActionBarProps = {
  children: ReactNode
  label?: string
}

export function BottomActionBar({ children, label = '주요 작업' }: BottomActionBarProps) {
  return (
    <aside className="bottom-action-bar" aria-label={label}>
      {children}
    </aside>
  )
}
