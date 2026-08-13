import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

type SharedFieldProps = {
  label: string
  hint?: string
  error?: string
  required?: boolean
}

function describedBy(...ids: Array<string | undefined>) {
  const value = ids.filter(Boolean).join(' ')
  return value || undefined
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & SharedFieldProps

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { id, label, hint, error, required, 'aria-describedby': ariaDescribedBy, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={inputId}>
        {label}
        {required ? (
          <span className="form-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <input
        ref={ref}
        id={inputId}
        className="form-field__control"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ariaDescribedBy, hintId, errorId)}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & SharedFieldProps

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, hint, error, required, 'aria-describedby': ariaDescribedBy, ...props },
  ref,
) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const hintId = hint ? `${textareaId}-hint` : undefined
  const errorId = error ? `${textareaId}-error` : undefined

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={textareaId}>
        {label}
        {required ? (
          <span className="form-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        className="form-field__control"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ariaDescribedBy, hintId, errorId)}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  SharedFieldProps & {
    options: readonly SelectOption[]
    placeholder?: string
  }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    label,
    hint,
    error,
    required,
    options,
    placeholder,
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={selectId}>
        {label}
        {required ? (
          <span className="form-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <select
        ref={ref}
        id={selectId}
        className="form-field__control"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ariaDescribedBy, hintId, errorId)}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})
