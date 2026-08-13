import type { Grade, RiverId, SimulationResult } from '../../api'

export type GradeSymbol = Grade['symbol']
export type CharacterEventState = 'IDLE' | 'PENDING' | 'RESOLVED' | 'WORRIED'
export type CharacterResultStatus = SimulationResult['resultStatus'] | 'IN_PROGRESS'

export interface RiverCharacter {
  riverId: RiverId
  grade: GradeSymbol
  eventState: CharacterEventState
  resultStatus: CharacterResultStatus
}

export type CharacterExpression =
  | 'delighted'
  | 'happy'
  | 'calm'
  | 'neutral'
  | 'tired'
  | 'sad'
  | 'exhausted'
  | 'alert'
  | 'worried'
  | 'encouraging'
  | 'celebrate'
  | 'perfect'

type CharacterFaceSlot = {
  src: string | null
  expectedPath: string
  expression: CharacterExpression
  statusLabel: string
}

type RiverCharacterAssetMap = {
  riverName: string
  characterName: string
  bodySrc: string | null
  expectedBodyPath: string
  backgroundSrc: string | null
  expectedBackgroundPath: string
  grades: Readonly<Record<GradeSymbol, CharacterFaceSlot>>
  states: Readonly<
    Record<'pending' | 'worried' | 'tryAgain' | 'success' | 'perfect', CharacterFaceSlot>
  >
}

const GRADE_SYMBOLS = ['Ia', 'Ib', 'II', 'III', 'IV', 'V', 'VI'] as const

const GRADE_PRESENTATIONS: Readonly<
  Record<GradeSymbol, Pick<CharacterFaceSlot, 'expression' | 'statusLabel'>>
> = {
  Ia: { expression: 'delighted', statusLabel: '매우 맑고 활기찬 표정' },
  Ib: { expression: 'happy', statusLabel: '밝게 웃는 표정' },
  II: { expression: 'calm', statusLabel: '편안한 표정' },
  III: { expression: 'neutral', statusLabel: '차분한 표정' },
  IV: { expression: 'tired', statusLabel: '조금 지친 표정' },
  V: { expression: 'sad', statusLabel: '힘든 표정' },
  VI: { expression: 'exhausted', statusLabel: '많이 지친 표정' },
}

function gradeAssets(riverId: RiverId) {
  return Object.fromEntries(
    GRADE_SYMBOLS.map((grade) => [
      grade,
      {
        src: null,
        expectedPath: `/characters/${riverId}/face-grade-${grade.toLowerCase()}.svg`,
        ...GRADE_PRESENTATIONS[grade],
      },
    ]),
  ) as Record<GradeSymbol, CharacterFaceSlot>
}

function stateAssets(riverId: RiverId) {
  const state = (
    id: string,
    expression: CharacterExpression,
    statusLabel: string,
  ): CharacterFaceSlot => ({
    src: null,
    expectedPath: `/characters/${riverId}/face-${id}.svg`,
    expression,
    statusLabel,
  })

  return {
    pending: state('event-pending', 'alert', '돌발상황 대응을 기다리는 표정'),
    worried: state('event-worried', 'worried', '악취 신고가 걱정되는 표정'),
    tryAgain: state('result-try-again', 'encouraging', '아쉽지만 다시 도전하는 표정'),
    success: state('result-success', 'celebrate', '미션 성공을 기뻐하는 표정'),
    perfect: state('result-perfect', 'perfect', '퍼펙트 달성을 매우 기뻐하는 표정'),
  } as const
}

function riverAssets(
  riverId: RiverId,
  riverName: string,
  characterName: string,
): RiverCharacterAssetMap {
  return {
    riverName,
    characterName,
    bodySrc: null,
    expectedBodyPath: `/characters/${riverId}/body.svg`,
    backgroundSrc: null,
    expectedBackgroundPath: `/characters/${riverId}/background.svg`,
    grades: gradeAssets(riverId),
    states: stateAssets(riverId),
  }
}

/**
 * 디자이너 자산 교체 지점입니다.
 * 전달받은 SVG를 public/characters 아래에 두고 각 src의 null을 expectedPath로 바꿉니다.
 */
export const RIVER_CHARACTER_ASSETS = {
  dongcheon: riverAssets('dongcheon', '동천', '동이'),
  goejeongcheon: riverAssets('goejeongcheon', '괴정천', '정이'),
  oncheoncheon: riverAssets('oncheoncheon', '온천천', '온이'),
} as const satisfies Readonly<Record<RiverId, RiverCharacterAssetMap>>

export type CharacterPresentation = {
  riverName: string
  characterName: string
  bodySrc: string | null
  faceSrc: string | null
  backgroundSrc: string | null
  expression: CharacterExpression
  statusLabel: string
  expectedAssetPaths: readonly string[]
  usesFallback: boolean
}

function presentationSlot(state: RiverCharacter, assets: RiverCharacterAssetMap) {
  if (state.resultStatus === 'PERFECT_CLEAR') return assets.states.perfect
  if (state.resultStatus === 'MISSION_COMPLETE') return assets.states.success
  if (state.eventState === 'WORRIED') return assets.states.worried
  if (state.resultStatus === 'TRY_AGAIN') return assets.states.tryAgain
  if (state.eventState === 'PENDING') return assets.states.pending

  return assets.grades[state.grade] ?? assets.grades.III
}

export function resolveCharacterPresentation(state: RiverCharacter): CharacterPresentation {
  const assets = RIVER_CHARACTER_ASSETS[state.riverId]
  const slot = presentationSlot(state, assets)

  return {
    riverName: assets.riverName,
    characterName: assets.characterName,
    bodySrc: assets.bodySrc,
    faceSrc: slot.src,
    backgroundSrc: assets.backgroundSrc,
    expression: slot.expression,
    statusLabel: slot.statusLabel,
    expectedAssetPaths: [assets.expectedBodyPath, slot.expectedPath, assets.expectedBackgroundPath],
    usesFallback: !assets.bodySrc || !slot.src,
  }
}

export function characterEventState(simulation: SimulationResult | null): CharacterEventState {
  if (!simulation || simulation.event.status === 'NOT_TRIGGERED') return 'IDLE'
  if (simulation.event.status === 'PENDING') return 'PENDING'
  if (simulation.event.temporaryCharacterMood === 'WORRIED') return 'WORRIED'
  return 'RESOLVED'
}

export function createRiverCharacterState(options: {
  riverId: RiverId
  grade: GradeSymbol
  simulation?: SimulationResult | null
  revealResult?: boolean
}): RiverCharacter {
  const simulation = options.simulation ?? null

  return {
    riverId: options.riverId,
    grade: options.grade,
    eventState: characterEventState(simulation),
    resultStatus: options.revealResult && simulation ? simulation.resultStatus : 'IN_PROGRESS',
  }
}

export const CHARACTER_GRADE_SYMBOLS = GRADE_SYMBOLS
