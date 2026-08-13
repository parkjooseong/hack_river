import type { District, EventChoice, PolicyId, RiverId, TopPriority } from '../../api'

const SESSION_VERSION = 1
const SESSION_PREFIX = 'gang-saeroi:challenge'
const POLICY_IDS = new Set<PolicyId>([
  'sewer',
  'treatment',
  'sourceBlock',
  'ecology',
  'sensor',
  'monitoring',
  'walking',
])
const EVENT_CHOICES = new Set<EventChoice>(['INVESTIGATE', 'WAIT'])
const PRIORITIES = new Set<TopPriority>([
  'source_control',
  'treatment',
  'sensor',
  'ecology',
  'walking',
  'citizen_monitoring',
])
const DISTRICTS = new Set<District>([
  'geumjeong',
  'dongnae',
  'busanjin',
  'saha',
  'other',
  'prefer_not',
])

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type UnknownRecord = Readonly<Record<string, unknown>>

export type ChallengeSession = {
  selectedPolicyIds: readonly PolicyId[]
  eventChoice?: EventChoice
  showResult: boolean
  showSubmissionForm: boolean
  topPriority: TopPriority | ''
  district: District | ''
  comment: string
  consent: boolean
}

function sessionKey(riverId: RiverId) {
  return `${SESSION_PREFIX}:${riverId}:v${SESSION_VERSION}`
}

function browserSessionStorage() {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null
}

function isStringIn<T extends string>(values: ReadonlySet<T>, value: unknown): value is T {
  return typeof value === 'string' && values.has(value as T)
}

function readPolicyIds(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  const policyIds = value.filter((item): item is PolicyId => isStringIn(POLICY_IDS, item))
  return [...new Set(policyIds)]
}

export function readChallengeSession(
  riverId: RiverId,
  commentMaxLength: number,
  storage: StorageLike | undefined = browserSessionStorage(),
): ChallengeSession | null {
  if (!storage) {
    return null
  }

  try {
    const serialized = storage.getItem(sessionKey(riverId))
    if (!serialized) {
      return null
    }

    const record = asRecord(JSON.parse(serialized))
    if (record?.version !== SESSION_VERSION || record.riverId !== riverId) {
      storage.removeItem(sessionKey(riverId))
      return null
    }

    const eventChoice = isStringIn(EVENT_CHOICES, record.eventChoice)
      ? record.eventChoice
      : undefined
    const topPriority = isStringIn(PRIORITIES, record.topPriority) ? record.topPriority : ''
    const district = isStringIn(DISTRICTS, record.district) ? record.district : ''
    const comment =
      typeof record.comment === 'string' ? record.comment.slice(0, commentMaxLength) : ''

    return {
      selectedPolicyIds: readPolicyIds(record.selectedPolicyIds),
      ...(eventChoice ? { eventChoice } : {}),
      showResult: record.showResult === true,
      showSubmissionForm: record.showSubmissionForm === true,
      topPriority,
      district,
      comment,
      consent: record.consent === true,
    }
  } catch {
    try {
      storage.removeItem(sessionKey(riverId))
    } catch {
      // 저장소 접근이 제한되어도 챌린지는 메모리 상태로 계속 진행합니다.
    }
    return null
  }
}

export function writeChallengeSession(
  riverId: RiverId,
  session: ChallengeSession,
  storage: StorageLike | undefined = browserSessionStorage(),
) {
  if (!storage) {
    return
  }

  try {
    const hasProgress =
      session.selectedPolicyIds.length > 0 ||
      session.eventChoice !== undefined ||
      session.showResult ||
      session.showSubmissionForm ||
      session.topPriority !== '' ||
      session.district !== '' ||
      session.comment !== '' ||
      session.consent

    if (!hasProgress) {
      storage.removeItem(sessionKey(riverId))
      return
    }

    storage.setItem(
      sessionKey(riverId),
      JSON.stringify({ version: SESSION_VERSION, riverId, ...session }),
    )
  } catch {
    // 저장 공간이 없거나 차단된 경우에도 현재 탭의 React 상태는 유지합니다.
  }
}

export function clearChallengeSession(
  riverId: RiverId,
  storage: StorageLike | undefined = browserSessionStorage(),
) {
  if (!storage) {
    return
  }

  try {
    storage.removeItem(sessionKey(riverId))
  } catch {
    // 저장소 접근 제한은 사용자 흐름을 막지 않습니다.
  }
}
