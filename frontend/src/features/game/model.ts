import type {
  District,
  EventChoice,
  GameConfig,
  Grade,
  PolicyId,
  RiverId,
  TopPriority,
} from '../../api'

const RIVER_IDS = ['dongcheon', 'goejeongcheon', 'oncheoncheon'] as const
const POLICY_IDS = [
  'sewer',
  'treatment',
  'sourceBlock',
  'ecology',
  'sensor',
  'monitoring',
  'walking',
] as const
export type RiverOption = {
  id: RiverId
  name: string
  character: string
  initialBod: number
  initialGrade: Grade
  difficulty: string
}

export type PolicyOption = {
  id: PolicyId
  name: string
  cost: number
  pledgeArea: string
  directlyReducesBod: boolean
  scoreEffects: {
    ecology: number
    citizen: number
    monitoring: number
  }
}

export type NamedOption<T extends string> = {
  id: T
  name: string
}

export type EventOption = NamedOption<EventChoice> & {
  cost: number
}

export type ChallengeEvent = {
  name: string
  description: string
  triggerPolicyCount: number
  choices: readonly EventOption[]
}

export type AppGameConfig = {
  serviceName: string
  maxBudget: number
  baseScore: number
  rivers: readonly RiverOption[]
  policies: readonly PolicyOption[]
  priorities: readonly NamedOption<TopPriority>[]
  districts: readonly NamedOption<District>[]
  event: ChallengeEvent
  commentMaxLength: number
  privacyNotice: string
  disclaimer: string
  demoDataNotice: string
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.some((item) => item === value)
}

export function isRiverId(value: unknown): value is RiverId {
  return includes(RIVER_IDS, value)
}

function difficultyLabel(value: string) {
  const labels: Readonly<Record<string, string>> = {
    hard: '어려움',
    normal: '보통',
    easy: '쉬움',
  }

  return labels[value] ?? value
}

function parseRivers(config: GameConfig) {
  return config.rivers.map(
    (river) =>
      ({
        id: river.id,
        name: river.name,
        character: river.character,
        initialBod: river.initialBod,
        initialGrade: river.initialGrade,
        difficulty: difficultyLabel(river.difficulty),
      }) satisfies RiverOption,
  )
}

function parsePolicies(config: GameConfig) {
  return config.policies.map(
    (policy) =>
      ({
        id: policy.id,
        name: policy.name,
        cost: policy.cost,
        pledgeArea: policy.pledgeArea,
        directlyReducesBod: policy.directlyReducesBod,
        scoreEffects: policy.scoreEffects,
      }) satisfies PolicyOption,
  )
}

function parseEvent(config: GameConfig): ChallengeEvent {
  const event = config.events[0]

  if (!event) {
    throw new Error('돌전 상황 설정이 없습니다.')
  }

  return {
    name: event.name,
    description: event.description,
    triggerPolicyCount: event.triggerPolicyCount,
    choices: event.choices.map(
      (choice) =>
        ({
          id: choice.id,
          name: choice.name,
          cost: choice.baseCost,
        }) satisfies EventOption,
    ),
  }
}

export function normalizeGameConfig(config: GameConfig): AppGameConfig {
  const rivers = parseRivers(config)
  const policies = parsePolicies(config)

  if (rivers.length !== RIVER_IDS.length || policies.length !== POLICY_IDS.length) {
    throw new Error('필수 하천 또는 정책 설정이 누락되었습니다.')
  }

  return {
    serviceName: config.serviceName,
    maxBudget: config.maxBudget,
    baseScore: config.baseScore,
    rivers,
    policies,
    priorities: config.priorities,
    districts: config.districts,
    event: parseEvent(config),
    commentMaxLength: config.commentRules.maxLength,
    privacyNotice: config.commentRules.privacyNotice,
    disclaimer: config.disclaimer,
    demoDataNotice: config.demoDataNotice,
  }
}

export function findRiver(config: AppGameConfig, riverId: string | undefined) {
  return isRiverId(riverId) ? config.rivers.find((river) => river.id === riverId) : undefined
}

export function togglePolicy(policyIds: readonly PolicyId[], policyId: PolicyId) {
  return policyIds.includes(policyId)
    ? policyIds.filter((selectedId) => selectedId !== policyId)
    : [...policyIds, policyId]
}

export function eventChoiceForSimulation(
  policyIds: readonly PolicyId[],
  triggerPolicyCount: number,
  handledEventChoice: EventChoice | undefined,
) {
  return policyIds.length >= triggerPolicyCount ? handledEventChoice : undefined
}
