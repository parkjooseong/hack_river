import { useCallback } from 'react'

import { riverApi, type CandidateCommentsQuery, type CandidateReportQuery } from '../../api'
import { useAsyncResource } from '../shared/useAsyncResource'
import { normalizeCandidateComments, normalizeCandidateReport } from './model'

const emptyReport = (report: ReturnType<typeof normalizeCandidateReport>) =>
  report.summary.totalParticipants === 0

const emptyComments = (comments: ReturnType<typeof normalizeCandidateComments>) =>
  comments.pagination.totalItems === 0

export function useCandidateReport(query: CandidateReportQuery) {
  const load = useCallback(async () => {
    return normalizeCandidateReport(await riverApi.getCandidateReport(query))
  }, [query])

  return useAsyncResource(load, emptyReport)
}

export function useCandidateComments(query: CandidateCommentsQuery) {
  const load = useCallback(async () => {
    return normalizeCandidateComments(await riverApi.getCandidateComments(query))
  }, [query])

  return useAsyncResource(load, emptyComments)
}
