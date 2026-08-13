import { describe, expect, it } from 'vitest'

import type { Statistics } from '../../api'
import { mockStatistics } from '../../api/mock'
import { normalizeStatistics } from './model'

describe('statistics model', () => {
  it('keeps backend totals and maps rate lists without recalculating them', () => {
    const data = normalizeStatistics({
      ...mockStatistics,
      topPriorities: [
        { id: 'source_control', name: '생활하수와 오염원 차단', count: 52, rate: 41 },
      ],
    } as Statistics)

    expect(data.totalParticipants).toBe(128)
    expect(data.missionSuccessRate).toBe(72)
    expect(data.riverParticipation[0]).toEqual({
      id: 'dongcheon',
      name: '동천',
      count: 59,
      rate: 46,
    })
    expect(data.topPriorities[0]?.rate).toBe(41)
    expect(data.keywordCategories[0]).toMatchObject({ name: '악취', count: 4, rate: 40 })
    expect(data.totalComments).toBe(10)
    expect(data.comments[0]?.comment).toContain('생활하수')
  })

  it('represents a zero-participant response as empty view data', () => {
    const data = normalizeStatistics({
      ...mockStatistics,
      totalParticipants: 0,
      missionSuccessRate: 0,
      perfectClearRate: 0,
      averageGradeImprovement: 0,
      riverParticipation: [],
      policySelection: [],
      commentKeywordAnalysis: {
        ...mockStatistics.commentKeywordAnalysis,
        totalComments: 0,
        categories: [],
        topCategories: [],
      },
      comments: [],
    })

    expect(data.totalParticipants).toBe(0)
    expect(data.riverParticipation).toEqual([])
    expect(data.keywordCategories).toEqual([])
    expect(data.comments).toEqual([])
  })
})
