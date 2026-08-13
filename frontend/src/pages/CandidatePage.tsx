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
import { useCandidateAuth } from '../features/candidate/useCandidateAuth'
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
  const [password, setPassword] = useState('')
  const candidateAuth = useCandidateAuth()
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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const authenticated = await candidateAuth.login(password)
    if (authenticated) {
      setPassword('')
    }
  }

  const authenticatedSession =
    candidateAuth.state.status === 'authenticated' ? candidateAuth.state.session : null

  return (
    <PageLayout
      eyebrow="후보자 대시보드"
      title="시민 정책 리포트"
      description="서비스 참여자의 익명 선택을 정책 우선순위와 의견으로 확인합니다."
      header={<AppHeader title="후보자 대시보드" backTo="/" />}
    >
      {candidateAuth.state.status === 'not-configured' ? (
        <Notice tone="danger" title="후보자 인증 설정이 필요합니다.">
          Supabase Auth 계정과 프론트엔드 환경변수를 설정한 뒤 다시 접속해 주세요.
        </Notice>
      ) : null}

      {candidateAuth.state.status === 'loading' ? (
        <LoadingState label="후보자 로그인 상태를 확인하는 중입니다." />
      ) : null}

      {candidateAuth.state.status === 'unauthenticated' ||
      candidateAuth.state.status === 'error' ? (
        <Card className="candidate-auth-card" title="후보자 전용 로그인">
          <form className="submission-form" onSubmit={handleLogin} noValidate>
            <TextInput
              type="password"
              label="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              error={
                candidateAuth.state.status === 'error' ? candidateAuth.state.message : undefined
              }
              hint="Supabase Auth에 등록한 후보자 전용 계정의 비밀번호를 입력해 주세요."
            />
            <Button
              type="submit"
              fullWidth
              size="large"
              isLoading={candidateAuth.isSubmitting}
              loadingLabel="확인 중"
            >
              대시보드 열기
            </Button>
          </form>
        </Card>
      ) : null}

      {authenticatedSession ? (
        <Notice tone="info" title="후보자 전용 화면입니다.">
          로그인된 사용자만 리포트와 시민 의견을 조회할 수 있습니다.{' '}
          <button type="button" className="text-button" onClick={() => void candidateAuth.logout()}>
            로그아웃
          </button>
        </Notice>
      ) : null}

      {authenticatedSession && configState.status === 'loading' && !config ? (
        <LoadingState label="리포트 필터 설정을 불러오는 중입니다." />
      ) : null}

      {authenticatedSession && configState.status === 'error' && !config ? (
        <ErrorState
          description={configState.error.userMessage}
          requestId={configState.error.requestId}
          action={<Button onClick={reloadConfig}>필터 설정 다시 불러오기</Button>}
        />
      ) : null}

      {authenticatedSession && config ? (
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
            accessToken={authenticatedSession.accessToken}
            filters={filters}
            onSortChange={handleSortChange}
            onPageChange={handlePageChange}
            onAuthenticationRequired={() => void candidateAuth.logout()}
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
