import { ApiError, getSafeHttpMessage } from './errors'

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type ApiClientOptions = {
  baseUrl: string
  timeoutMs?: number
  fetch?: FetchLike
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

type ErrorPayload = {
  error?: {
    code?: unknown
    details?: unknown
    requestId?: unknown
  }
}

const DEFAULT_TIMEOUT_MS = 10_000

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

function buildUrl(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === 'object' && value !== null && 'error' in value
}

function readErrorPayload(value: unknown, fallbackRequestId: string | null) {
  if (!isErrorPayload(value) || typeof value.error !== 'object' || value.error === null) {
    return {
      code: 'HTTP_ERROR',
      details: [] as readonly unknown[],
      requestId: fallbackRequestId,
    }
  }

  const code = typeof value.error.code === 'string' ? value.error.code : 'HTTP_ERROR'
  const details = Array.isArray(value.error.details) ? value.error.details : []
  const requestId =
    typeof value.error.requestId === 'string' ? value.error.requestId : fallbackRequestId

  return { code, details, requestId }
}

async function readJson(response: Response) {
  try {
    return await response.json()
  } catch (cause) {
    throw new ApiError({
      kind: 'invalid-response',
      code: 'INVALID_JSON_RESPONSE',
      userMessage: '서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.',
      status: response.status,
      requestId: response.headers.get('X-Request-ID') ?? undefined,
      cause,
    })
  }
}

function createCombinedSignal(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  let timedOut = false

  const abortFromCaller = () => controller.abort(signal?.reason)

  if (signal?.aborted) {
    abortFromCaller()
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true
    controller.abort(new DOMException('Request timed out', 'TimeoutError'))
  }, timeoutMs)

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId)
      signal?.removeEventListener('abort', abortFromCaller)
    },
  }
}

function toRequestError(error: unknown, timedOut: boolean) {
  if (error instanceof ApiError) {
    return error
  }

  if (timedOut) {
    return new ApiError({
      kind: 'timeout',
      code: 'REQUEST_TIMEOUT',
      userMessage: '응답 시간이 길어지고 있습니다. 잠시 후 다시 시도해 주세요.',
      cause: error,
    })
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({
      kind: 'cancelled',
      code: 'REQUEST_CANCELLED',
      userMessage: '요청이 취소되었습니다.',
      cause: error,
    })
  }

  return new ApiError({
    kind: 'network',
    code: 'NETWORK_ERROR',
    userMessage: '네트워크 연결을 확인하고 다시 시도해 주세요.',
    cause: error,
  })
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetch: FetchLike
  private readonly latestControllers = new Map<string, AbortController>()
  private readonly inFlightRequests = new Map<string, Promise<unknown>>()

  constructor(options: ApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { signal, didTimeOut, cleanup } = createCombinedSignal(
      options.signal,
      options.timeoutMs ?? this.timeoutMs,
    )

    try {
      const response = await this.fetch(buildUrl(this.baseUrl, path), {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal,
      })
      const payload: unknown = await readJson(response)

      if (!response.ok) {
        const requestIdHeader = response.headers.get('X-Request-ID')
        const { code, details, requestId } = readErrorPayload(payload, requestIdHeader)

        throw new ApiError({
          kind: 'http',
          code,
          userMessage: getSafeHttpMessage(code, response.status),
          status: response.status,
          requestId: requestId ?? undefined,
          details,
        })
      }

      return payload as T
    } catch (error) {
      throw toRequestError(error, didTimeOut())
    } finally {
      cleanup()
    }
  }

  requestLatest<T>(key: string, path: string, options: RequestOptions = {}) {
    this.latestControllers.get(key)?.abort()

    const controller = new AbortController()
    this.latestControllers.set(key, controller)

    return this.request<T>(path, { ...options, signal: controller.signal }).finally(() => {
      if (this.latestControllers.get(key) === controller) {
        this.latestControllers.delete(key)
      }
    })
  }

  requestSingleFlight<T>(key: string, request: () => Promise<T>): Promise<T> {
    const inFlight = this.inFlightRequests.get(key)

    if (inFlight) {
      return inFlight as Promise<T>
    }

    const nextRequest = request().finally(() => {
      if (this.inFlightRequests.get(key) === nextRequest) {
        this.inFlightRequests.delete(key)
      }
    })

    this.inFlightRequests.set(key, nextRequest)
    return nextRequest
  }

  cancelLatest(key: string) {
    this.latestControllers.get(key)?.abort()
    this.latestControllers.delete(key)
  }
}

export function getDefaultApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000'
}
