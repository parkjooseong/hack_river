import { describe, expect, it, vi } from 'vitest'

import { ApiClient } from './client'
import { ApiError } from './errors'
import { createMockFetch, mockValidationError } from './mock'

describe('ApiClient', () => {
  it('기본 URL, JSON 헤더와 요청 본문을 구성한다', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }))
    const client = new ApiClient({
      baseUrl: 'http://127.0.0.1:8000/',
      fetch: fetchMock,
    })

    await client.request('/api/example', {
      method: 'POST',
      body: { riverId: 'dongcheon' },
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/example',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ riverId: 'dongcheon' }),
      }),
    )
  })

  it('백엔드 검증 오류를 안전한 사용자 오류로 변환한다', async () => {
    const client = new ApiClient({
      baseUrl: 'http://mock.local',
      fetch: createMockFetch({
        failures: {
          'POST /api/simulations': {
            status: 400,
            body: mockValidationError,
            requestId: mockValidationError.error.requestId,
          },
        },
      }),
    })

    await expect(
      client.request('/api/simulations', {
        method: 'POST',
        body: { riverId: 'dongcheon', policyIds: [] },
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      code: 'VALIDATION_ERROR',
      status: 400,
      requestId: mockValidationError.error.requestId,
      userMessage: '입력한 내용을 다시 확인해 주세요.',
    })
  })

  it('서버의 내부 메시지를 사용자 메시지로 노출하지 않는다', async () => {
    const client = new ApiClient({
      baseUrl: 'http://mock.local',
      fetch: createMockFetch({
        failures: {
          'POST /api/simulations': { status: 400, body: mockValidationError },
        },
      }),
    })

    const error = await client
      .request('/api/simulations', { method: 'POST', body: {} })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).userMessage).not.toContain('백엔드 내부')
  })

  it('JSON이 아닌 성공 응답을 invalid-response 오류로 처리한다', async () => {
    const client = new ApiClient({
      baseUrl: 'http://mock.local',
      fetch: async () => new Response('not-json', { status: 200 }),
    })

    await expect(client.request('/health')).rejects.toMatchObject({
      kind: 'invalid-response',
      code: 'INVALID_JSON_RESPONSE',
      status: 200,
    })
  })

  it('네트워크 실패와 타임아웃을 구분한다', async () => {
    const networkClient = new ApiClient({
      baseUrl: 'http://mock.local',
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    const timeoutClient = new ApiClient({
      baseUrl: 'http://mock.local',
      timeoutMs: 5,
      fetch: createMockFetch({ delayMs: 50 }),
    })

    await expect(networkClient.request('/health')).rejects.toMatchObject({
      kind: 'network',
      code: 'NETWORK_ERROR',
    })
    await expect(timeoutClient.request('/health')).rejects.toMatchObject({
      kind: 'timeout',
      code: 'REQUEST_TIMEOUT',
    })
  })

  it('호출자가 취소한 요청을 cancelled 오류로 처리한다', async () => {
    const controller = new AbortController()
    const client = new ApiClient({
      baseUrl: 'http://mock.local',
      fetch: createMockFetch({ delayMs: 50 }),
    })
    const request = client.request('/health', { signal: controller.signal })

    controller.abort()

    await expect(request).rejects.toMatchObject({
      kind: 'cancelled',
      code: 'REQUEST_CANCELLED',
    })
  })
})
