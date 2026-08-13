import type { ButtonHTMLAttributes, ComponentProps } from 'react'
import { Link } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'small' | 'medium' | 'large'

type SharedButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  SharedButtonProps & {
    isLoading?: boolean
    loadingLabel?: string
  }

export type LinkButtonProps = ComponentProps<typeof Link> & SharedButtonProps

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  className?: string,
) {
  return [
    'button',
    `button--${variant}`,
    size !== 'medium' ? `button--${size}` : '',
    fullWidth ? 'button--full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  isLoading = false,
  loadingLabel = '처리 중',
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, fullWidth, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <span className="button__spinner" aria-hidden="true" /> : null}
      {isLoading ? loadingLabel : children}
    </button>
  )
}

export function LinkButton({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonClassName(variant, size, fullWidth, className)} {...props}>
      {children}
    </Link>
  )
}
