"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  Bell, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  Calendar,
  Flame,
  Award
} from 'lucide-react'
import { useFlashcardStore } from '@/lib/flashcard-store'
import { useDailyAccuracy } from '@/hooks/useDailyAccuracy'

interface DashboardOverviewProps {}

const DashboardOverview: React.FC<DashboardOverviewProps> = () => {
  const { flashcards, reviews } = useFlashcardStore()
  const { todayStats, isNewDay } = useDailyAccuracy()
  const [reminders, setReminders] = useState<any[]>([])

  useEffect(() => {
    // Load reminders from localStorage
    const savedReminders = localStorage.getItem('smart-reminders')
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders))
    }
  }, [])

  // Calculate today's stats using the daily accuracy hook
  const today = new Date().toISOString().slice(0, 10)
  const { total: todayReviewCount, studyTimeFormatted } = todayStats
  
  const dueCards = flashcards.filter(card => {
    const cardReviews = reviews.filter(r => r.flashcard_id === card.id)
    if (cardReviews.length === 0) return true
    const lastReview = cardReviews.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    return new Date(lastReview.next_review_date) <= new Date()
  })

  // Calculate streak
  const dates = new Set(reviews.map(r => r.created_at.slice(0, 10)))
  let streak = 0
  let d = new Date()
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Study Streak */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Study Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-900 mb-2">
            {streak}
          </div>
          <div className="text-sm text-orange-700 mb-3">Days in a row</div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-orange-600" />
            <span className="text-xs text-orange-600">
              Keep it up!
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Due Flashcards */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Due for Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900 mb-2">
            {dueCards.length}
          </div>
          <div className="text-sm text-purple-700 mb-3">Flashcards ready</div>
          {dueCards.length > 0 ? (
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              Review Now
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Caught Up
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Today&apos;s Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900 mb-2">
            {todayReviewCount}
            {isNewDay && todayReviewCount === 0 && (
              <span className="text-xs text-blue-500 ml-2">✨ New day!</span>
            )}
          </div>
          <div className="text-sm text-green-700 mb-3">Reviews completed today</div>
          <div className="text-xs text-green-600">
            📚 {studyTimeFormatted} studied today
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardOverview 