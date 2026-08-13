import type { CSSProperties } from 'react'

export type ProgressBarProps = {
  label: string
  value: number
  min?: number
  max?: number
  valueText?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function ProgressBar({ label, value, min = 0, max = 100, valueText }: ProgressBarProps) {
  const safeMax = max > min ? max : min + 1
  const safeValue = clamp(value, min, safeMax)
  const percentage = ((safeValue - min) / (safeMax - min)) * 100
  const barStyle = { '--progress-value': `${percentage}%` } as CSSProperties

  return (
    <div className="progress">
      <div className="progress__header">
        <span className="progress__label">{label}</span>
        <span className="progress__value">{valueText ?? `${safeValue}/${safeMax}`}</span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={valueText}
      >
        <div className="progress__bar" style={barStyle} />
      </div>
    </div>
  )
}
