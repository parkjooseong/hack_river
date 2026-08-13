import { describe, expect, it } from 'vitest'

import { mockSimulationResult } from '../../api/mock'
import {
  CHARACTER_GRADE_SYMBOLS,
  createRiverCharacterState,
  resolveCharacterPresentation,
  RIVER_CHARACTER_ASSETS,
} from './model'

describe('river character model', () => {
  it('provides seven grade slots for each of the three rivers', () => {
    expect(Object.keys(RIVER_CHARACTER_ASSETS)).toHaveLength(3)

    Object.values(RIVER_CHARACTER_ASSETS).forEach((assets) => {
      expect(Object.keys(assets.grades)).toEqual(CHARACTER_GRADE_SYMBOLS)
      expect(assets.expectedBodyPath).toMatch(/^\/characters\/.+\/body\.svg$/)
    })
  })

  it('keeps the grade expression while the result is not revealed', () => {
    const state = createRiverCharacterState({
      riverId: 'dongcheon',
      grade: 'Ib',
      simulation: mockSimulationResult,
    })

    expect(state.resultStatus).toBe('IN_PROGRESS')
    expect(resolveCharacterPresentation(state).expression).toBe('happy')
  })

  it('uses event and result faces with deterministic priority', () => {
    const worriedSimulation = {
      ...mockSimulationResult,
      resultStatus: 'TRY_AGAIN' as const,
      missionSuccess: false,
      event: {
        ...mockSimulationResult.event,
        temporaryCharacterMood: 'WORRIED' as const,
      },
    }
    const worried = createRiverCharacterState({
      riverId: 'dongcheon',
      grade: 'V',
      simulation: worriedSimulation,
      revealResult: true,
    })
    const success = createRiverCharacterState({
      riverId: 'dongcheon',
      grade: 'Ib',
      simulation: mockSimulationResult,
      revealResult: true,
    })

    expect(resolveCharacterPresentation(worried).expression).toBe('worried')
    expect(resolveCharacterPresentation(success).expression).toBe('celebrate')
  })

  it('uses the inline fallback until designer SVG paths are connected', () => {
    const state = createRiverCharacterState({ riverId: 'oncheoncheon', grade: 'II' })
    const presentation = resolveCharacterPresentation(state)

    expect(presentation.usesFallback).toBe(true)
    expect(presentation.expectedAssetPaths).toContain('/characters/oncheoncheon/face-grade-ii.svg')
  })
})
