import { describe, expect, it } from 'vitest'

import { resolveRiverSceneCharacter } from './riverSceneAssets'

describe('resolveRiverSceneCharacter', () => {
  it.each([
    [0, 1, 'crying'],
    [1, 2, 'crying'],
    [2, 3, 'crying'],
    [3, 4, 'neutral'],
    [4, 5, 'neutral'],
    [5, 6, 'crowned'],
    [6, 7, 'crowned'],
  ] as const)('동천 level %i를 수질 %i단계 %s 호랑이로 표시한다', (level, stage, mood) => {
    const character = resolveRiverSceneCharacter('dongcheon', level)

    expect(character.waterQualityStage).toBe(stage)
    expect(character.mood).toBe(mood)
    expect(character.src).toContain(`dongcheon-tiger-${mood}.png`)
  })

  it('다른 하천 캐릭터에는 동천 표정 단계를 적용하지 않는다', () => {
    const character = resolveRiverSceneCharacter('oncheoncheon', 6)

    expect(character.mood).toBe('default')
    expect(character.src).toContain('oncheoncheon-character.png')
  })
})
