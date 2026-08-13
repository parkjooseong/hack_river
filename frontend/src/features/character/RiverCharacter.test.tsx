import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RiverCharacter } from './RiverCharacter'
import { createRiverCharacterState } from './model'

describe('RiverCharacter', () => {
  it('gives the informative character a text alternative and hides fallback SVG details', () => {
    const markup = renderToStaticMarkup(
      <RiverCharacter
        state={createRiverCharacterState({ riverId: 'goejeongcheon', grade: 'IV' })}
        name="정이"
        riverName="괴정천"
      />,
    )

    expect(markup).toContain('role="img"')
    expect(markup).toContain('괴정천 캐릭터 정이')
    expect(markup).toContain('수질 IV 등급')
    expect(markup).toContain('<svg')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('exposes the state as stable data attributes for design and motion replacement', () => {
    const markup = renderToStaticMarkup(
      <RiverCharacter
        state={{
          riverId: 'dongcheon',
          grade: 'Ia',
          eventState: 'RESOLVED',
          resultStatus: 'PERFECT_CLEAR',
        }}
      />,
    )

    expect(markup).toContain('data-grade="Ia"')
    expect(markup).toContain('data-event-state="RESOLVED"')
    expect(markup).toContain('data-result-status="PERFECT_CLEAR"')
    expect(markup).toContain('퍼펙트 달성')
  })
})
