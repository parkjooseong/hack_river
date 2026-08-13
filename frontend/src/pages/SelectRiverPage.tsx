import {
  AppHeader,
  Badge,
  Button,
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  Notice,
  PageLayout,
} from '../components'
import { RiverCharacter } from '../features/character/RiverCharacter'
import { createRiverCharacterState } from '../features/character/model'
import { useGameConfig } from '../features/game/useGameConfig'

export default function SelectRiverPage() {
  const { state, reload } = useGameConfig()
  const data =
    state.status === 'success' || state.status === 'empty'
      ? state.data
      : state.status === 'loading' || state.status === 'error'
        ? state.previousData
        : undefined

  return (
    <PageLayout
      eyebrow="하천 선택"
      title="도전할 하천을 선택하세요."
      description="하천별 시작 상태와 난이도를 확인한 뒤 미션을 시작합니다."
      header={<AppHeader title="하천 선택" backTo="/" />}
    >
      {state.status === 'loading' && !data ? (
        <LoadingState label="하천 정보를 불러오는 중입니다." />
      ) : null}

      {state.status === 'error' && !data ? (
        <ErrorState
          description={state.error.userMessage}
          requestId={state.error.requestId}
          action={<Button onClick={reload}>다시 불러오기</Button>}
        />
      ) : null}

      {state.status === 'error' && data ? (
        <Notice tone="warning" title="최신 정보를 불러오지 못했습니다.">
          이전에 불러온 정보로 표시하고 있습니다.{' '}
          <button type="button" className="text-button" onClick={reload}>
            다시 시도
          </button>
        </Notice>
      ) : null}

      {data ? (
        <div className="river-list">
          {data.rivers.map((river) => (
            <Card
              key={river.id}
              className="river-card"
              title={river.name}
              description={`${river.character}와 함께하는 ${river.difficulty} 난이도 미션`}
            >
              <RiverCharacter
                state={createRiverCharacterState({
                  riverId: river.id,
                  grade: river.initialGrade.symbol,
                })}
                name={river.character}
                riverName={river.name}
              />
              <dl className="fact-grid">
                <div>
                  <dt>시작 BOD</dt>
                  <dd>{river.initialBod.toFixed(1)}mg/L</dd>
                </div>
                <div>
                  <dt>시작 등급</dt>
                  <dd>{river.initialGrade.label}</dd>
                </div>
              </dl>
              <div className="card-action-row">
                <Badge tone={river.difficulty === '어려움' ? 'warning' : 'info'}>
                  난이도 {river.difficulty}
                </Badge>
                <LinkButton to={`/challenge/${river.id}`}>이 하천 구하기</LinkButton>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Notice title="데모 데이터 안내">기능 시연을 위한 가상 시작값입니다.</Notice>
    </PageLayout>
  )
}
