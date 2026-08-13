import { useCallback, useEffect, useState } from 'react'

import { ApiError, isApiError, loadingState, type AsyncState } from '../../api'

function toApiError(error: unknown) {
  if (isApiError(error)) {
    return error
  }

  return new ApiError({
    kind: 'invalid-response',
    code: 'INVALID_RESPONSE_SHAPE',
    userMessage: '서버에서 받은 정보를 화면에 표시하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    cause: error,
  })
}

function previousData<T>(state: AsyncState<T>) {
  if (state.status === 'success' || state.status === 'empty') {
    return state.data
  }

  if (state.status === 'loading' || state.status === 'error') {
    return state.previousData
  }

  return undefined
}

export function useAsyncResource<T>(load: () => Promise<T>, isEmpty?: (value: T) => boolean) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => {
    setState((current) => loadingState(previousData(current)))
    setAttempt((current) => current + 1)
  }, [])

  useEffect(() => {
    let active = true

    void load()
      .then((data) => {
        if (!active) {
          return
        }

        setState(isEmpty?.(data) ? { status: 'empty', data } : { status: 'success', data })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setState((current) => ({
          status: 'error',
          error: toApiError(error),
          previousData: previousData(current),
        }))
      })

    return () => {
      active = false
    }
  }, [attempt, isEmpty, load])

  return { state, reload }
}
