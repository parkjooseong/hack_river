import type { ReactNode } from 'react'

export type PageLayoutProps = {
  title: string
  children: ReactNode
  eyebrow?: string
  description?: string
  header?: ReactNode
  bottomAction?: ReactNode
}

export function PageLayout({
  title,
  children,
  eyebrow,
  description,
  header,
  bottomAction,
}: PageLayoutProps) {
  return (
    <div className="page-layout">
      {header}
      <main id="main-content" className="page-layout__main" tabIndex={-1}>
        <header className="page-heading">
          {eyebrow ? <p className="page-heading__eyebrow">{eyebrow}</p> : null}
          <h1 className="page-heading__title">{title}</h1>
          {description ? <p className="page-heading__description">{description}</p> : null}
        </header>
        <div className="page-content">{children}</div>
      </main>
      {bottomAction}
    </div>
  )
}
