import type { CSSProperties } from 'react'

import type { PolicyId } from '../../api'
import coinCircle from '../../assets/figma/policy-selection/coin-circle.svg'
import ecologyIcon from '../../assets/figma/policy-selection/ecology.svg'
import hammerDetail from '../../assets/figma/policy-selection/hammer-detail.svg'
import hammerHandle from '../../assets/figma/policy-selection/hammer-handle.svg'
import hammerHead from '../../assets/figma/policy-selection/hammer-head.svg'
import headerWave from '../../assets/figma/policy-selection/header-wave.svg'
import heartIcon from '../../assets/figma/policy-selection/heart.svg'
import progressSprout from '../../assets/figma/policy-selection/progress-sprout.svg'
import waterDrop from '../../assets/figma/policy-selection/water-drop.svg'
import type { PolicyOption, RiverOption } from '../game/model'
import { hasDesignedPolicySelection } from './policySelectionModel'
import { resolveRiverSceneCharacter, RIVER_SCENE_ASSETS } from './riverSceneAssets'

const policyLabels: Readonly<Record<PolicyId, string>> = {
  sewer: '하수관',
  treatment: '정화시설',
  sourceBlock: '오염 차단',
  ecology: '생태 복원',
  sensor: '센서',
  monitoring: '주민 참여',
  walking: '워킹 로드',
}

type PolicySelectionScreenProps = {
  river: RiverOption
  policies: readonly PolicyOption[]
  offeredPolicyIds: readonly PolicyId[]
  selectedPolicyIds: readonly PolicyId[]
  currentBod: number
  currentGrade: RiverOption['initialGrade']
  successThresholdBod: number
  scores: {
    ecology?: number
    citizen?: number
    monitoring?: number
  }
  remainingBudget: number
  isSimulating: boolean
  isSelectionLocked: boolean
  onPolicySelect: (policyId: PolicyId) => void
}

function ManagementIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`figma-metric-icon figma-metric-icon--management${compact ? ' figma-metric-icon--management-compact' : ''}`}
      aria-hidden="true"
    >
      <img src={hammerDetail} alt="" />
      <img src={hammerHandle} alt="" />
      <img src={hammerHead} alt="" />
    </span>
  )
}

function signedScore(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

export function PolicySelectionScreen({
  river,
  policies,
  offeredPolicyIds,
  selectedPolicyIds,
  currentBod,
  currentGrade,
  successThresholdBod,
  scores,
  remainingBudget,
  isSimulating,
  isSelectionLocked,
  onPolicySelect,
}: PolicySelectionScreenProps) {
  if (!hasDesignedPolicySelection(river.id)) {
    return null
  }

  const scene = RIVER_SCENE_ASSETS[river.id]
  const character = resolveRiverSceneCharacter(river.id, currentGrade.level)
  const offeredPolicies = offeredPolicyIds
    .map((policyId) => policies.find((policy) => policy.id === policyId))
    .filter((policy): policy is PolicyOption => policy !== undefined)
  const bodGap = Math.max(0.1, river.initialBod - successThresholdBod)
  const bodImprovement = Math.max(0, river.initialBod - currentBod)
  const bodProgress = Math.min(100, Math.round((bodImprovement / bodGap) * 100))
  const progressStyle = {
    '--figma-bod-progress': `${bodProgress}%`,
  } as CSSProperties

  return (
    <section
      className={`figma-policy-screen figma-policy-screen--${river.id}`}
      aria-labelledby="figma-policy-title"
    >
      <h1 id="figma-policy-title" className="visually-hidden">
        {river.name} 정책 선택
      </h1>

      <div className="figma-policy-scene" aria-hidden="true">
        <img className="figma-policy-scene__background" src={scene.background} alt="" />
        <img className="figma-policy-scene__ground" src={scene.ground} alt="" />
        <img
          className="figma-policy-scene__character"
          src={character.src}
          alt=""
          data-grade={currentGrade.symbol}
          data-character-mood={character.mood}
          data-water-quality-stage={character.waterQualityStage}
        />
      </div>
      <p className="visually-hidden" aria-live="polite">
        {river.character}의 현재 표정 상태는 수질 {currentGrade.label} 단계입니다.
      </p>

      <header className="figma-game-header">
        <strong>{river.name}</strong>
        <span className="figma-budget" aria-label={`남은 예산 ${remainingBudget}억원`}>
          <span className="figma-budget__coin" aria-hidden="true">
            <img src={coinCircle} alt="" />
            <b>S</b>
          </span>
          <span>{remainingBudget}억</span>
        </span>
        <img className="figma-game-header__wave" src={headerWave} alt="" aria-hidden="true" />
      </header>

      <div className="figma-policy-dashboard" aria-live="polite" aria-busy={isSimulating}>
        <section className="figma-bod-card" aria-label="현재 수질">
          <div className="figma-bod-card__heading">
            <img src={waterDrop} alt="" aria-hidden="true" />
            <strong>BOD</strong>
            <span>
              {currentBod.toFixed(1)}mg/L · 목표 {successThresholdBod.toFixed(1)}
            </span>
          </div>
          <div
            className="figma-bod-card__track"
            role="progressbar"
            aria-label="BOD 목표 달성 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={bodProgress}
            style={progressStyle}
          >
            <span className="figma-bod-card__bar" />
            <img src={progressSprout} alt="" aria-hidden="true" />
          </div>
        </section>

        <section className="figma-score-card" aria-label="정책 관리 지표">
          <div className="figma-score-item">
            <img className="figma-metric-icon" src={ecologyIcon} alt="" aria-hidden="true" />
            <span>생태</span>
            <strong>{scores.ecology ?? 0}</strong>
          </div>
          <div className="figma-score-item">
            <img className="figma-metric-icon" src={heartIcon} alt="" aria-hidden="true" />
            <span>만족</span>
            <strong>{scores.citizen ?? 0}</strong>
          </div>
          <div className="figma-score-item">
            <ManagementIcon />
            <span>관리</span>
            <strong>{scores.monitoring ?? 0}</strong>
          </div>
        </section>

        <h2>정책 선택하기</h2>
        <div className="figma-policy-tray">
          {offeredPolicies.map((policy) => {
            const selected = selectedPolicyIds.includes(policy.id)
            const budgetExceeded = policy.cost > remainingBudget
            const bodEffect = river.policyEffects[policy.id] ?? 0
            const effectLabel = [
              bodEffect > 0 ? `BOD -${bodEffect.toFixed(1)}` : 'BOD 변화 없음',
              `생태 ${signedScore(policy.scoreEffects.ecology)}`,
              `만족 ${signedScore(policy.scoreEffects.citizen)}`,
              `관리 ${signedScore(policy.scoreEffects.monitoring)}`,
            ].join(', ')

            return (
              <button
                key={policy.id}
                type="button"
                className={`figma-policy-option${selected ? ' figma-policy-option--selected' : ''}`}
                aria-label={`${policy.name}, ${policy.cost}억원, ${effectLabel}${selected ? ', 선택됨' : ''}`}
                aria-pressed={selected}
                disabled={isSelectionLocked || budgetExceeded}
                onClick={() => onPolicySelect(policy.id)}
              >
                <strong>{policyLabels[policy.id]}</strong>
                <span className="figma-policy-option__cost">{policy.cost}억</span>
                <small>
                  <span>{bodEffect > 0 ? `BOD -${bodEffect.toFixed(1)}` : 'BOD 유지'}</span>
                  <span className="figma-policy-option__effects" aria-hidden="true">
                    <span>
                      <img className="figma-policy-option__ecology-icon" src={ecologyIcon} alt="" />
                      {signedScore(policy.scoreEffects.ecology)}
                    </span>
                    <span>
                      <img className="figma-policy-option__citizen-icon" src={heartIcon} alt="" />
                      {signedScore(policy.scoreEffects.citizen)}
                    </span>
                    <span>
                      <ManagementIcon compact />
                      {signedScore(policy.scoreEffects.monitoring)}
                    </span>
                  </span>
                </small>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
