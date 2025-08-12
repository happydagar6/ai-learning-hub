import { useState, useEffect } from 'react'
import { useFlashcardStore } from '@/lib/flashcard-store'

interface DailyAccuracyRecord {
  date: string
  correct: number
  total: number
  accuracy: number
}

interface DailyAccuracyState {
  todayAccuracy: DailyAccuracyRecord | null
  weeklyHistory: DailyAccuracyRecord[]
  lastResetDate: string | null
}

const STORAGE_KEY = 'daily-accuracy-tracker'

export function useDailyAccuracy() {
  const { reviews } = useFlashcardStore()
  const [dailyState, setDailyState] = useState<DailyAccuracyState>({
    todayAccuracy: null,
    weeklyHistory: [],
    lastResetDate: null
  })

  const today = new Date().toISOString().slice(0, 10)

  // Load stored data on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setDailyState(parsed)
      } catch (error) {
        console.error('Failed to parse stored daily accuracy data:', error)
      }
    }
  }, [])

  // Save data to localStorage whenever dailyState changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyState))
  }, [dailyState])

  // Check for daily reset and update accuracy
  useEffect(() => {
    const shouldReset = dailyState.lastResetDate !== today

    if (shouldReset) {
      // If we have data from yesterday, add it to history before reset
      if (dailyState.todayAccuracy && dailyState.lastResetDate) {
        const yesterdayRecord = {
          ...dailyState.todayAccuracy,
          date: dailyState.lastResetDate
        }
        
        setDailyState(prevState => {
          // Add yesterday's data to history and keep only last 7 days
          const newHistory = [yesterdayRecord, ...prevState.weeklyHistory]
            .slice(0, 7) // Keep only last 7 days
            .filter(record => {
              const recordDate = new Date(record.date)
              const sevenDaysAgo = new Date()
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
              return recordDate >= sevenDaysAgo
            })

          return {
            todayAccuracy: null,
            weeklyHistory: newHistory,
            lastResetDate: today
          }
        })
      } else {
        // First time or no previous data
        setDailyState(prevState => ({
          ...prevState,
          todayAccuracy: null,
          lastResetDate: today
        }))
      }
    }
  }, [today, dailyState.lastResetDate, dailyState.todayAccuracy])

  // Update today's accuracy based on reviews
  useEffect(() => {
    const todayReviews = reviews.filter(r => r.created_at.slice(0, 10) === today)
    
    if (todayReviews.length > 0) {
      const correct = todayReviews.filter(r => r.is_correct).length
      const total = todayReviews.length
      const accuracy = Math.round((correct / total) * 100)

      const newTodayAccuracy: DailyAccuracyRecord = {
        date: today,
        correct,
        total,
        accuracy
      }

      setDailyState(prevState => ({
        ...prevState,
        todayAccuracy: newTodayAccuracy
      }))
    }
  }, [reviews, today])

  // Helper functions
  const getTodayAccuracy = (): DailyAccuracyRecord | null => {
    return dailyState.todayAccuracy
  }

  const getWeeklyHistory = (): DailyAccuracyRecord[] => {
    return dailyState.weeklyHistory
  }

  const getAverageWeeklyAccuracy = (): number => {
    if (dailyState.weeklyHistory.length === 0) return 0
    
    const totalAccuracy = dailyState.weeklyHistory.reduce((sum, record) => sum + record.accuracy, 0)
    return Math.round(totalAccuracy / dailyState.weeklyHistory.length)
  }

  const getTodayStats = () => {
    const todayReviews = reviews.filter(r => r.created_at.slice(0, 10) === today)
    const correct = todayReviews.filter(r => r.is_correct).length
    const total = todayReviews.length
    
    // Calculate estimated study time (2 minutes per review)
    const estimatedStudyTimeMinutes = total * 2
    
    return {
      correct,
      incorrect: total - correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      hasReviews: total > 0,
      studyTimeMinutes: estimatedStudyTimeMinutes,
      studyTimeFormatted: estimatedStudyTimeMinutes >= 60 
        ? `${Math.floor(estimatedStudyTimeMinutes / 60)}h ${estimatedStudyTimeMinutes % 60}m`
        : `${estimatedStudyTimeMinutes}m`
    }
  }

  // Manual reset function (for testing or admin purposes)
  const resetDailyAccuracy = () => {
    setDailyState({
      todayAccuracy: null,
      weeklyHistory: [],
      lastResetDate: today
    })
  }

  return {
    todayAccuracy: getTodayAccuracy(),
    weeklyHistory: getWeeklyHistory(),
    averageWeeklyAccuracy: getAverageWeeklyAccuracy(),
    todayStats: getTodayStats(),
    resetDailyAccuracy,
    isNewDay: dailyState.lastResetDate !== today
  }
}
