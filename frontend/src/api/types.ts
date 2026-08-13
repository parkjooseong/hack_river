import type { components, paths } from './schema'

export type HealthResponse = components['schemas']['HealthResponse']
export type GameConfig = components['schemas']['GameConfig']
export type SimulationRequest = components['schemas']['SimulationRequest']
export type SimulationResult = components['schemas']['SimulationResult']
export type SubmissionRequest = components['schemas']['SubmissionRequest']
export type SubmissionResponse = components['schemas']['SubmissionResponse']
export type Statistics = components['schemas']['Statistics']
export type Grade = components['schemas']['Grade']
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
