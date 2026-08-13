import { useId, type ReactNode } from 'react'

export type PageSectionProps = {
  title: string
  children: ReactNode
  description?: string
}

export function PageSection({ title, description, children }: PageSectionProps) {
  const titleId = useId()

  return (
    <section className="page-section" aria-labelledby={titleId}>
      <header className="page-section__heading">
        <h2 id={titleId} className="page-section__title">
          {title}
        </h2>
        {description ? <p className="page-section__description">{description}</p> : null}
      </header>
      {children}
    </section>
  )
}
