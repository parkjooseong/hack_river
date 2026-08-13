import type {
  CandidateCommentsPage,
  CandidateCommentsQuery,
  CandidateReport,
  CandidateReportQuery,
  RiverId,
} from '../../api'

const RIVER_IDS = new Set<RiverId>(['dongcheon', 'goejeongcheon', 'oncheoncheon'])
const COMMENT_PAGE_SIZE = 10

export type CandidateSort = 'latest' | 'oldest'

export type CandidateFilterState = {
  riverId: RiverId | ''
  sort: CandidateSort
  page: number
}

export type CandidateRateItem = {
  id: string
  name: string
  count: number
  rate: number
}

export type CandidateRiverItem = CandidateRateItem & {
  missionSuccessRate: number
  perfectClearRate: number
  averageGradeImprovement: number
}

export type CandidatePriorityGroup = {
  id: string
  name: string
  totalParticipants: number
  priorities: readonly CandidateRateItem[]
}

export type CandidateReportView = {
  title: string
  period: { from: string | null; to: string | null }
  summary: {
    totalParticipants: number
    todayParticipants: number
    missionSuccessRate: number
    perfectClearRate: number
    averageGradeImprovement: number
    mostSelectedPolicy: CandidateRateItem | null
  }
  policySelection: readonly CandidateRateItem[]
  topPriorities: readonly CandidateRateItem[]
  pledgeAreaSelection: readonly CandidateRateItem[]
  perRiver: readonly CandidateRiverItem[]
  prioritiesByRiver: readonly CandidatePriorityGroup[]
  prioritiesByDistrict: readonly CandidatePriorityGroup[]
  keywordCategories: readonly CandidateRateItem[]
  methodology: readonly { id: string; label: string; description: string }[]
  isDemoData: boolean
}

export type CandidateCommentView = {
  id: string
  riverName: string
  districtName: string
  topPriorityName: string
  comment: string
  createdAt: string
}

export type CandidateCommentsView = {
  items: readonly CandidateCommentView[]
  pagination: CandidateCommentsPage['pagination']
  sort: CandidateSort
}

function isValueIn<T extends string>(values: ReadonlySet<T>, value: string): value is T {
  return values.has(value as T)
}

function positivePage(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return 1
  }

  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function parseCandidateSearchParams(searchParams: URLSearchParams): CandidateFilterState {
  const riverIdValue = searchParams.get('riverId') ?? ''
  const sortValue = searchParams.get('sort')

  return {
    riverId: isValueIn(RIVER_IDS, riverIdValue) ? riverIdValue : '',
    sort: sortValue === 'oldest' ? 'oldest' : 'latest',
    page: positivePage(searchParams.get('page')),
  }
}

export function toCandidateSearchParams(filters: CandidateFilterState) {
  const searchParams = new URLSearchParams()

  if (filters.riverId) searchParams.set('riverId', filters.riverId)
  if (filters.sort !== 'latest') searchParams.set('sort', filters.sort)
  if (filters.page > 1) searchParams.set('page', String(filters.page))

  return searchParams
}

export function toCandidateReportQuery(filters: CandidateFilterState): CandidateReportQuery {
  return {
    ...(filters.riverId ? { riverId: filters.riverId } : {}),
  }
}

export function toCandidateCommentsQuery(filters: CandidateFilterState): CandidateCommentsQuery {
  return {
    ...toCandidateReportQuery(filters),
    page: filters.page,
    pageSize: COMMENT_PAGE_SIZE,
    sort: filters.sort,
  }
}

function rateItems(items: readonly CandidateRateItem[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    count: item.count,
    rate: item.rate,
  }))
}

const METHODOLOGY_LABELS: Readonly<Record<string, string>> = {
  participation: '집계 대상',
  rates: '비율 계산',
  representativeness: '대표성',
  commentKeywords: '의견 키워드',
  prediction: '시뮬레이션 수치',
}

export function normalizeCandidateReport(report: CandidateReport): CandidateReportView {
  return {
    title: report.title,
    period: report.period,
    summary: {
      totalParticipants: report.summary.totalParticipants,
      todayParticipants: report.summary.todayParticipants,
      missionSuccessRate: report.summary.missionSuccessRate,
      perfectClearRate: report.summary.perfectClearRate,
      averageGradeImprovement: report.summary.averageGradeImprovement,
      mostSelectedPolicy: report.summary.mostSelectedPolicy,
    },
    policySelection: rateItems(report.policySelection),
    topPriorities: rateItems(report.topPriorities),
    pledgeAreaSelection: report.pledgeAreaSelection.map((item) => ({
      id: item.area,
      name: item.area,
      count: item.count,
      rate: item.rate,
    })),
    perRiver: report.perRiver.map(
      (item) =>
        ({
          id: item.id,
          name: item.name,
          count: item.count,
          rate: item.rate,
          missionSuccessRate: item.missionSuccessRate,
          perfectClearRate: item.perfectClearRate,
          averageGradeImprovement: item.averageGradeImprovement,
        }) satisfies CandidateRiverItem,
    ),
    prioritiesByRiver: report.prioritiesByRiver.map(
      (item) =>
        ({
          id: item.riverId,
          name: item.riverName,
          totalParticipants: item.totalParticipants,
          priorities: rateItems(item.priorities),
        }) satisfies CandidatePriorityGroup,
    ),
    prioritiesByDistrict: report.prioritiesByDistrict.map(
      (item) =>
        ({
          id: item.district,
          name: item.districtName,
          totalParticipants: item.totalParticipants,
          priorities: rateItems(item.priorities),
        }) satisfies CandidatePriorityGroup,
    ),
    keywordCategories: report.commentKeywordAnalysis.categories.map((category) => ({
      id: category.id,
      name: category.name,
      count: category.count,
      rate: category.rate,
    })),
    methodology: Object.entries(report.methodology).map(([id, description]) => ({
      id,
      label: METHODOLOGY_LABELS[id] ?? id,
      description,
    })),
    isDemoData: report.isDemoData,
  }
}

export function normalizeCandidateComments(page: CandidateCommentsPage): CandidateCommentsView {
  return {
    items: page.items.map((item) => ({
      id: item.id,
      riverName: item.riverName,
      districtName: item.districtName,
      topPriorityName: item.topPriorityName,
      comment: item.comment,
      createdAt: item.createdAt,
    })),
    pagination: page.pagination,
    sort: page.sort,
  }
}

export function formatUtcPeriodDate(value: string | null) {
  if (!value) return '응답 없음'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '날짜 확인 필요'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatUtcCommentDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '날짜 확인 필요'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
