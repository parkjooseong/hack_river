import type { HTMLAttributes, ReactNode } from 'react'

export type NoticeTone = 'neutral' | 'info' | 'warning' | 'danger'

export type NoticeProps = HTMLAttributes<HTMLDivElement> & {
  tone?: NoticeTone
  title?: string
  icon?: ReactNode
}

export function Notice({
  tone = 'neutral',
  title,
  icon = 'i',
  className,
  children,
  ...props
}: NoticeProps) {
  const classes = ['notice', tone !== 'neutral' ? `notice--${tone}` : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      <span className="notice__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        {title ? <strong className="notice__title">{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}
