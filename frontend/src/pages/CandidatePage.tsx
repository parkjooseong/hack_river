import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { District, RiverId } from '../api'
import {
  AppHeader,
  Button,
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  Notice,
  PageLayout,
  RequiredNotices,
  Select,
  TextInput,
} from '../components'
import { CandidateDashboard } from '../features/candidate/CandidateDashboard'
import {
  parseCandidateSearchParams,
  toCandidateSearchParams,
  type CandidateFilterState,
  type CandidateSort,
} from '../features/candidate/model'
import { useGameConfig } from '../features/game/useGameConfig'

export default function CandidatePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterError, setFilterError] = useState<string | null>(null)
  const filters = useMemo(() => parseCandidateSearchParams(searchParams), [searchParams])
  const filterKey = [filters.riverId, filters.district, filters.from, filters.to].join('|')
  const { state: configState, reload: reloadConfig } = useGameConfig()
  const config =
    configState.status === 'success' || configState.status === 'empty'
      ? configState.data
      : configState.status === 'loading' || configState.status === 'error'
        ? configState.previousData
        : undefined

  const updateFilters = (nextFilters: CandidateFilterState) => {
    setFilterError(null)
    setSearchParams(toCandidateSearchParams(nextFilters))
  }

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const riverIdValue = String(formData.get('riverId') ?? '')
    const districtValue = String(formData.get('district') ?? '')
    const from = String(formData.get('from') ?? '')
    const to = String(formData.get('to') ?? '')

    if (from && to && from > to) {
      setFilterError('시작일은 종료일보다 늦을 수 없습니다.')
      return
    }

    const riverId = config?.rivers.some((river) => river.id === riverIdValue)
      ? (riverIdValue as RiverId)
      : ''
    const district = config?.districts.some((item) => item.id === districtValue)
      ? (districtValue as District)
      : ''

    updateFilters({ riverId, district, from, to, sort: filters.sort, page: 1 })
  }

  const handleSortChange = (sort: CandidateSort) => {
    updateFilters({ ...filters, sort, page: 1 })
  }

  const handlePageChange = (page: number) => {
    updateFilters({ ...filters, page: Math.max(1, page) })
  }

  return (
    <PageLayout
      eyebrow="후보자 대시보드"
      title="시민 정책 리포트"
      description="서비스 참여자의 익명 선택을 정책 우선순위와 의견으로 확인합니다."
      header={<AppHeader title="후보자 대시보드" backTo="/" />}
    >
      <Notice tone="warning" title="외부 공개 전 접근 정책 확인 필요">
        현재 MVP는 로그인 없이 열립니다. 실제 공개 전 후보자용 리포트의 인증·공유 범위를 다시
        결정해야 합니다.
      </Notice>

      {configState.status === 'loading' && !config ? (
        <LoadingState label="리포트 필터 설정을 불러오는 중입니다." />
      ) : null}

      {configState.status === 'error' && !config ? (
        <ErrorState
          description={configState.error.userMessage}
          requestId={configState.error.requestId}
          action={<Button onClick={reloadConfig}>필터 설정 다시 불러오기</Button>}
        />
      ) : null}

      {config ? (
        <>
          <Card className="candidate-filter-card no-print" title="리포트 필터">
            <form key={filterKey} className="candidate-filter-form" onSubmit={handleFilterSubmit}>
              <Select
                name="riverId"
                label="하천"
                defaultValue={filters.riverId}
                options={config.rivers.map((river) => ({ value: river.id, label: river.name }))}
                placeholder="전체 하천"
              />
              <Select
                name="district"
                label="지역"
                defaultValue={filters.district}
                options={config.districts.map((district) => ({
                  value: district.id,
                  label: district.name,
                }))}
                placeholder="전체 지역"
              />
              <TextInput name="from" type="date" label="시작일(UTC)" defaultValue={filters.from} />
              <TextInput name="to" type="date" label="종료일(UTC)" defaultValue={filters.to} />
              {filterError ? (
                <Notice tone="danger" title="날짜 범위를 확인해 주세요.">
                  {filterError}
                </Notice>
              ) : null}
              <div className="candidate-filter-actions">
                <Button type="submit" fullWidth>
                  필터 적용
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() =>
                    updateFilters({
                      riverId: '',
                      district: '',
                      from: '',
                      to: '',
                      sort: 'latest',
                      page: 1,
                    })
                  }
                >
                  필터 초기화
                </Button>
              </div>
            </form>
          </Card>

          <CandidateDashboard
            key={toCandidateSearchParams(filters).toString()}
            filters={filters}
            onSortChange={handleSortChange}
            onPageChange={handlePageChange}
          />
        </>
      ) : null}

      <div className="no-print">
        <RequiredNotices showRepresentativeness />
      </div>

      <div className="button-stack no-print">
        <LinkButton to="/stats" variant="secondary" fullWidth>
          시민 통계 보기
        </LinkButton>
        <LinkButton to="/" fullWidth>
          첫 화면으로
        </LinkButton>
      </div>
    </PageLayout>
  )
}
