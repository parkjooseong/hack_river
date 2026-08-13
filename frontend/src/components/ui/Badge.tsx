import type { HTMLAttributes } from 'react'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  const classes = ['badge', tone !== 'neutral' ? `badge--${tone}` : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}
