export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'cancelled' | 'invalid-response'

type ApiErrorOptions = {
  kind: ApiErrorKind
  code: string
  userMessage: string
  status?: number
  requestId?: string
  details?: readonly unknown[]
  cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly code: string
  readonly userMessage: string
  readonly status: number | null
  readonly requestId: string | null
  readonly details: readonly unknown[]

  constructor(options: ApiErrorOptions) {
    super(options.userMessage, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = options.kind
    this.code = options.code
    this.userMessage = options.userMessage
    this.status = options.status ?? null
    this.requestId = options.requestId ?? null
    this.details = options.details ?? []
  }
}

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  VALIDATION_ERROR: '입력한 내용을 다시 확인해 주세요.',
  PERSONAL_INFORMATION_NOT_ALLOWED:
    '개인정보가 포함된 내용은 제출할 수 없습니다. 해당 내용을 삭제해 주세요.',
  DATABASE_UNAVAILABLE: '참여 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  CANDIDATE_AUTH_REQUIRED: '후보자 로그인이 필요합니다.',
  CANDIDATE_ACCESS_DENIED: '후보자 대시보드에 접근할 수 없는 계정입니다.',
  CANDIDATE_AUTH_UNAVAILABLE: '인증 서비스를 일시적으로 사용할 수 없습니다.',
  METHOD_NOT_ALLOWED: '지원하지 않는 요청입니다.',
  PAYLOAD_TOO_LARGE: '입력한 내용이 너무 깁니다. 내용을 줄여 주세요.',
  UNSUPPORTED_MEDIA_TYPE: '요청 형식이 올바르지 않습니다.',
  INTERNAL_SERVER_ERROR: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  NOT_FOUND: '요청한 정보를 찾을 수 없습니다.',
}

export function getSafeHttpMessage(code: string, status: number) {
  const knownMessage = ERROR_MESSAGES[code]

  if (knownMessage) {
    return knownMessage
  }

  if (status >= 500) {
    return '서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }

  if (status === 404) {
    return ERROR_MESSAGES.NOT_FOUND
  }

  return '요청을 처리하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.'
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
