import { riverApi } from '../../api'
import { useAsyncResource } from '../shared/useAsyncResource'
import { normalizeStatistics } from './model'

async function loadStatistics() {
  return normalizeStatistics(await riverApi.getStatistics())
}

function hasNoParticipants(data: ReturnType<typeof normalizeStatistics>) {
  return data.totalParticipants === 0
}

export function useStatistics() {
  return useAsyncResource(loadStatistics, hasNoParticipants)
}
