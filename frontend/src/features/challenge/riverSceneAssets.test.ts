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

  it.each([
    [0, 1, 'crying'],
    [1, 2, 'crying'],
    [2, 3, 'crying'],
    [3, 4, 'neutral'],
    [4, 5, 'neutral'],
    [5, 6, 'crowned'],
    [6, 7, 'crowned'],
  ] as const)('온천천 level %i를 수질 %i단계 %s 수달로 표시한다', (level, stage, mood) => {
    const character = resolveRiverSceneCharacter('oncheoncheon', level)

    expect(character.waterQualityStage).toBe(stage)
    expect(character.mood).toBe(mood)
    expect(character.src).toContain(`oncheoncheon-otter-${mood}.png`)
  })

  it.each([
    [0, 1, 'crying'],
    [1, 2, 'crying'],
    [2, 3, 'crying'],
    [3, 4, 'neutral'],
    [4, 5, 'neutral'],
    [5, 6, 'crowned'],
    [6, 7, 'crowned'],
  ] as const)('괴정천 level %i를 수질 %i단계 %s 고양이로 표시한다', (level, stage, mood) => {
    const character = resolveRiverSceneCharacter('goejeongcheon', level)

    expect(character.waterQualityStage).toBe(stage)
    expect(character.mood).toBe(mood)
    expect(character.src).toContain(`goejeongcheon-cat-${mood}.png`)
  })
})
