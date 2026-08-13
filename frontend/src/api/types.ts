import type { components, paths } from './schema'

type JsonResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number,
> =
  NonNullable<paths[Path][Method]> extends { readonly responses: infer Responses }
    ? Status extends keyof Responses
      ? Responses[Status] extends { content: { readonly 'application/json': infer Body } }
        ? Body
        : never
      : never
    : never

export type HealthResponse = JsonResponse<'/health', 'get', 200>
export type GameConfig = components['schemas']['GameConfig']
export type SimulationRequest = components['schemas']['SimulationRequest']
export type SimulationResult = components['schemas']['SimulationResult']
export type SubmissionRequest = components['schemas']['SubmissionRequest']
export type SubmissionResponse = JsonResponse<'/api/responses', 'post', 201>
export type Statistics = components['schemas']['Statistics']
export type CandidateReport = components['schemas']['CandidateReport']
export type CandidateCommentsPage = components['schemas']['CandidateCommentsPage']
export type CandidateComment = components['schemas']['CandidateComment']
export type ErrorEnvelope = components['schemas']['ErrorEnvelope']

export type CandidateReportQuery = NonNullable<
  paths['/api/candidate/report']['get']['parameters']['query']
>

export type CandidateCommentsQuery = NonNullable<
  paths['/api/candidate/comments']['get']['parameters']['query']
>

export type RiverId = SimulationRequest['riverId']
export type PolicyId = SimulationRequest['policyIds'][number]
export type EventChoice = NonNullable<SimulationRequest['eventChoice']>
export type District = SubmissionRequest['district']
export type TopPriority = SubmissionRequest['topPriority']
