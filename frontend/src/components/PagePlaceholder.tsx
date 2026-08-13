import type { ReactNode } from 'react'

type PagePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

export function PagePlaceholder({ eyebrow, title, description, children }: PagePlaceholderProps) {
  return (
    <main className="page-placeholder">
      <p className="page-placeholder__label">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {children ? <div className="page-placeholder__links">{children}</div> : null}
    </main>
  )
}
