import type {
  CandidateCommentsPage,
  CandidateReport,
  ErrorEnvelope,
  GameConfig,
  HealthResponse,
  SimulationResult,
  Statistics,
  SubmissionResponse,
} from '../types'

const keywordCategories = [
  { id: 'ODOR', name: '악취', count: 4, rate: 40 },
  { id: 'POLLUTION_SOURCE', name: '오염원·생활하수', count: 3, rate: 30 },
  { id: 'DATA_DISCLOSURE', name: '데이터 공개', count: 1, rate: 10 },
  { id: 'ECOLOGY_RESTORATION', name: '생태 복원', count: 1, rate: 10 },
  { id: 'WALKING_AMENITIES', name: '산책로·편의시설', count: 1, rate: 10 },
  { id: 'OTHER', name: '기타', count: 0, rate: 0 },
] as const

const eventStatistics = {
  eventId: 'DOWNSTREAM_ODOR_SURGE',
  eligibleParticipants: 8,
  respondedParticipants: 8,
  responseRate: 100,
  choices: [
    { id: 'INVESTIGATE', name: '추가 수질조사', count: 6, rate: 75 },
    { id: 'WAIT', name: '일단 지켜보기', count: 2, rate: 25 },
  ],
  sensorAssistedInvestigations: { count: 4, rate: 67 },
} as const

export const mockHealth = {
  status: 'ok',
  service: 'gang-saeroi-api',
  name: '강 새로이',
} as const satisfies HealthResponse

export const mockGameConfig = {
  serviceName: '강 새로이',
  version: '0.5.0',
  maxBudget: 100,
  grades: [
    { symbol: 'Ia', name: '매우좋음', label: '매우좋음(Ia)', maxBod: 1, level: 6 },
    { symbol: 'Ib', name: '좋음', label: '좋음(Ib)', maxBod: 2, level: 5 },
    { symbol: 'II', name: '약간좋음', label: '약간좋음(II)', maxBod: 3, level: 4 },
    { symbol: 'III', name: '보통', label: '보통(III)', maxBod: 5, level: 3 },
    { symbol: 'IV', name: '약간나쁨', label: '약간나쁨(IV)', maxBod: 8, level: 2 },
    { symbol: 'V', name: '나쁨', label: '나쁨(V)', maxBod: 10, level: 1 },
    { symbol: 'VI', name: '매우나쁨', label: '매우나쁨(VI)', maxBod: null, level: 0 },
  ],
  rivers: [
    { id: 'dongcheon', name: '동천', character: '동이', initialBod: 12, difficulty: '어려움' },
    {
      id: 'goejeongcheon',
      name: '괴정천',
      character: '정이',
      initialBod: 8,
      difficulty: '보통',
    },
    {
      id: 'oncheoncheon',
      name: '온천천',
      character: '온이',
      initialBod: 3,
      difficulty: '쉬움',
    },
  ],
  policies: [
    { id: 'sewer', name: '노후 하수관 정비', cost: 25, pledgeArea: 'CLEAN UP' },
    { id: 'treatment', name: '하천 정화시설 확대', cost: 30, pledgeArea: 'CLEAN UP' },
    { id: 'sourceBlock', name: '오염원 유입 긴급 차단', cost: 20, pledgeArea: 'CLEAN UP' },
    { id: 'ecology', name: '생태하천 복원', cost: 20, pledgeArea: 'CLEAN UP' },
    { id: 'sensor', name: '스마트 수질센서 확대', cost: 10, pledgeArea: 'SMART UP' },
    { id: 'monitoring', name: '주민 참여 모니터링', cost: 10, pledgeArea: 'SMART UP' },
    { id: 'walking', name: '블루 워킹 로드 조성', cost: 15, pledgeArea: 'WALK UP' },
  ],
  events: [{ id: 'DOWNSTREAM_ODOR_SURGE', name: '하류 악취 신고 급증' }],
  badgeDefinitions: [
    { id: 'GOOD_ACHIEVED', name: '좋음 달성', description: '좋음 등급 이상을 달성했습니다.' },
    { id: 'ONE_MG_PERFECT', name: '1mg 퍼펙트', description: 'BOD 1mg/L 이하를 달성했습니다.' },
    { id: 'ECOLOGY_RECOVERY', name: '생태 회복', description: '생태 점수 70점 이상입니다.' },
    { id: 'CITIZEN_EMPATHY', name: '시민 공감', description: '시민 만족도 70점 이상입니다.' },
    { id: 'SMART_MANAGEMENT', name: '스마트 관리', description: '관리 능력 70점 이상입니다.' },
    { id: 'BUDGET_SAVER', name: '알뜰 정책', description: '예산을 효율적으로 사용했습니다.' },
  ],
  resultStatuses: [
    { id: 'TRY_AGAIN', title: 'TRY AGAIN', message: '좋음 등급에 아직 도달하지 못했습니다.' },
    {
      id: 'MISSION_COMPLETE',
      title: 'MISSION COMPLETE',
      message: '좋음 등급을 달성했습니다.',
    },
    { id: 'PERFECT_CLEAR', title: 'PERFECT CLEAR', message: '매우좋음 등급을 달성했습니다.' },
  ],
  priorities: [
    { id: 'source_control', name: '생활하수와 오염원 차단' },
    { id: 'treatment', name: '정화시설 확대' },
    { id: 'sensor', name: '실시간 수질센서 설치' },
  ],
  districts: [
    { id: 'geumjeong', name: '금정구' },
    { id: 'dongnae', name: '동래구' },
    { id: 'busanjin', name: '부산진구' },
    { id: 'saha', name: '사하구' },
    { id: 'other', name: '기타' },
    { id: 'prefer_not', name: '응답하지 않음' },
  ],
  isDemoData: true,
} as const satisfies GameConfig

export const mockSimulationResult = {
  river: { id: 'dongcheon', name: '동천' },
  character: '동이',
  initialBod: 12,
  finalBod: 1.8,
  bodReduction: 10.2,
  initialGrade: { symbol: 'VI', name: '매우나쁨', label: '매우나쁨(VI)', maxBod: null, level: 0 },
  finalGrade: { symbol: 'Ib', name: '좋음', label: '좋음(Ib)', maxBod: 2, level: 5 },
  gradeImprovement: 5,
  resultStatus: 'MISSION_COMPLETE',
  resultTitle: 'MISSION COMPLETE',
  resultMessage: '하천이 좋음 등급으로 회복되었습니다.',
  missionSuccess: true,
  perfectClear: false,
  remainingBodToMission: 0,
  selectedPolicies: [
    { id: 'sewer', name: '노후 하수관 정비', cost: 25 },
    { id: 'treatment', name: '하천 정화시설 확대', cost: 30 },
    { id: 'sourceBlock', name: '오염원 유입 긴급 차단', cost: 20 },
  ],
  policyOrder: ['sewer', 'treatment', 'sourceBlock'],
  budgetUsed: 80,
  remainingBudget: 20,
  scores: { ecology: 68, citizen: 60, monitoring: 75 },
  event: {
    id: 'DOWNSTREAM_ODOR_SURGE',
    name: '하류 악취 신고 급증',
    triggerPolicyCount: 2,
    status: 'RESOLVED',
    choice: 'INVESTIGATE',
    cost: 5,
    scoreEffects: { ecology: 0, citizen: 5, monitoring: 10 },
    sensorAssisted: false,
    message: '추가 수질조사를 진행했습니다.',
    temporaryCharacterMood: null,
  },
  selectedPledgeAreas: ['CLEAN UP'],
  pledgeMatchRate: 33,
  badges: [
    { id: 'GOOD_ACHIEVED', name: '좋음 달성', description: '좋음 등급 이상을 달성했습니다.' },
    { id: 'BUDGET_SAVER', name: '알뜰 정책', description: '예산을 효율적으로 사용했습니다.' },
  ],
  strengths: ['직접적인 수질 개선 정책을 균형 있게 선택했습니다.'],
  recommendations: [],
  isDemoData: true,
  disclaimer: '정책 이해를 위한 체험용 수치이며 실제 수질 개선량을 보장하지 않습니다.',
} as const satisfies SimulationResult

export const mockSubmissionResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-08-13T12:30:00Z',
  result: mockSimulationResult,
} as const satisfies SubmissionResponse

export const mockStatistics = {
  totalParticipants: 128,
  missionSuccessRate: 72,
  perfectClearRate: 24,
  averageGradeImprovement: 2.1,
  riverParticipation: [
    { riverId: 'dongcheon', riverName: '동천', count: 59, rate: 46 },
    { riverId: 'goejeongcheon', riverName: '괴정천', count: 44, rate: 34 },
    { riverId: 'oncheoncheon', riverName: '온천천', count: 25, rate: 20 },
  ],
  policySelection: [
    { policyId: 'sewer', policyName: '노후 하수관 정비', count: 87, rate: 68 },
    { policyId: 'sensor', policyName: '스마트 수질센서 확대', count: 69, rate: 54 },
  ],
  eventStatistics,
  commentKeywordAnalysis: {
    totalComments: 10,
    classificationMode: 'SINGLE_PRIMARY',
    dictionaryVersion: '1.0.0',
    categories: keywordCategories,
    topCategories: keywordCategories.slice(0, 3),
  },
  comments: [
    {
      riverId: 'dongcheon',
      riverName: '동천',
      comment: '악취와 생활하수 문제부터 해결해 주세요.',
      createdAt: '2026-08-13T12:30:00Z',
    },
  ],
  isDemoData: true,
} as const satisfies Statistics

export const mockCandidateComment = {
  id: '22222222-2222-4222-8222-222222222222',
  riverId: 'dongcheon',
  riverName: '동천',
  district: 'busanjin',
  districtName: '부산진구',
  topPriority: 'source_control',
  topPriorityName: '생활하수와 오염원 차단',
  comment: '악취와 생활하수 문제부터 해결해 주세요.',
  createdAt: '2026-08-13T12:30:00Z',
} as const

export const mockCandidateReport = {
  title: '부산 하천 시민 정책 리포트',
  period: { from: '2026-08-01T00:00:00Z', to: '2026-08-13T23:59:59Z' },
  filters: { riverId: null, district: null, from: null, to: null },
  summary: {
    totalParticipants: 128,
    todayParticipants: 37,
    missionSuccessRate: 72,
    perfectClearRate: 24,
  },
  policySelection: mockStatistics.policySelection,
  topPriorities: [{ id: 'source_control', name: '생활하수와 오염원 차단', count: 52, rate: 41 }],
  pledgeAreaSelection: [
    { id: 'CLEAN UP', name: 'CLEAN UP', count: 112, rate: 88 },
    { id: 'SMART UP', name: 'SMART UP', count: 70, rate: 55 },
    { id: 'WALK UP', name: 'WALK UP', count: 40, rate: 31 },
  ],
  eventStatistics,
  commentKeywordAnalysis: mockStatistics.commentKeywordAnalysis,
  perRiver: mockStatistics.riverParticipation,
  prioritiesByRiver: [{ riverId: 'dongcheon', priorityId: 'source_control', count: 30, rate: 51 }],
  prioritiesByDistrict: [
    { district: 'busanjin', priorityId: 'source_control', count: 20, rate: 45 },
  ],
  comments: [mockCandidateComment],
  methodology: {
    participation: '강 새로이 체험 후 익명 집계에 동의한 응답만 포함합니다.',
    representativeness: '이 통계는 부산 시민 전체를 대표하지 않습니다.',
  },
  isDemoData: true,
} as const satisfies CandidateReport

export const mockCandidateCommentsPage = {
  items: [mockCandidateComment],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
  sort: 'latest',
  filters: { riverId: null, district: null, from: null, to: null },
  isDemoData: true,
} as const satisfies CandidateCommentsPage

export const mockValidationError = {
  error: {
    code: 'VALIDATION_ERROR',
    message: '백엔드 내부 검증 메시지는 화면에 그대로 노출하지 않습니다.',
    details: [{ field: 'policyIds', reason: '정책을 한 개 이상 선택해 주세요.' }],
    requestId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
} as const satisfies ErrorEnvelope

export const mockDatabaseError = {
  error: {
    code: 'DATABASE_UNAVAILABLE',
    message: '백엔드 내부 저장소 메시지는 화면에 그대로 노출하지 않습니다.',
    details: [],
    requestId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  },
} as const satisfies ErrorEnvelope

export const mockInternalServerError = {
  error: {
    code: 'INTERNAL_SERVER_ERROR',
    message: '백엔드 내부 오류 메시지는 화면에 그대로 노출하지 않습니다.',
    details: [],
    requestId: 'cccccccccccccccccccccccccccccccc',
  },
} as const satisfies ErrorEnvelope
