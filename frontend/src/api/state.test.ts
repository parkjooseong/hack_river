import { describe, expect, it } from 'vitest'

import { ApiError } from './errors'
import { errorState, idleState, loadedState, loadingState } from './state'

describe('AsyncState', () => {
  it('idle, loading, success, empty 상태를 같은 구조로 만든다', () => {
    expect(idleState).toEqual({ status: 'idle' })
    expect(loadingState()).toEqual({ status: 'loading' })
    expect(loadingState([1])).toEqual({ status: 'loading', previousData: [1] })
    expect(loadedState([1], (items) => items.length === 0)).toEqual({
      status: 'success',
      data: [1],
    })
    expect(loadedState([], (items) => items.length === 0)).toEqual({
      status: 'empty',
      data: [],
    })
  })

  it('오류와 이전 데이터를 함께 보관할 수 있다', () => {
    const error = new ApiError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      userMessage: '네트워크 연결을 확인해 주세요.',
    })

    expect(errorState(error, ['기존 데이터'])).toEqual({
      status: 'error',
      error,
      previousData: ['기존 데이터'],
    })
  })
})
