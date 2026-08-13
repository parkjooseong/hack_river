import { ApiClient, getDefaultApiBaseUrl } from './client'
import type {
  CandidateCommentsPage,
  CandidateCommentsQuery,
  CandidateReport,
  CandidateReportQuery,
  GameConfig,
  HealthResponse,
  SimulationRequest,
  SimulationResult,
  Statistics,
  SubmissionRequest,
  SubmissionResponse,
} from './types'

type QueryValue = string | number | undefined

function withQuery(path: string, query: Readonly<Record<string, QueryValue>>) {
  const search = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      search.set(key, String(value))
    }
  })

  const queryString = search.toString()
  return queryString ? `${path}?${queryString}` : path
}

export class RiverApi {
  constructor(private readonly client: ApiClient) {}

  getHealth() {
    return this.client.request<HealthResponse>('/health')
  }

  getGameConfig() {
    return this.client.requestLatest<GameConfig>('game-config', '/api/game/config')
  }

  simulate(request: SimulationRequest) {
    return this.client.requestLatest<SimulationResult>('simulation', '/api/simulations', {
      method: 'POST',
      body: request,
    })
  }

  submitResponse(request: SubmissionRequest) {
    return this.client.requestSingleFlight('response-submission', () =>
      this.client.request<SubmissionResponse>('/api/responses', {
        method: 'POST',
        body: request,
      }),
    )
  }

  getStatistics() {
    return this.client.requestLatest<Statistics>('statistics', '/api/stats')
  }

  getCandidateReport(accessToken: string, query: CandidateReportQuery = {}) {
    return this.client.requestLatest<CandidateReport>(
      'candidate-report',
      withQuery('/api/candidate/report', query),
      { accessToken },
    )
  }

  getCandidateComments(accessToken: string, query: CandidateCommentsQuery = {}) {
    return this.client.requestLatest<CandidateCommentsPage>(
      'candidate-comments',
      withQuery('/api/candidate/comments', query),
      { accessToken },
    )
  }

  cancelSimulation() {
    this.client.cancelLatest('simulation')
  }
}

export function createRiverApi(options?: { baseUrl?: string; client?: ApiClient }) {
  return new RiverApi(
    options?.client ?? new ApiClient({ baseUrl: options?.baseUrl ?? getDefaultApiBaseUrl() }),
  )
}

export const riverApi = createRiverApi()
