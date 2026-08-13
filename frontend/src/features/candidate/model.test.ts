import { describe, expect, it } from 'vitest'

import { mockCandidateCommentsPage, mockCandidateReport } from '../../api/mock'
import {
  formatUtcCommentDate,
  normalizeCandidateComments,
  normalizeCandidateReport,
  parseCandidateSearchParams,
  toCandidateCommentsQuery,
  toCandidateSearchParams,
} from './model'

describe('candidate model', () => {
  it('하천만 필터로 사용하고 기존 지역·날짜 URL 값은 무시한다', () => {
    const valid = parseCandidateSearchParams(
      new URLSearchParams(
        'riverId=dongcheon&district=busanjin&from=2026-08-01&to=2026-08-31&sort=oldest&page=3',
      ),
    )
    const invalid = parseCandidateSearchParams(
      new URLSearchParams('riverId=unknown&district=none&from=2026-02-30&sort=random&page=-2'),
    )

    expect(valid).toEqual({
      riverId: 'dongcheon',
      sort: 'oldest',
      page: 3,
    })
    expect(invalid).toEqual({
      riverId: '',
      sort: 'latest',
      page: 1,
    })
  })

  it('creates compact URL parameters and API pagination queries', () => {
    const filters = parseCandidateSearchParams(
      new URLSearchParams('riverId=oncheoncheon&sort=oldest&page=2'),
    )

    expect(toCandidateSearchParams(filters).toString()).toBe(
      'riverId=oncheoncheon&sort=oldest&page=2',
    )
    expect(toCandidateCommentsQuery(filters)).toEqual({
      riverId: 'oncheoncheon',
      page: 2,
      pageSize: 10,
      sort: 'oldest',
    })
  })

  it('normalizes report summaries and nested river and district priorities', () => {
    const report = normalizeCandidateReport(mockCandidateReport)

    expect(report.summary.totalParticipants).toBe(128)
    expect(report.summary.mostSelectedPolicy).toMatchObject({
      name: '노후 하수관 정비',
      rate: 68,
    })
    expect(report.prioritiesByRiver[0]).toMatchObject({ name: '동천', totalParticipants: 59 })
    expect(report.prioritiesByDistrict[0]?.priorities[0]?.rate).toBe(45)
    expect(report.keywordCategories[0]?.name).toBe('악취')
  })

  it('keeps comment pagination and formats timestamps explicitly in UTC', () => {
    const comments = normalizeCandidateComments(mockCandidateCommentsPage)

    expect(comments.pagination.totalItems).toBe(1)
    expect(comments.items[0]).toMatchObject({
      riverName: '동천',
      districtName: '부산진구',
      topPriorityName: '생활하수와 오염원 차단',
    })
    expect(formatUtcCommentDate('2026-08-13T12:30:00Z')).toContain('12')
  })
})
