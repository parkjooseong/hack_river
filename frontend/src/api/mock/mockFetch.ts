import type { FetchLike } from '../client'
import {
  mockCandidateCommentsPage,
  mockCandidateReport,
  mockGameConfig,
  mockHealth,
  mockSimulationResult,
  mockStatistics,
  mockSubmissionResponse,
} from './data'

export type MockEndpoint =
  | 'GET /health'
  | 'GET /api/game/config'
  | 'POST /api/simulations'
  | 'POST /api/responses'
  | 'GET /api/stats'
  | 'GET /api/candidate/report'
  | 'GET /api/candidate/comments'

export type MockFailure = {
  status: number
  body: unknown
  requestId?: string
}

export type MockFetchOptions = {
  delayMs?: number
  failures?: Partial<Record<MockEndpoint, MockFailure>>
}

const successResponses: Readonly<Record<MockEndpoint, { status: number; body: unknown }>> = {
  'GET /health': { status: 200, body: mockHealth },
  'GET /api/game/config': { status: 200, body: mockGameConfig },
  'POST /api/simulations': { status: 200, body: mockSimulationResult },
  'POST /api/responses': { status: 201, body: mockSubmissionResponse },
  'GET /api/stats': { status: 200, body: mockStatistics },
  'GET /api/candidate/report': { status: 200, body: mockCandidateReport },
  'GET /api/candidate/comments': { status: 200, body: mockCandidateCommentsPage },
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return new URL(input)
  }

  return input instanceof URL ? input : new URL(input.url)
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method.toUpperCase()
  }

  return input instanceof Request ? input.method.toUpperCase() : 'GET'
}

function waitForDelay(delayMs: number, signal?: AbortSignal | null) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
  }

  if (delayMs === 0) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(resolve, delayMs)
    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

export function createMockFetch(options: MockFetchOptions = {}): FetchLike {
  return async (input, init) => {
    await waitForDelay(options.delayMs ?? 0, init?.signal)

    const url = getRequestUrl(input)
    const endpoint = `${getRequestMethod(input, init)} ${url.pathname}` as MockEndpoint
    const response = successResponses[endpoint]

    if (!response) {
      return Response.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Mock API 경로를 찾을 수 없습니다.',
            details: [],
            requestId: 'dddddddddddddddddddddddddddddddd',
          },
        },
        { status: 404 },
      )
    }

    const failure = options.failures?.[endpoint]
    const selected = failure ?? response
    const requestId = failure?.requestId ?? 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

    return Response.json(selected.body, {
      status: selected.status,
      headers: { 'X-Request-ID': requestId },
    })
  }
}
