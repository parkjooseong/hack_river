import type { Statistics } from '../../api'

export type RateItem = {
  id: string
  name: string
  count: number
  rate: number
}

export type CitizenComment = {
  riverName: string
  comment: string
}

export type StatisticsView = {
  totalParticipants: number
  missionSuccessRate: number
  perfectClearRate: number
  averageGradeImprovement: number
  riverParticipation: readonly RateItem[]
  policySelection: readonly RateItem[]
  topPriorities: readonly RateItem[]
  keywordCategories: readonly RateItem[]
  totalComments: number
  comments: readonly CitizenComment[]
  isDemoData: boolean
}

function rateItems(items: readonly RateItem[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    count: item.count,
    rate: item.rate,
  }))
}

export function normalizeStatistics(statistics: Statistics): StatisticsView {
  return {
    totalParticipants: statistics.totalParticipants,
    missionSuccessRate: statistics.missionSuccessRate,
    perfectClearRate: statistics.perfectClearRate,
    averageGradeImprovement: statistics.averageGradeImprovement,
    riverParticipation: rateItems(statistics.riverParticipation),
    policySelection: rateItems(statistics.policySelection),
    topPriorities: rateItems(statistics.topPriorities),
    keywordCategories: statistics.commentKeywordAnalysis.categories.map((category) => ({
      id: category.id,
      name: category.name,
      count: category.count,
      rate: category.rate,
    })),
    totalComments: statistics.commentKeywordAnalysis.totalComments,
    comments: statistics.comments.map(
      (item) =>
        ({
          riverName: item.riverName,
          comment: item.comment,
        }) satisfies CitizenComment,
    ),
    isDemoData: statistics.isDemoData,
  }
}
