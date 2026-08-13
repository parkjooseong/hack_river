import { useParams } from 'react-router-dom'

import { AppHeader, Button, ErrorState, LinkButton, LoadingState, PageLayout } from '../components'
import { ChallengeExperience } from '../features/challenge/ChallengeExperience'
import { hasDesignedPolicySelection } from '../features/challenge/policySelectionModel'
import { findRiver } from '../features/game/model'
import { useGameConfig } from '../features/game/useGameConfig'

export default function ChallengePage() {
  const { river: riverId } = useParams()
  const { state, reload } = useGameConfig()
  const config =
    state.status === 'success' || state.status === 'empty'
      ? state.data
      : state.status === 'loading' || state.status === 'error'
        ? state.previousData
        : undefined
  const river = config ? findRiver(config, riverId) : undefined

  if (config && river && hasDesignedPolicySelection(river.id)) {
    return (
      <main id="main-content" className="figma-challenge-page">
        <ChallengeExperience key={river.id} config={config} river={river} />
      </main>
    )
  }

  return (
    <PageLayout
      eyebrow="챌린지"
      title={river ? `${river.name} 하천 미션` : '하천 정책 챌린지'}
      description={
        river
          ? `${config?.maxBudget ?? 100}억원 안에서 정책을 선택해 ${river.character}의 표정을 되찾아 주세요.`
          : '선택한 하천의 미션 정보를 확인합니다.'
      }
      header={<AppHeader title={river ? `${river.name} 챌린지` : '챌린지'} backTo="/select" />}
    >
      {state.status === 'loading' && !config ? (
        <LoadingState label="챌린지 설정을 불러오는 중입니다." />
      ) : null}

      {state.status === 'error' && !config ? (
        <ErrorState
          description={state.error.userMessage}
          requestId={state.error.requestId}
          action={<Button onClick={reload}>다시 불러오기</Button>}
        />
      ) : null}

      {config && !river ? (
        <ErrorState
          title="하천을 찾을 수 없습니다."
          description="주소가 올바른지 확인하거나 하천 선택 화면으로 돌아가 주세요."
          action={<LinkButton to="/select">하천 다시 선택하기</LinkButton>}
        />
      ) : null}

      {config && river ? (
        <ChallengeExperience key={river.id} config={config} river={river} />
      ) : null}
    </PageLayout>
  )
}
