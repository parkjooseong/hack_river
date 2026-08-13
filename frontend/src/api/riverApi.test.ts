import { describe, expect, it, vi } from 'vitest'

import { ApiClient, type FetchLike } from './client'
import {
  createMockFetch,
  mockCandidateCommentsPage,
  mockCandidateReport,
  mockGameConfig,
  mockHealth,
  mockSimulationResult,
  mockStatistics,
  mockSubmissionResponse,
} from './mock'
import { RiverApi } from './riverApi'
import type { SimulationRequest, SubmissionRequest } from './types'

const simulationRequest = {
  riverId: 'dongcheon',
  policyIds: ['sewer', 'treatment'],
  eventChoice: 'INVESTIGATE',
} as const satisfies SimulationRequest

const submissionRequest = {
  ...simulationRequest,
  topPriority: 'source_control',
  district: 'busanjin',
  comment: '악취 문제부터 해결해 주세요.',
  consentToAggregate: true,
} as const satisfies SubmissionRequest

describe('RiverApi', () => {
  it('7개 백엔드 API의 정상 mock 응답을 제공한다', async () => {
    const api = new RiverApi(
      new ApiClient({ baseUrl: 'http://mock.local', fetch: createMockFetch() }),
    )

    await expect(api.getHealth()).resolves.toEqual(mockHealth)
    await expect(api.getGameConfig()).resolves.toEqual(mockGameConfig)
    await expect(api.simulate(simulationRequest)).resolves.toEqual(mockSimulationResult)
    await expect(api.submitResponse(submissionRequest)).resolves.toEqual(mockSubmissionResponse)
    await expect(api.getStatistics()).resolves.toEqual(mockStatistics)
    await expect(api.getCandidateReport()).resolves.toEqual(mockCandidateReport)
    await expect(api.getCandidateComments()).resolves.toEqual(mockCandidateCommentsPage)
  })

  it('후보자 조회 조건을 query string으로 전달한다', async () => {
    const requestedUrls: string[] = []
    const baseFetch = createMockFetch()
    const recordingFetch: FetchLike = (input, init) => {
      requestedUrls.push(String(input))
      return baseFetch(input, init)
    }
    const api = new RiverApi(new ApiClient({ baseUrl: 'http://mock.local', fetch: recordingFetch }))

    await api.getCandidateReport({
      riverId: 'dongcheon',
      district: 'busanjin',
      from: '2026-08-01',
      to: '2026-08-13',
    })
    await api.getCandidateComments({ page: 2, pageSize: 20, sort: 'oldest' })

    expect(requestedUrls[0]).toBe(
      'http://mock.local/api/candidate/report?riverId=dongcheon&district=busanjin&from=2026-08-01&to=2026-08-13',
    )
    expect(requestedUrls[1]).toBe(
      'http://mock.local/api/candidate/comments?page=2&pageSize=20&sort=oldest',
    )
  })

  it('새 시뮬레이션 요청이 이전 요청을 취소한다', async () => {
    const api = new RiverApi(
      new ApiClient({ baseUrl: 'http://mock.local', fetch: createMockFetch({ delayMs: 20 }) }),
    )
    const firstRequest = api.simulate(simulationRequest)
    const firstResult = expect(firstRequest).rejects.toMatchObject({
      kind: 'cancelled',
      code: 'REQUEST_CANCELLED',
    })
    const secondRequest = api.simulate({ ...simulationRequest, policyIds: ['sewer'] })

    await firstResult
    await expect(secondRequest).resolves.toEqual(mockSimulationResult)
  })

  it('처리 중인 제출 요청을 공유해 중복 전송을 막는다', async () => {
    const baseFetch = createMockFetch({ delayMs: 10 })
    const fetchMock = vi.fn<FetchLike>((input, init) => baseFetch(input, init))
    const api = new RiverApi(new ApiClient({ baseUrl: 'http://mock.local', fetch: fetchMock }))

    const firstRequest = api.submitResponse(submissionRequest)
    const secondRequest = api.submitResponse(submissionRequest)

    expect(firstRequest).toBe(secondRequest)
    await expect(firstRequest).resolves.toEqual(mockSubmissionResponse)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
