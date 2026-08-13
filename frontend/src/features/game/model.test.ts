import { describe, expect, it } from 'vitest'

import { mockGameConfig } from '../../api/mock'
import {
  eventChoiceForSimulation,
  findRiver,
  isRiverId,
  normalizeGameConfig,
  togglePolicy,
} from './model'

describe('game model', () => {
  it('turns the API config into the three river and seven policy view models', () => {
    const config = normalizeGameConfig(mockGameConfig)

    expect(config.rivers).toHaveLength(3)
    expect(config.policies).toHaveLength(7)
    expect(config.rivers[0]).toMatchObject({
      id: 'dongcheon',
      name: '동천',
      initialBod: 12,
      difficulty: '어려움',
    })
    expect(config.rivers[0]?.initialGrade.label).toBe('매우나쁨(VI)')
  })

  it('recognizes valid river ids and rejects an invalid route value', () => {
    const config = normalizeGameConfig(mockGameConfig)

    expect(isRiverId('oncheoncheon')).toBe(true)
    expect(isRiverId('unknown-river')).toBe(false)
    expect(findRiver(config, 'unknown-river')).toBeUndefined()
  })

  it('preserves policy selection order and removes a selected policy', () => {
    const selected = togglePolicy(togglePolicy([], 'sewer'), 'sensor')

    expect(selected).toEqual(['sewer', 'sensor'])
    expect(togglePolicy(selected, 'sewer')).toEqual(['sensor'])
  })

  it('keeps a handled event for the challenge but only sends it while the event is active', () => {
    expect(eventChoiceForSimulation(['sewer'], 2, 'INVESTIGATE')).toBeUndefined()
    expect(eventChoiceForSimulation(['sewer', 'sensor'], 2, 'INVESTIGATE')).toBe('INVESTIGATE')
  })
})
