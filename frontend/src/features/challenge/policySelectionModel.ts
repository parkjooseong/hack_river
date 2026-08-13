import type { PolicyId } from '../../api'
import type { PolicyOption, RiverOption } from '../game/model'

export const POLICY_IDS = [
  'sewer',
  'treatment',
  'sourceBlock',
  'ecology',
  'sensor',
  'monitoring',
  'walking',
] as const satisfies readonly PolicyId[]
export const POLICY_OFFER_COUNT = 3

export function hasDesignedPolicySelection(riverId: RiverOption['id']) {
  return riverId === 'dongcheon' || riverId === 'goejeongcheon' || riverId === 'oncheoncheon'
}

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.max(0, Math.min(0.999_999, random())) * (index + 1))
    const current = result[index]
    result[index] = result[randomIndex]
    result[randomIndex] = current
  }

  return result
}

export function createPolicyOffers(
  policies: readonly PolicyOption[],
  selectedPolicyIds: readonly PolicyId[],
  remainingBudget: number,
  random: () => number = Math.random,
) {
  const selected = new Set(selectedPolicyIds)
  const candidates = policies.filter((policy) => !selected.has(policy.id))
  const offers = shuffled(candidates, random).slice(0, POLICY_OFFER_COUNT)
  const affordable = candidates.filter((policy) => policy.cost <= remainingBudget)

  if (affordable.length > 0 && !offers.some((policy) => policy.cost <= remainingBudget)) {
    offers[offers.length - 1] = shuffled(affordable, random)[0]
  }

  return offers.map((policy) => policy.id)
}
