import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  Notice,
  PageLayout,
  PageSection,
  ProgressBar,
  RequiredNotices,
} from '../components'
import { useStatistics } from '../features/statistics/useStatistics'

export default function StatisticsPage() {
  const { state, reload } = useStatistics()
  const data =
    state.status === 'success' || state.status === 'empty'
      ? state.data
      : state.status === 'loading' || state.status === 'error'
        ? state.previousData
        : undefined

  return (
    <PageLayout
      eyebrow="시민 통계"
      title="시민의 선택을 확인하세요."
      description="익명 집계에 동의한 서비스 참여자의 선택 결과입니다."
      header={<AppHeader title="시민 통계" backTo="/" />}
    >
      {state.status === 'loading' && !data ? (
        <LoadingState label="시민 통계를 불러오는 중입니다." />
      ) : null}

      {state.status === 'error' && !data ? (
        <ErrorState
          description={state.error.userMessage}
          requestId={state.error.requestId}
          action={<Button onClick={reload}>다시 불러오기</Button>}
        />
      ) : null}

      {state.status === 'error' && data ? (
        <Notice tone="warning" title="최신 통계를 불러오지 못했습니다.">
          이전 통계를 표시하고 있습니다.{' '}
          <button type="button" className="text-button" onClick={reload}>
            새로고침
          </button>
        </Notice>
      ) : null}

      {state.status === 'empty' ? (
        <EmptyState
          title="아직 참여 결과가 없습니다."
          description="첫 번째 하천 정책 체험을 완료하고 익명 결과를 남겨 주세요."
          action={<LinkButton to="/">첫 도전 시작하기</LinkButton>}
        />
      ) : null}

      {data && data.totalParticipants > 0 ? (
        <>
          <div className="metric-grid metric-grid--summary">
            <Card tone="subtle">
              <p className="metric-label">총 참여자</p>
              <strong className="metric-value">{data.totalParticipants.toLocaleString()}명</strong>
            </Card>
            <Card tone="subtle">
              <p className="metric-label">평균 등급 개선</p>
              <strong className="metric-value">{data.averageGradeImprovement}단계</strong>
            </Card>
            <Card tone="subtle">
              <p className="metric-label">좋음 이상 달성률</p>
              <strong className="metric-value">{data.missionSuccessRate}%</strong>
            </Card>
            <Card tone="subtle">
              <p className="metric-label">1mg 퍼펙트율</p>
              <strong className="metric-value">{data.perfectClearRate}%</strong>
            </Card>
          </div>

          <PageSection
            title="하천별 참여"
            description="전체 참여 결과 중 각 하천이 차지하는 비율입니다."
          >
            <div className="progress-list">
              {data.riverParticipation.map((item) => (
                <ProgressBar
                  key={item.id}
                  label={`${item.name} · ${item.count}명`}
                  value={item.rate}
                  valueText={`${item.rate}%`}
                />
              ))}
            </div>
          </PageSection>

          <PageSection title="많이 선택된 정책">
            <ol className="rank-list">
              {data.policySelection.map((item, index) => (
                <li key={item.id}>
                  <span>{index + 1}위</span>
                  <strong>{item.name}</strong>
                  <span>{item.rate}%</span>
                </li>
              ))}
            </ol>
          </PageSection>

          <PageSection title="가장 먼저 추진해야 할 정책">
            {data.topPriorities.length > 0 ? (
              <div className="progress-list">
                {data.topPriorities.map((item) => (
                  <ProgressBar
                    key={item.id}
                    label={item.name}
                    value={item.rate}
                    valueText={`${item.rate}%`}
                  />
                ))}
              </div>
            ) : (
              <p className="muted-copy">아직 우선 정책 응답이 없습니다.</p>
            )}
          </PageSection>

          <PageSection
            title="시민 의견 키워드"
            description={`한 줄 의견 ${data.totalComments}건을 대표 키워드 하나로 분류한 결과입니다.`}
          >
            {data.keywordCategories.some((item) => item.count > 0) ? (
              <div className="progress-list">
                {data.keywordCategories
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <ProgressBar
                      key={item.id}
                      label={`${item.name} · ${item.count}건`}
                      value={item.rate}
                      valueText={`${item.rate}%`}
                    />
                  ))}
              </div>
            ) : (
              <p className="muted-copy">분류할 시민 의견이 아직 없습니다.</p>
            )}
          </PageSection>

          <PageSection title="최신 시민 의견">
            {data.comments.length > 0 ? (
              <ul className="comment-list">
                {data.comments.map((comment, index) => (
                  <li key={`${comment.riverName}-${index}`}>
                    <span>{comment.riverName}</span>
                    <blockquote>“{comment.comment}”</blockquote>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-copy">공개할 익명 의견이 아직 없습니다.</p>
            )}
          </PageSection>
        </>
      ) : null}

      <RequiredNotices showRepresentativeness />

      <div className="button-stack">
        <Button variant="secondary" fullWidth onClick={reload}>
          통계 새로고침
        </Button>
        <LinkButton to="/" variant="secondary" fullWidth>
          나도 참여하기
        </LinkButton>
        <LinkButton to="/candidate" fullWidth>
          후보자 대시보드
        </LinkButton>
      </div>
    </PageLayout>
  )
}
