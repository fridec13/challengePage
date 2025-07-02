interface MissionLog {
  id: string
  mission_id: string
  user_id: string
  log_date: string
  value: any
  is_late: boolean
}

interface Mission {
  id: string
  title: string
  mission_type: 'boolean' | 'number'
}

interface ScoringMethod {
  consistency: number // 꾸준함 가중치 (%)
  volume: number      // 총량 가중치 (%)
  quality: number     // 충실도 가중치 (%)
  streak_bonus: number // 연속 달성 보너스 (점수)
  enable_quality: boolean
}

interface ParticipantScore {
  user_id: string
  consistency_score: number
  volume_score: number
  quality_score: number
  streak_bonus_score: number
  total_score: number
  current_streak: number
  max_streak: number
  total_completed: number
  completion_rate: number
  late_submissions: number
  daily_completion_rate: Record<string, number> // 날짜별 완료율
}

export class ScoringSystem {
  private missions: Mission[]
  private scoringMethod: ScoringMethod
  private challengeStartDate: string
  private challengeEndDate: string

  constructor(
    missions: Mission[], 
    scoringMethod: ScoringMethod, 
    startDate: string, 
    endDate: string
  ) {
    this.missions = missions
    this.scoringMethod = scoringMethod
    this.challengeStartDate = startDate
    this.challengeEndDate = endDate
  }

  /**
   * 모든 참여자의 점수를 계산하고 순위를 매김
   */
  calculateRankings(allLogs: MissionLog[], userIds: string[]): ParticipantScore[] {
    const participantScores = userIds.map(userId => {
      const userLogs = allLogs.filter(log => log.user_id === userId)
      return this.calculateParticipantScore(userId, userLogs)
    })

    // 총점 기준으로 정렬
    return participantScores.sort((a, b) => b.total_score - a.total_score)
  }

  /**
   * 개별 참여자의 점수 계산
   */
  private calculateParticipantScore(userId: string, userLogs: MissionLog[]): ParticipantScore {
    const dates = this.getChallengeDates()
    const logsByDate = this.groupLogsByDate(userLogs)
    
    // 기본 통계 계산
    const totalCompleted = userLogs.length
    const lateSubmissions = userLogs.filter(log => log.is_late).length
    const totalPossible = dates.length * this.missions.length
    const completionRate = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0

    // 연속 달성일 계산
    const { currentStreak, maxStreak } = this.calculateStreaks(logsByDate, dates)

    // 날짜별 완료율 계산
    const dailyCompletionRate = this.calculateDailyCompletionRates(logsByDate, dates)

    // 각 요소별 점수 계산
    const consistencyScore = this.calculateConsistencyScore(currentStreak, maxStreak, dates.length)
    const volumeScore = this.calculateVolumeScore(totalCompleted, totalPossible)
    const qualityScore = this.calculateQualityScore(userLogs, lateSubmissions)
    const streakBonusScore = currentStreak * this.scoringMethod.streak_bonus

    // 최종 점수 계산
    const totalScore = 
      (consistencyScore * this.scoringMethod.consistency / 100) +
      (volumeScore * this.scoringMethod.volume / 100) +
      (this.scoringMethod.enable_quality ? qualityScore * this.scoringMethod.quality / 100 : 0) +
      streakBonusScore

    return {
      user_id: userId,
      consistency_score: consistencyScore,
      volume_score: volumeScore,
      quality_score: qualityScore,
      streak_bonus_score: streakBonusScore,
      total_score: Math.round(totalScore),
      current_streak: currentStreak,
      max_streak: maxStreak,
      total_completed: totalCompleted,
      completion_rate: Math.round(completionRate),
      late_submissions: lateSubmissions,
      daily_completion_rate: dailyCompletionRate
    }
  }

  /**
   * 꾸준함 점수 계산 (연속 달성 기반)
   */
  private calculateConsistencyScore(currentStreak: number, maxStreak: number, totalDays: number): number {
    // 현재 연속일 70% + 최대 연속일 30%
    const currentStreakScore = (currentStreak / totalDays) * 70
    const maxStreakScore = (maxStreak / totalDays) * 30
    return Math.min(100, (currentStreakScore + maxStreakScore) * 100)
  }

  /**
   * 총량 점수 계산 (전체 완료율 기반)
   */
  private calculateVolumeScore(completed: number, totalPossible: number): number {
    if (totalPossible === 0) return 0
    return Math.min(100, (completed / totalPossible) * 100)
  }

  /**
   * 충실도 점수 계산 (정시 제출률 기반)
   */
  private calculateQualityScore(userLogs: MissionLog[], lateSubmissions: number): number {
    if (!this.scoringMethod.enable_quality || userLogs.length === 0) return 0
    
    const onTimeSubmissions = userLogs.length - lateSubmissions
    const onTimeRate = onTimeSubmissions / userLogs.length
    
    // 정시 제출률 기반으로 점수 계산
    return Math.min(100, onTimeRate * 100)
  }

  /**
   * 연속 달성일 계산
   */
  private calculateStreaks(logsByDate: Record<string, MissionLog[]>, dates: string[]) {
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    
    const today = new Date().toISOString().split('T')[0]
    const sortedDates = dates.sort()

    // 현재 연속일 계산 (최신 날짜부터 역순으로)
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const date = sortedDates[i]
      if (date > today) continue // 미래 날짜는 스킵
      
      const dayLogs = logsByDate[date] || []
      const isCompleteDay = dayLogs.length === this.missions.length
      
      if (isCompleteDay) {
        if (i === sortedDates.length - 1 || date === today) {
          currentStreak++
        } else {
          break
        }
      } else {
        break
      }
    }

    // 최대 연속일 계산
    for (const date of sortedDates) {
      if (date > today) continue
      
      const dayLogs = logsByDate[date] || []
      const isCompleteDay = dayLogs.length === this.missions.length
      
      if (isCompleteDay) {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    return { currentStreak, maxStreak }
  }

  /**
   * 날짜별 완료율 계산
   */
  private calculateDailyCompletionRates(
    logsByDate: Record<string, MissionLog[]>, 
    dates: string[]
  ): Record<string, number> {
    const rates: Record<string, number> = {}
    
    for (const date of dates) {
      const dayLogs = logsByDate[date] || []
      const completionRate = (dayLogs.length / this.missions.length) * 100
      rates[date] = Math.round(completionRate)
    }
    
    return rates
  }

  /**
   * 로그를 날짜별로 그룹화
   */
  private groupLogsByDate(logs: MissionLog[]): Record<string, MissionLog[]> {
    return logs.reduce((acc, log) => {
      if (!acc[log.log_date]) {
        acc[log.log_date] = []
      }
      acc[log.log_date].push(log)
      return acc
    }, {} as Record<string, MissionLog[]>)
  }

  /**
   * 챌린지 기간의 모든 날짜 생성
   */
  private getChallengeDates(): string[] {
    const startDate = new Date(this.challengeStartDate)
    const endDate = new Date(this.challengeEndDate)
    const dates: string[] = []
    
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate).toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }

  /**
   * 현재까지의 예상 순위 변동 계산
   */
  static calculateRankingChanges(
    previousRankings: ParticipantScore[], 
    currentRankings: ParticipantScore[]
  ): Record<string, { previous: number, current: number, change: number }> {
    const changes: Record<string, { previous: number, current: number, change: number }> = {}
    
    const previousMap = new Map(previousRankings.map((score, index) => [score.user_id, index + 1]))
    
    currentRankings.forEach((score, index) => {
      const currentRank = index + 1
      const previousRank = previousMap.get(score.user_id) || currentRank
      const change = previousRank - currentRank // 양수면 순위 상승, 음수면 하락
      
      changes[score.user_id] = {
        previous: previousRank,
        current: currentRank,
        change
      }
    })
    
    return changes
  }

  /**
   * 점수 구성 요소별 상세 분석
   */
  getScoreBreakdown(participantScore: ParticipantScore): {
    consistency: { score: number, weight: number, contribution: number }
    volume: { score: number, weight: number, contribution: number }
    quality: { score: number, weight: number, contribution: number }
    streak_bonus: { score: number, contribution: number }
  } {
    return {
      consistency: {
        score: participantScore.consistency_score,
        weight: this.scoringMethod.consistency,
        contribution: Math.round(participantScore.consistency_score * this.scoringMethod.consistency / 100)
      },
      volume: {
        score: participantScore.volume_score,
        weight: this.scoringMethod.volume,
        contribution: Math.round(participantScore.volume_score * this.scoringMethod.volume / 100)
      },
      quality: {
        score: participantScore.quality_score,
        weight: this.scoringMethod.quality,
        contribution: this.scoringMethod.enable_quality ? 
          Math.round(participantScore.quality_score * this.scoringMethod.quality / 100) : 0
      },
      streak_bonus: {
        score: participantScore.current_streak,
        contribution: participantScore.streak_bonus_score
      }
    }
  }
} 