import { useId, type HTMLAttributes, type ReactNode } from 'react'

export type CardTone = 'default' | 'subtle' | 'outlined'

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode
  description?: ReactNode
  tone?: CardTone
}

export function Card({
  title,
  description,
  tone = 'default',
  className,
  children,
  ...props
}: CardProps) {
  const titleId = useId()
  const classes = ['card', tone !== 'default' ? `card--${tone}` : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes} aria-labelledby={title ? titleId : undefined} {...props}>
      {title || description ? (
        <header className="card__header">
          {title ? (
            <h2 id={titleId} className="card__title">
              {title}
            </h2>
          ) : null}
          {description ? <p className="card__description">{description}</p> : null}
        </header>
      ) : null}
      <div className="card__body">{children}</div>
    </section>
  )
}
