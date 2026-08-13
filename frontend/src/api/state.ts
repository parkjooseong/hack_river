import type { ApiError } from './errors'

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading'; previousData?: T }
  | { status: 'success'; data: T }
  | { status: 'empty'; data: T }
  | { status: 'error'; error: ApiError; previousData?: T }

export const idleState = { status: 'idle' } as const satisfies AsyncState<never>

export function loadingState<T>(previousData?: T): AsyncState<T> {
  return previousData === undefined ? { status: 'loading' } : { status: 'loading', previousData }
}

export function loadedState<T>(data: T, isEmpty: (value: T) => boolean): AsyncState<T> {
  return isEmpty(data) ? { status: 'empty', data } : { status: 'success', data }
}

export function errorState<T>(error: ApiError, previousData?: T): AsyncState<T> {
  return previousData === undefined
    ? { status: 'error', error }
    : { status: 'error', error, previousData }
}
