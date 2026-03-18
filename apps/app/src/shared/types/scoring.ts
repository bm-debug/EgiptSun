/**
 * Scoring weights configuration
 * Веса для расчета скорингового балла
 */
export interface ScoringWeights {
  initialScore: number
  modifiers: {
    maritalStatus: {
      married: number
      divorced: number
    }
    income: {
      high: {
        threshold: number
        value: number
      }
      low: {
        threshold: number
        value: number
      }
    }
    creditHistory: {
      negativeKeywords: string[]
      value: number
    }
    guarantors: {
      guarantor1: number
      guarantor2: number
    }
  }
}

/**
 * Scoring risk thresholds configuration
 * Пороговые значения для определения уровня риска
 */
export interface ScoringThresholds {
  low: {
    min: number
    label: string
  }
  medium: {
    min: number
    max: number
    label: string
  }
  high: {
    max: number
    label: string
  }
}

/**
 * Scoring result stored in Deal.dataOut
 * Результат скоринга, сохраняемый в Deal.dataOut
 */
export interface ScoringResult {
  score: number
  red_flags_checked: boolean
}

