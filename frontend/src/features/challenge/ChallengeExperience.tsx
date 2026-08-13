import { useEffect, useRef, useState, type FormEvent } from 'react'

import {
  ApiError,
  isApiError,
  riverApi,
  type District,
  type EventChoice,
  type PolicyId,
  type SimulationResult,
  type SubmissionResponse,
  type TopPriority,
} from '../../api'
import {
  Badge,
  Button,
  Card,
  LinkButton,
  Modal,
  Notice,
  PageSection,
  ProgressBar,
  Select,
  Textarea,
} from '../../components'
import { RiverCharacter } from '../character/RiverCharacter'
import { createRiverCharacterState } from '../character/model'
import type { AppGameConfig, PolicyOption, RiverOption } from '../game/model'
import { eventChoiceForSimulation, togglePolicy } from '../game/model'
import { createPolicyOffers, hasDesignedPolicySelection } from './policySelectionModel'
import { PolicySelectionScreen } from './PolicySelectionScreen'
import { RIVER_SCENE_ASSETS } from './riverSceneAssets'
import { clearChallengeSession, readChallengeSession, writeChallengeSession } from './session'

type ChallengeExperienceProps = {
  config: AppGameConfig
  river: RiverOption
}

type SubmissionStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: SubmissionResponse }
  | { status: 'error'; error: ApiError }

function normalizeError(error: unknown) {
  if (isApiError(error)) {
    return error
  }

  return new ApiError({
    kind: 'invalid-response',
    code: 'UNEXPECTED_CLIENT_ERROR',
    userMessage: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    cause: error,
  })
}

function policyEffect(policy: PolicyOption) {
  const effects = [
    policy.scoreEffects.ecology
      ? `생태 ${policy.scoreEffects.ecology > 0 ? '+' : ''}${policy.scoreEffects.ecology}`
      : '',
    policy.scoreEffects.citizen
      ? `시민 ${policy.scoreEffects.citizen > 0 ? '+' : ''}${policy.scoreEffects.citizen}`
      : '',
    policy.scoreEffects.monitoring
      ? `관리 ${policy.scoreEffects.monitoring > 0 ? '+' : ''}${policy.scoreEffects.monitoring}`
      : '',
  ].filter(Boolean)

  return effects.length > 0 ? effects.join(' · ') : '관리 지표 변화 없음'
}

function hasValidationReason(error: ApiError, reason: string) {
  return error.details.some((detail) => {
    return (
      typeof detail === 'object' &&
      detail !== null &&
      'reason' in detail &&
      typeof detail.reason === 'string' &&
      detail.reason === reason
    )
  })
}

function simulationErrorMessage(error: ApiError) {
  if (hasValidationReason(error, 'budget_exceeded')) {
    return '선택한 조합은 돌발상황 대응 비용을 포함해 예산을 초과합니다. 정책 조합이나 대응 방법을 바꿔 주세요.'
  }

  if (hasValidationReason(error, 'required_when_event_triggered')) {
    return '결과를 확정하려면 돌발상황 대응 방법을 선택해 주세요.'
  }

  return error.userMessage
}

export function ChallengeExperience({ config, river }: ChallengeExperienceProps) {
  const [restoredSession] = useState(() => readChallengeSession(river.id, config.commentMaxLength))
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<readonly PolicyId[]>(
    restoredSession?.selectedPolicyIds ?? [],
  )
  const [offeredPolicyIds, setOfferedPolicyIds] = useState<readonly PolicyId[]>(() =>
    createPolicyOffers(config.policies, restoredSession?.selectedPolicyIds ?? [], config.maxBudget),
  )
  const [eventChoice, setEventChoice] = useState<EventChoice | undefined>(
    restoredSession?.eventChoice,
  )
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [simulationError, setSimulationError] = useState<ApiError | null>(null)
  const [isSimulating, setIsSimulating] = useState(
    (restoredSession?.selectedPolicyIds.length ?? 0) > 0,
  )
  const [eventOpen, setEventOpen] = useState(false)
  const [showResult, setShowResult] = useState(restoredSession?.showResult ?? false)
  const [showSubmissionForm, setShowSubmissionForm] = useState(
    restoredSession?.showSubmissionForm ?? false,
  )
  const [topPriority, setTopPriority] = useState<TopPriority | ''>(
    restoredSession?.topPriority ?? '',
  )
  const [district, setDistrict] = useState<District | ''>(restoredSession?.district ?? '')
  const [comment, setComment] = useState(restoredSession?.comment ?? '')
  const [consent, setConsent] = useState(restoredSession?.consent ?? false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<SubmissionStatus>({ status: 'idle' })
  const requestVersion = useRef(0)

  useEffect(() => {
    return () => {
      requestVersion.current += 1
      riverApi.cancelSimulation()
    }
  }, [])

  useEffect(() => {
    const restored = restoredSession
    if (!restored || restored.selectedPolicyIds.length === 0) {
      return
    }

    let active = true
    const version = requestVersion.current + 1
    requestVersion.current = version
    const applicableEventChoice = eventChoiceForSimulation(
      restored.selectedPolicyIds,
      config.event.triggerPolicyCount,
      restored.eventChoice,
    )

    void riverApi
      .simulate({
        riverId: river.id,
        policyIds: restored.selectedPolicyIds,
        ...(applicableEventChoice ? { eventChoice: applicableEventChoice } : {}),
      })
      .then((result) => {
        if (!active || requestVersion.current !== version) {
          return
        }

        setSimulation(result)
        setSimulationError(null)
        setEventOpen(result.event.status === 'PENDING')
        setOfferedPolicyIds(
          createPolicyOffers(config.policies, restored.selectedPolicyIds, result.remainingBudget),
        )
        if (result.event.status === 'PENDING') {
          setShowResult(false)
          setShowSubmissionForm(false)
        } else if (result.completion.canFinish) {
          setShowResult(true)
        }
      })
      .catch((error: unknown) => {
        if (!active || requestVersion.current !== version) {
          return
        }

        const normalizedError = normalizeError(error)
        if (normalizedError.kind !== 'cancelled') {
          setSimulationError(normalizedError)
        }
      })
      .finally(() => {
        if (active && requestVersion.current === version) {
          setIsSimulating(false)
        }
      })

    return () => {
      active = false
    }
  }, [config.event.triggerPolicyCount, config.policies, restoredSession, river.id])

  useEffect(() => {
    if (submission.status === 'success') {
      clearChallengeSession(river.id)
      return
    }

    writeChallengeSession(river.id, {
      selectedPolicyIds,
      ...(eventChoice ? { eventChoice } : {}),
      showResult,
      showSubmissionForm,
      topPriority,
      district,
      comment,
      consent,
    })
  }, [
    comment,
    consent,
    district,
    eventChoice,
    river.id,
    selectedPolicyIds,
    showResult,
    showSubmissionForm,
    submission.status,
    topPriority,
  ])

  const runSimulation = async (
    nextPolicyIds: readonly PolicyId[],
    nextEventChoice: EventChoice | undefined,
    previousPolicyIds: readonly PolicyId[],
    previousEventChoice: EventChoice | undefined,
  ) => {
    const version = requestVersion.current + 1
    requestVersion.current = version
    setSelectedPolicyIds(nextPolicyIds)
    setEventChoice(nextEventChoice)
    setSimulationError(null)
    setSubmission({ status: 'idle' })
    setShowSubmissionForm(false)
    setShowResult(false)

    if (nextPolicyIds.length === 0) {
      riverApi.cancelSimulation()
      setSimulation(null)
      setIsSimulating(false)
      setEventOpen(false)
      return null
    }

    setIsSimulating(true)

    try {
      const applicableEventChoice = eventChoiceForSimulation(
        nextPolicyIds,
        config.event.triggerPolicyCount,
        nextEventChoice,
      )
      const result = await riverApi.simulate({
        riverId: river.id,
        policyIds: nextPolicyIds,
        ...(applicableEventChoice ? { eventChoice: applicableEventChoice } : {}),
      })

      if (requestVersion.current !== version) {
        return
      }

      setSimulation(result)
      setEventOpen(result.event.status === 'PENDING')
      if (result.event.status !== 'PENDING' && result.completion.canFinish) {
        setShowResult(true)
        globalThis.scrollTo?.({ top: 0, behavior: 'smooth' })
      }
      return result
    } catch (error) {
      if (requestVersion.current !== version) {
        return
      }

      const normalizedError = normalizeError(error)
      if (normalizedError.kind === 'cancelled') {
        return
      }

      setSelectedPolicyIds(previousPolicyIds)
      setEventChoice(previousEventChoice)
      setSimulationError(normalizedError)
      return null
    } finally {
      if (requestVersion.current === version) {
        setIsSimulating(false)
      }
    }
  }

  const handlePolicyToggle = (policyId: PolicyId) => {
    const nextPolicyIds = togglePolicy(selectedPolicyIds, policyId)

    void runSimulation(nextPolicyIds, eventChoice, selectedPolicyIds, eventChoice)
  }

  const handlePolicySelect = async (policyId: PolicyId) => {
    if (
      isSimulating ||
      simulation?.event.status === 'PENDING' ||
      selectedPolicyIds.includes(policyId)
    ) {
      return
    }

    const nextPolicyIds = [...selectedPolicyIds, policyId]
    const result = await runSimulation(nextPolicyIds, eventChoice, selectedPolicyIds, eventChoice)

    if (result && !result.completion.canFinish) {
      setOfferedPolicyIds(
        createPolicyOffers(config.policies, nextPolicyIds, result.remainingBudget),
      )
    }
  }

  const handleEventChoice = (choice: EventChoice) => {
    setEventOpen(false)
    void runSimulation(selectedPolicyIds, choice, selectedPolicyIds, eventChoice)
  }

  const retryCurrentSimulation = () => {
    if (selectedPolicyIds.length === 0 || isSimulating) {
      return
    }

    void runSimulation(selectedPolicyIds, eventChoice, selectedPolicyIds, eventChoice)
  }

  const handleShowResult = () => {
    if (!simulation || selectedPolicyIds.length === 0) {
      setSimulationError(
        new ApiError({
          kind: 'http',
          code: 'POLICY_REQUIRED',
          userMessage: '정책을 한 개 이상 선택해 주세요.',
        }),
      )
      return
    }

    if (simulation.event.status === 'PENDING') {
      setEventOpen(true)
      return
    }

    if (!simulation.completion.canFinish) {
      setSimulationError(
        new ApiError({
          kind: 'http',
          code: 'GAME_NOT_COMPLETE',
          userMessage:
            'BOD 2.0mg/L 이하를 달성하거나 남은 예산으로 살 수 있는 정책이 없을 때 결과를 확인할 수 있습니다.',
        }),
      )
      return
    }

    setShowResult(true)
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const resetChallenge = () => {
    requestVersion.current += 1
    riverApi.cancelSimulation()
    clearChallengeSession(river.id)
    setSelectedPolicyIds([])
    setOfferedPolicyIds(createPolicyOffers(config.policies, [], config.maxBudget))
    setEventChoice(undefined)
    setSimulation(null)
    setSimulationError(null)
    setIsSimulating(false)
    setEventOpen(false)
    setShowResult(false)
    setShowSubmissionForm(false)
    setTopPriority('')
    setDistrict('')
    setComment('')
    setConsent(false)
    setFormError(null)
    setSubmission({ status: 'idle' })
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submission.status === 'loading' || submission.status === 'success') {
      return
    }

    if (!simulation || !topPriority || !district) {
      setFormError('가장 중요한 정책과 지역을 선택해 주세요.')
      return
    }
    if (!consent) {
      setFormError('익명 집계 동의 후 제출할 수 있습니다.')
      return
    }

    setFormError(null)
    setSubmission({ status: 'loading' })

    try {
      const applicableEventChoice = eventChoiceForSimulation(
        selectedPolicyIds,
        config.event.triggerPolicyCount,
        eventChoice,
      )
      const data = await riverApi.submitResponse({
        riverId: river.id,
        policyIds: selectedPolicyIds,
        ...(applicableEventChoice ? { eventChoice: applicableEventChoice } : {}),
        topPriority,
        district,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        consentToAggregate: true,
      })
      clearChallengeSession(river.id)
      setSubmission({ status: 'success', data })
    } catch (error) {
      setSubmission({ status: 'error', error: normalizeError(error) })
    }
  }

  const currentBod = simulation?.finalBod ?? river.initialBod
  const currentGrade = simulation?.finalGrade ?? river.initialGrade
  const currentScores = simulation?.scores ?? {
    ecology: config.baseScore,
    citizen: config.baseScore,
    monitoring: config.baseScore,
  }
  const remainingBudget = simulation?.remainingBudget ?? config.maxBudget
  const policyBudget = selectedPolicyIds.reduce((total, policyId) => {
    return total + (config.policies.find((policy) => policy.id === policyId)?.cost ?? 0)
  }, 0)
  const bodImprovement = Math.max(0, river.initialBod - currentBod)
  const bodImprovementMax = Math.max(1, river.initialBod - 1)
  const eventPending = simulation?.event.status === 'PENDING'
  const commentError =
    submission.status === 'error' && submission.error.code === 'PERSONAL_INFORMATION_NOT_ALLOWED'
      ? submission.error.userMessage
      : undefined
  const playCharacterState = createRiverCharacterState({
    riverId: river.id,
    grade: currentGrade.symbol,
    simulation,
  })
  const eventModal = (
    <Modal
      open={eventOpen}
      title={config.event.name}
      onClose={() => setEventOpen(false)}
      footer={
        <div className="button-stack">
          {config.event.choices.map((choice) => (
            <Button
              key={choice.id}
              variant={choice.id === 'INVESTIGATE' ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => handleEventChoice(choice.id)}
            >
              {choice.name} ·{' '}
              {choice.id === 'INVESTIGATE' && selectedPolicyIds.includes('sensor')
                ? 0
                : choice.cost}
              억원
            </Button>
          ))}
        </div>
      }
    >
      <p>{config.event.description}</p>
      <p className="muted-copy">
        스마트 수질센서를 적용했다면 추가 조사를 더 빠르고 비용 없이 진행할 수 있습니다.
      </p>
    </Modal>
  )

  if (showResult && simulation) {
    return (
      <div className="challenge-result">
        <Card className="result-hero" title={simulation.resultTitle}>
          <p className="result-message">{simulation.resultMessage}</p>
          <div
            className="river-character figma-result-character"
            role="img"
            aria-label={`${river.name} 캐릭터 ${river.character}, 게임 종료 시점 ${simulation.finalGrade.label} 등급`}
            data-river-id={river.id}
            data-grade={simulation.finalGrade.symbol}
          >
            <div className="river-character__visual">
              <img
                className="figma-result-character__image"
                src={RIVER_SCENE_ASSETS[river.id].character}
                alt=""
              />
            </div>
            <strong>{river.character}</strong>
            <span>게임 종료 시점 · {simulation.finalGrade.label}</span>
          </div>
        </Card>

        <PageSection title={`당신이 만든 ${river.name}`}>
          <dl className="result-grid">
            <div>
              <dt>시작 BOD</dt>
              <dd>{simulation.initialBod.toFixed(1)}mg/L</dd>
            </div>
            <div>
              <dt>최종 BOD</dt>
              <dd>{simulation.finalBod.toFixed(1)}mg/L</dd>
            </div>
            <div>
              <dt>수질등급</dt>
              <dd className="result-grid__grade-change">
                {simulation.initialGrade.name} → {simulation.finalGrade.name}
              </dd>
            </div>
            <div>
              <dt>남은 예산</dt>
              <dd>{simulation.remainingBudget}억원</dd>
            </div>
          </dl>
          <div className="progress-list">
            <ProgressBar
              label="생태 점수"
              value={simulation.scores.ecology ?? 0}
              valueText={`${simulation.scores.ecology ?? 0}점`}
            />
            <ProgressBar
              label="시민 만족도"
              value={simulation.scores.citizen ?? 0}
              valueText={`${simulation.scores.citizen ?? 0}점`}
            />
            <ProgressBar
              label="관리 능력"
              value={simulation.scores.monitoring ?? 0}
              valueText={`${simulation.scores.monitoring ?? 0}점`}
            />
          </div>
        </PageSection>

        <PageSection title="나의 정책 유형">
          <Card
            className={`player-profile player-profile--${simulation.playerProfile.id.toLowerCase()}`}
            tone="outlined"
            title={simulation.playerProfile.name}
          >
            <p>{simulation.playerProfile.description}</p>
            <div className="progress-list">
              <ProgressBar
                label="수질 개선"
                value={simulation.playerProfile.scores.waterQuality}
                valueText={`${simulation.playerProfile.scores.waterQuality}점`}
              />
              <ProgressBar
                label="생태 회복"
                value={simulation.playerProfile.scores.ecology}
                valueText={`${simulation.playerProfile.scores.ecology}점`}
              />
              <ProgressBar
                label="시민 만족"
                value={simulation.playerProfile.scores.citizen}
                valueText={`${simulation.playerProfile.scores.citizen}점`}
              />
              <ProgressBar
                label="스마트 관리"
                value={simulation.playerProfile.scores.monitoring}
                valueText={`${simulation.playerProfile.scores.monitoring}점`}
              />
            </div>
            <small className="muted-copy">
              이번 게임의 정책 선택만 설명하는 결과이며 정치 성향을 판단하지 않습니다.
            </small>
          </Card>
        </PageSection>

        <PageSection title="선택의 강점">
          <ul className="bullet-list">
            {simulation.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </PageSection>

        {simulation.recommendations.length > 0 ? (
          <PageSection title="다음 도전 추천 정책">
            <div className="recommendation-list">
              {simulation.recommendations.map((recommendation) => (
                <Card
                  key={recommendation.policyId}
                  tone="outlined"
                  title={recommendation.policyName}
                >
                  <p>{recommendation.reason}</p>
                  <small>
                    예상 {recommendation.expectedFinalBod.toFixed(1)}mg/L · 남은 예산{' '}
                    {recommendation.expectedRemainingBudget}억원
                  </small>
                </Card>
              ))}
            </div>
          </PageSection>
        ) : null}

        <Notice tone="info" title="체험 결과 안내">
          {simulation.disclaimer ?? config.disclaimer}
        </Notice>

        {!showSubmissionForm && submission.status !== 'success' ? (
          <Button fullWidth size="large" onClick={() => setShowSubmissionForm(true)}>
            시민의 목소리로 전달하기
          </Button>
        ) : null}

        {showSubmissionForm && submission.status !== 'success' ? (
          <PageSection
            title="당신의 선택을 부산 하천 정책에 반영할까요?"
            description="익명 집계에 동의한 결과만 시민 통계와 후보자용 리포트에 반영합니다."
          >
            <form className="submission-form" onSubmit={handleSubmit} noValidate>
              <Select
                label="가장 먼저 추진해야 할 정책"
                value={topPriority}
                onChange={(event) => {
                  setTopPriority(event.target.value as TopPriority)
                  setFormError(null)
                }}
                options={config.priorities.map((option) => ({
                  value: option.id,
                  label: option.name,
                }))}
                placeholder="정책을 선택하세요."
                required
              />
              <Select
                label="거주 또는 활동 지역"
                value={district}
                onChange={(event) => {
                  setDistrict(event.target.value as District)
                  setFormError(null)
                }}
                options={config.districts.map((option) => ({
                  value: option.id,
                  label: option.name,
                }))}
                placeholder="지역을 선택하세요."
                required
              />
              <Textarea
                label="후보자에게 전할 한 줄 의견"
                value={comment}
                onChange={(event) => {
                  setComment(event.target.value)
                  setFormError(null)
                  if (submission.status === 'error') {
                    setSubmission({ status: 'idle' })
                  }
                }}
                maxLength={config.commentMaxLength}
                hint={`${config.privacyNotice} (${comment.length}/${config.commentMaxLength}자)`}
                error={commentError}
                placeholder="예: 악취와 생활하수 문제부터 해결해 주세요."
              />
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => {
                    setConsent(event.target.checked)
                    setFormError(null)
                  }}
                />
                <span>선택 결과와 의견을 익명 통계로 집계하는 데 동의합니다.</span>
              </label>
              {formError ? (
                <Notice tone="danger" title="입력 내용을 확인해 주세요.">
                  {formError}
                </Notice>
              ) : null}
              {submission.status === 'error' && !commentError ? (
                <Notice tone="danger" title="결과를 제출하지 못했습니다.">
                  {submission.error.userMessage}
                  {submission.error.requestId ? ` 문의 코드: ${submission.error.requestId}` : ''}
                </Notice>
              ) : null}
              <Button
                type="submit"
                fullWidth
                size="large"
                isLoading={submission.status === 'loading'}
                loadingLabel="익명 결과 제출 중"
              >
                익명 결과 제출하기
              </Button>
            </form>
          </PageSection>
        ) : null}

        {submission.status === 'success' ? (
          <Card className="submission-success" title="익명 결과가 전달되었습니다.">
            <p>시민 통계에서 방금 제출한 결과가 집계된 내용을 확인할 수 있습니다.</p>
            <div className="button-stack">
              <LinkButton to="/stats" fullWidth>
                시민 통계 확인하기
              </LinkButton>
              <Button variant="secondary" fullWidth onClick={resetChallenge}>
                다시 도전하기
              </Button>
            </div>
          </Card>
        ) : null}

        {submission.status !== 'success' ? (
          <div className="button-stack">
            {!hasDesignedPolicySelection(river.id) ? (
              <Button variant="secondary" fullWidth onClick={() => setShowResult(false)}>
                정책 조합 수정하기
              </Button>
            ) : null}
            <Button variant="ghost" fullWidth onClick={resetChallenge}>
              처음부터 다시 도전하기
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  if (hasDesignedPolicySelection(river.id)) {
    return (
      <div className="figma-challenge-play">
        <PolicySelectionScreen
          river={river}
          policies={config.policies}
          offeredPolicyIds={offeredPolicyIds}
          selectedPolicyIds={selectedPolicyIds}
          currentBod={currentBod}
          currentGrade={currentGrade}
          successThresholdBod={config.successThresholdBod}
          scores={currentScores}
          remainingBudget={remainingBudget}
          isSimulating={isSimulating}
          isSelectionLocked={isSimulating || eventPending}
          onPolicySelect={handlePolicySelect}
        />

        <div className="figma-challenge-controls">
          {isSimulating ? (
            <div className="inline-loading" role="status">
              선택 결과를 계산하는 중입니다.
            </div>
          ) : null}

          {simulationError ? (
            <Notice tone="danger" title="정책 조합을 적용하지 못했습니다.">
              {simulationErrorMessage(simulationError)}
              {simulationError.requestId ? ` 문의 코드: ${simulationError.requestId}` : ''}
              <button type="button" className="text-button" onClick={retryCurrentSimulation}>
                다시 계산하기
              </button>
            </Notice>
          ) : null}

          {eventPending ? (
            <Notice tone="warning" title="돌발상황 대응이 필요합니다.">
              결과를 확인하기 전에 대응 방법을 선택해 주세요.{' '}
              <button type="button" className="text-button" onClick={() => setEventOpen(true)}>
                대응 선택하기
              </button>
            </Notice>
          ) : null}

          <Button
            fullWidth
            size="large"
            onClick={handleShowResult}
            disabled={
              !simulation || isSimulating || eventPending || !simulation.completion.canFinish
            }
          >
            {simulation?.completion.canFinish
              ? '최종 결과 확인하기'
              : '정책을 하나 더 선택해 주세요'}
          </Button>
        </div>

        {eventModal}
      </div>
    )
  }

  return (
    <div className="challenge-play">
      <Card title={`${river.name}의 수질을 ‘좋음’ 이상으로 회복하세요.`}>
        <RiverCharacter state={playCharacterState} name={river.character} riverName={river.name} />
        <dl className="mission-summary">
          <div>
            <dt>현재 BOD</dt>
            <dd>{currentBod.toFixed(1)}mg/L</dd>
          </div>
          <span aria-hidden="true">→</span>
          <div>
            <dt>목표</dt>
            <dd>2.0mg/L 이하</dd>
          </div>
        </dl>
        <div className="bod-progress">
          <ProgressBar
            label={`수질 개선 · 현재 ${currentGrade.label}`}
            value={bodImprovement}
            max={bodImprovementMax}
            valueText={`${currentBod.toFixed(1)}mg/L`}
          />
        </div>
      </Card>

      <div className="metric-grid">
        <Card tone="subtle">
          <p className="metric-label">남은 예산</p>
          <strong className="metric-value">{remainingBudget}억원</strong>
        </Card>
        <Card tone="subtle">
          <p className="metric-label">선택 정책</p>
          <strong className="metric-value">{selectedPolicyIds.length}개</strong>
        </Card>
      </div>

      <PageSection title="관리 지표" description="정책 선택 결과를 서버에서 계산해 표시합니다.">
        <div className="progress-list">
          <ProgressBar
            label="생태 점수"
            value={currentScores.ecology ?? 0}
            valueText={`${currentScores.ecology ?? 0}점`}
          />
          <ProgressBar
            label="시민 만족도"
            value={currentScores.citizen ?? 0}
            valueText={`${currentScores.citizen ?? 0}점`}
          />
          <ProgressBar
            label="관리 능력"
            value={currentScores.monitoring ?? 0}
            valueText={`${currentScores.monitoring ?? 0}점`}
          />
        </div>
      </PageSection>

      <PageSection
        title="정책을 선택하세요."
        description="적용한 정책을 다시 누르면 취소할 수 있습니다. 최종 결과 전까지 여러 조합을 시험하세요."
      >
        <div className="policy-list">
          {config.policies.map((policy) => {
            const selected = selectedPolicyIds.includes(policy.id)
            const budgetExceeded = !selected && policyBudget + policy.cost > config.maxBudget

            return (
              <button
                key={policy.id}
                type="button"
                className={`policy-card${selected ? ' policy-card--selected' : ''}`}
                aria-pressed={selected}
                disabled={isSimulating || budgetExceeded}
                onClick={() => handlePolicyToggle(policy.id)}
              >
                <span className="policy-card__heading">
                  <strong>{policy.name}</strong>
                  <Badge tone={selected ? 'success' : 'neutral'}>
                    {selected ? '적용됨' : `${policy.cost}억원`}
                  </Badge>
                </span>
                <span className="policy-card__meta">
                  {policy.pledgeArea} · {policyEffect(policy)}
                </span>
                <span className="policy-card__description">
                  {policy.directlyReducesBod
                    ? '하천별 설정에 따라 BOD를 직접 낮추는 정책'
                    : 'BOD 직접 감소 없이 관리·시민·생태 지표를 높이는 정책'}
                </span>
                {budgetExceeded ? (
                  <span className="policy-card__warning">남은 정책 예산 초과</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </PageSection>

      {isSimulating ? (
        <div className="inline-loading" role="status">
          선택 결과를 계산하는 중입니다.
        </div>
      ) : null}

      {simulationError ? (
        <Notice tone="danger" title="정책 조합을 적용하지 못했습니다.">
          {simulationErrorMessage(simulationError)}
          {simulationError.requestId ? ` 문의 코드: ${simulationError.requestId}` : ''}
          <button type="button" className="text-button" onClick={retryCurrentSimulation}>
            다시 계산하기
          </button>
        </Notice>
      ) : null}

      {simulation?.event.status === 'RESOLVED' ? (
        <Notice tone="info" title={simulation.event.name}>
          {simulation.event.message}
        </Notice>
      ) : null}

      {eventPending ? (
        <Notice tone="warning" title="돌발상황 대응이 필요합니다.">
          결과를 확인하기 전에 악취 신고 대응 방법을 선택해 주세요.{' '}
          <button type="button" className="text-button" onClick={() => setEventOpen(true)}>
            대응 선택하기
          </button>
        </Notice>
      ) : null}

      <Notice title="게임 수치 안내">{config.disclaimer}</Notice>

      <Button
        fullWidth
        size="large"
        onClick={handleShowResult}
        disabled={!simulation || isSimulating || eventPending || !simulation.completion.canFinish}
      >
        최종 결과 확인하기
      </Button>

      {eventModal}
    </div>
  )
}
