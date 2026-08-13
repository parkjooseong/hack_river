import type { ReactNode } from 'react'

import {
  resolveCharacterPresentation,
  type CharacterExpression,
  type RiverCharacter as RiverCharacterState,
} from './model'

type RiverCharacterProps = {
  state: RiverCharacterState
  name?: string
  riverName?: string
}

function Eyes({ expression }: { expression: CharacterExpression }) {
  if (expression === 'perfect') {
    return (
      <>
        <path
          className="river-character__eye"
          d="M42 45l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"
        />
        <path
          className="river-character__eye"
          d="M70 45l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"
        />
      </>
    )
  }

  if (expression === 'exhausted' || expression === 'sad' || expression === 'worried') {
    return (
      <>
        <path className="river-character__line" d="M37 52q6-5 12 0" />
        <path className="river-character__line" d="M68 52q6-5 12 0" />
      </>
    )
  }

  if (expression === 'alert') {
    return (
      <>
        <circle className="river-character__eye" cx="43" cy="52" r="5" />
        <circle className="river-character__eye" cx="74" cy="52" r="5" />
      </>
    )
  }

  return (
    <>
      <circle className="river-character__eye" cx="43" cy="52" r="3.8" />
      <circle className="river-character__eye" cx="74" cy="52" r="3.8" />
    </>
  )
}

function Mouth({ expression }: { expression: CharacterExpression }) {
  const sad = ['tired', 'sad', 'exhausted', 'worried'].includes(expression)
  const neutral = expression === 'neutral' || expression === 'alert'

  if (sad) {
    return <path className="river-character__line" d="M45 70q14-12 28 0" />
  }

  if (neutral) {
    return <path className="river-character__line" d="M47 66h24" />
  }

  return <path className="river-character__line" d="M43 63q16 18 32 0" />
}

function FallbackCharacter({ expression }: { expression: CharacterExpression }) {
  return (
    <svg
      className="river-character__svg"
      viewBox="0 0 120 120"
      focusable="false"
      aria-hidden="true"
    >
      <path
        className="river-character__body"
        d="M60 8C47 27 22 48 22 76c0 22 17 36 38 36s38-14 38-36C98 48 73 27 60 8z"
      />
      <path className="river-character__shine" d="M45 27c-9 12-15 21-17 31" />
      <Eyes expression={expression} />
      <Mouth expression={expression} />
      {expression === 'worried' ? (
        <path
          className="river-character__sweat"
          d="M88 38c-4 6-6 9-6 13a6 6 0 0012 0c0-4-2-7-6-13z"
        />
      ) : null}
    </svg>
  )
}

function EffectLayer({ resultStatus }: Pick<RiverCharacterState, 'resultStatus'>) {
  const effect: ReactNode =
    resultStatus === 'PERFECT_CLEAR' ? (
      <>
        <span>★</span>
        <span>✦</span>
        <span>★</span>
      </>
    ) : resultStatus === 'MISSION_COMPLETE' ? (
      <>
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </>
    ) : null

  return effect ? (
    <span className="river-character__effects" aria-hidden="true">
      {effect}
    </span>
  ) : null
}

export function RiverCharacter({ state, name, riverName }: RiverCharacterProps) {
  const presentation = resolveCharacterPresentation(state)
  const resolvedName = name ?? presentation.characterName
  const resolvedRiverName = riverName ?? presentation.riverName
  const assetReady = !presentation.usesFallback
  const visualKey = `${state.riverId}-${state.grade}-${state.eventState}-${state.resultStatus}-${presentation.expression}`

  return (
    <div
      className="river-character"
      role="img"
      aria-live="polite"
      aria-label={`${resolvedRiverName} 캐릭터 ${resolvedName}, ${presentation.statusLabel}, 수질 ${state.grade} 등급`}
      data-river-id={state.riverId}
      data-grade={state.grade}
      data-event-state={state.eventState}
      data-result-status={state.resultStatus}
    >
      <div key={visualKey} className="river-character__visual">
        {presentation.backgroundSrc ? (
          <img className="river-character__background" src={presentation.backgroundSrc} alt="" />
        ) : null}
        {assetReady ? (
          <>
            <img className="river-character__body-image" src={presentation.bodySrc ?? ''} alt="" />
            <img className="river-character__face-image" src={presentation.faceSrc ?? ''} alt="" />
          </>
        ) : (
          <FallbackCharacter expression={presentation.expression} />
        )}
        <EffectLayer resultStatus={state.resultStatus} />
      </div>
      <strong>{resolvedName}</strong>
      <span>{presentation.statusLabel}</span>
    </div>
  )
}
