import { riverApi } from '../../api'
import { useAsyncResource } from '../shared/useAsyncResource'
import { normalizeGameConfig } from './model'

async function loadGameConfig() {
  return normalizeGameConfig(await riverApi.getGameConfig())
}

export function useGameConfig() {
  return useAsyncResource(loadGameConfig)
}
