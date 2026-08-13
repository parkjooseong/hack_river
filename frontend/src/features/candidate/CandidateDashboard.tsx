import { useEffect, useMemo } from 'react'

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageSection,
  ProgressBar,
  Select,
} from '../../components'
import {
  formatUtcCommentDate,
  formatUtcPeriodDate,
  toCandidateCommentsQuery,
  toCandidateReportQuery,
  type CandidateFilterState,
  type CandidatePriorityGroup,
  type CandidateSort,
} from './model'
import { useCandidateComments, useCandidateReport } from './useCandidateData'

type CandidateDashboardProps = {
  accessToken: string
  filters: CandidateFilterState
  onSortChange: (sort: CandidateSort) => void
  onPageChange: (page: number) => void
  onAuthenticationRequired: () => void
}

function PriorityGroups({ groups }: { groups: readonly CandidatePriorityGroup[] }) {
  if (groups.length === 0) {
    return <p className="muted-copy">해당 조건의 세부 우선 정책 데이터가 없습니다.</p>
  }

  return (
    <div className="candidate-group-list">
      {groups.map((group) => (
        <Card
          key={group.id}
          tone="subtle"
          title={group.name}
          description={`${group.totalParticipants}명 응답`}
        >
          <div className="progress-list">
            {group.priorities
              .filter((priority) => priority.count > 0)
              .map((priority) => (
                <ProgressBar
                  key={priority.id}
                  label={`${priority.name} · ${priority.count}명`}
                  value={priority.rate}
                  valueText={`${priority.rate}%`}
                />
              ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export function CandidateDashboard({
  accessToken,
  filters,
  onSortChange,
  onPageChange,
  onAuthenticationRequired,
}: CandidateDashboardProps) {
  const reportQuery = useMemo(() => toCandidateReportQuery(filters), [filters])
  const commentsQuery = useMemo(() => toCandidateCommentsQuery(filters), [filters])
  const report = useCandidateReport(reportQuery, accessToken)
  const comments = useCandidateComments(commentsQuery, accessToken)
  const reportData =
    report.state.status === 'success' || report.state.status === 'empty'
      ? report.state.data
      : report.state.status === 'loading' || report.state.status === 'error'
        ? report.state.previousData
        : undefined
  const commentsData =
    comments.state.status === 'success' || comments.state.status === 'empty'
      ? comments.state.data
      : comments.state.status === 'loading' || comments.state.status === 'error'
        ? comments.state.previousData
        : undefined

  useEffect(() => {
    const totalPages = commentsData?.pagination.totalPages ?? 0

    if (totalPages > 0 && filters.page > totalPages) {
      onPageChange(totalPages)
    }
  }, [commentsData?.pagination.totalPages, filters.page, onPageChange])

  useEffect(() => {
    const authenticationExpired = [report.state, comments.state].some(
      (state) => state.status === 'error' && state.error.status === 401,
    )
    if (authenticationExpired) {
      onAuthenticationRequired()
    }
  }, [comments.state, onAuthenticationRequired, report.state])

  return (
    <div className="candidate-dashboard">
      {report.state.status === 'loading' && !reportData ? (
        <LoadingState label="후보자용 정책 리포트를 불러오는 중입니다." />
      ) : null}

      {report.state.status === 'error' && !reportData ? (
        <ErrorState
          description={report.state.error.userMessage}
          requestId={report.state.error.requestId}
          action={<Button onClick={report.reload}>리포트 다시 불러오기</Button>}
        />
      ) : null}

      {report.state.status === 'error' && reportData ? (
        <Notice tone="warning" title="최신 리포트를 불러오지 못했습니다.">
          이전 집계 결과를 표시하고 있습니다.{' '}
          <button type="button" className="text-button" onClick={report.reload}>
            다시 시도
          </button>
        </Notice>
      ) : null}

      {report.state.status === 'empty' ? (
        <EmptyState
          title="조건에 맞는 참여 결과가 없습니다."
          description="하천·지역·날짜 필터를 변경하거나 전체 조건으로 다시 확인해 주세요."
        />
      ) : null}

      {reportData && reportData.summary.totalParticipants > 0 ? (
        <article className="candidate-report" aria-labelledby="candidate-report-title">
          <header className="report-print-header">
            <div>
              <p className="page-heading__eyebrow">후보자용 시민 정책 리포트</p>
              <h2 id="candidate-report-title">{reportData.title}</h2>
              <p>
                집계 기간(UTC): {formatUtcPeriodDate(reportData.period.from)} ~{' '}
                {formatUtcPeriodDate(reportData.period.to)}
              </p>
            </div>
            <Button className="report-print-button no-print" onClick={() => globalThis.print()}>
              PDF로 저장·인쇄
            </Button>
          </header>

          <div className="metric-grid candidate-summary-grid">
            <Card tone="subtle">
              <p className="metric-label">총 참여자</p>
              <strong className="metric-value">
                {reportData.summary.totalParticipants.toLocaleString()}명
              </strong>
            </Card>
            <Card tone="subtle">
              <p className="metric-label">오늘 참여자(KST)</p>
              <strong className="metric-value">
                {reportData.summary.todayParticipants.toLocaleString()}명
              </strong>
            </Card>
            <Card tone="subtle">
              <p className="metric-label">좋음 이상 달성률</p>
              <strong className="metric-value">{reportData.summary.missionSuccessRate}%</strong>
            </Card>
            <Card tone="subtle">
              <p className="metric-label">1mg 퍼펙트율</p>
              <strong className="metric-value">{reportData.summary.perfectClearRate}%</strong>
            </Card>
          </div>

          <Card title="핵심 결과">
            <dl className="report-key-facts">
              <div>
                <dt>평균 등급 개선</dt>
                <dd>{reportData.summary.averageGradeImprovement}단계</dd>
              </div>
              <div>
                <dt>가장 많이 선택된 정책</dt>
                <dd>
                  {reportData.summary.mostSelectedPolicy
                    ? `${reportData.summary.mostSelectedPolicy.name} (${reportData.summary.mostSelectedPolicy.rate}%)`
                    : '응답 없음'}
                </dd>
              </div>
            </dl>
          </Card>

          <PageSection title="하천별 참여와 성과">
            <div className="candidate-river-grid">
              {reportData.perRiver.map((river) => (
                <Card
                  key={river.id}
                  tone="subtle"
                  title={river.name}
                  description={`${river.count}명 · 전체의 ${river.rate}%`}
                >
                  <div className="progress-list">
                    <ProgressBar
                      label="좋음 이상 달성률"
                      value={river.missionSuccessRate}
                      valueText={`${river.missionSuccessRate}%`}
                    />
                    <ProgressBar
                      label="1mg 퍼펙트율"
                      value={river.perfectClearRate}
                      valueText={`${river.perfectClearRate}%`}
                    />
                  </div>
                  <p className="muted-copy">평균 {river.averageGradeImprovement}단계 개선</p>
                </Card>
              ))}
            </div>
          </PageSection>

          <PageSection title="정책 선택률">
            <div className="progress-list">
              {reportData.policySelection.map((policy) => (
                <ProgressBar
                  key={policy.id}
                  label={`${policy.name} · ${policy.count}명`}
                  value={policy.rate}
                  valueText={`${policy.rate}%`}
                />
              ))}
            </div>
          </PageSection>

          <PageSection title="시민 최우선 정책">
            <div className="progress-list">
              {reportData.topPriorities.map((priority) => (
                <ProgressBar
                  key={priority.id}
                  label={`${priority.name} · ${priority.count}명`}
                  value={priority.rate}
                  valueText={`${priority.rate}%`}
                />
              ))}
            </div>
          </PageSection>

          <PageSection title="공약 영역 연계">
            <div className="progress-list">
              {reportData.pledgeAreaSelection.map((area) => (
                <ProgressBar
                  key={area.id}
                  label={`${area.name} · ${area.count}명`}
                  value={area.rate}
                  valueText={`${area.rate}%`}
                />
              ))}
            </div>
          </PageSection>

          <PageSection title="하천별 우선 정책">
            <PriorityGroups groups={reportData.prioritiesByRiver} />
          </PageSection>

          <PageSection title="지역별 우선 정책">
            <PriorityGroups groups={reportData.prioritiesByDistrict} />
          </PageSection>

          <PageSection title="시민 의견 키워드">
            {reportData.keywordCategories.some((item) => item.count > 0) ? (
              <div className="progress-list">
                {reportData.keywordCategories
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
              <p className="muted-copy">분류할 시민 의견이 없습니다.</p>
            )}
          </PageSection>

          <Card className="report-methodology" title="조사 개요와 방법론">
            <dl>
              {reportData.methodology.map((item) => (
                <div key={item.id}>
                  <dt>{item.label}</dt>
                  <dd>{item.description}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </article>
      ) : null}

      <PageSection title="시민 한 줄 의견" description="필터가 적용된 익명 의견만 표시합니다.">
        <div className="candidate-comment-toolbar no-print">
          <Select
            label="의견 정렬"
            value={filters.sort}
            onChange={(event) => onSortChange(event.target.value as CandidateSort)}
            options={[
              { value: 'latest', label: '최신순' },
              { value: 'oldest', label: '오래된 순' },
            ]}
          />
        </div>

        {comments.state.status === 'loading' && !commentsData ? (
          <LoadingState label="시민 의견을 불러오는 중입니다." />
        ) : null}

        {comments.state.status === 'error' && !commentsData ? (
          <ErrorState
            title="시민 의견을 불러오지 못했습니다."
            description={comments.state.error.userMessage}
            requestId={comments.state.error.requestId}
            action={<Button onClick={comments.reload}>의견 다시 불러오기</Button>}
          />
        ) : null}

        {comments.state.status === 'error' && commentsData ? (
          <Notice tone="warning" title="최신 의견을 불러오지 못했습니다.">
            이전 의견 목록을 표시하고 있습니다.{' '}
            <button type="button" className="text-button" onClick={comments.reload}>
              다시 시도
            </button>
          </Notice>
        ) : null}

        {comments.state.status === 'empty' ? (
          <EmptyState
            title="조건에 맞는 시민 의견이 없습니다."
            description="의견을 작성하지 않은 익명 결과는 통계에는 포함되지만 목록에는 표시되지 않습니다."
          />
        ) : null}

        {commentsData && commentsData.items.length > 0 ? (
          <>
            <ul className="candidate-comment-list">
              {commentsData.items.map((comment) => (
                <li key={comment.id}>
                  <div className="candidate-comment-meta">
                    <span>{comment.riverName}</span>
                    <span>{comment.districtName}</span>
                    <time dateTime={comment.createdAt}>
                      {formatUtcCommentDate(comment.createdAt)} UTC
                    </time>
                  </div>
                  <blockquote>“{comment.comment}”</blockquote>
                  <p>최우선 정책: {comment.topPriorityName}</p>
                </li>
              ))}
            </ul>

            <nav className="pagination no-print" aria-label="시민 의견 페이지">
              <Button
                variant="secondary"
                disabled={!commentsData.pagination.hasPrevious}
                onClick={() => onPageChange(commentsData.pagination.page - 1)}
              >
                이전
              </Button>
              <p aria-live="polite">
                {commentsData.pagination.page} / {Math.max(commentsData.pagination.totalPages, 1)}
                페이지
                <span> · 총 {commentsData.pagination.totalItems}건</span>
              </p>
              <Button
                variant="secondary"
                disabled={!commentsData.pagination.hasNext}
                onClick={() => onPageChange(commentsData.pagination.page + 1)}
              >
                다음
              </Button>
            </nav>
          </>
        ) : null}
      </PageSection>
    </div>
  )
}
