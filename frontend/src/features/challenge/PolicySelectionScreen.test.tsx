import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { mockGameConfig } from '../../api/mock'
import { normalizeGameConfig } from '../game/model'
import { PolicySelectionScreen } from './PolicySelectionScreen'
import { createPolicyOffers } from './policySelectionModel'

const config = normalizeGameConfig(mockGameConfig)

describe('PolicySelectionScreen', () => {
  it.each(['dongcheon', 'goejeongcheon', 'oncheoncheon'] as const)(
    '%s의 피그마 정책 화면에 서버 설정값을 표시한다',
    (riverId) => {
      const river = config.rivers.find((item) => item.id === riverId)

      expect(river).toBeDefined()

      const markup = renderToStaticMarkup(
        <PolicySelectionScreen
          river={river!}
          policies={config.policies}
          offeredPolicyIds={['sewer', 'treatment', 'monitoring']}
          selectedPolicyIds={['sewer']}
          currentBod={river!.initialBod}
          currentGrade={river!.initialGrade}
          successThresholdBod={config.successThresholdBod}
          scores={{ ecology: 38, citizen: 35, monitoring: 30 }}
          remainingBudget={75}
          isSimulating={false}
          isSelectionLocked={false}
          onPolicySelect={() => undefined}
        />,
      )

      expect(markup).toContain(`${river!.name} 정책 선택`)
      expect(markup).toContain('남은 예산 75억원')
      expect(markup).toContain('25억')
      expect(markup).toContain('30억')
      expect(markup).toContain('10억')
      expect(markup).toContain('aria-pressed="true"')
      expect(markup).toContain('BOD')
      expect(markup).toContain('생태 +')
      expect(markup).toContain('만족 +')
    },
  )

  it('선택한 정책은 제외하고 새 후보를 최대 3개만 제시한다', () => {
    const offers = createPolicyOffers(config.policies, ['sewer', 'sensor'], 60, () => 0.42)

    expect(offers).toHaveLength(3)
    expect(new Set(offers).size).toBe(3)
    expect(offers).not.toContain('sewer')
    expect(offers).not.toContain('sensor')
  })

  it('구매 가능한 정책이 남아 있으면 후보에 최소 하나를 포함한다', () => {
    const offers = createPolicyOffers(config.policies, [], 10, () => 0)
    const offeredPolicies = offers.map((id) => config.policies.find((policy) => policy.id === id))

    expect(offeredPolicies.some((policy) => policy && policy.cost <= 10)).toBe(true)
  })
})
