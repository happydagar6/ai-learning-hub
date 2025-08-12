"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import { useFlashcardStore } from '@/lib/flashcard-store'

const WeeklyActivity: React.FC = () => {
  const { reviews } = useFlashcardStore()
  const [weeklyProgress, setWeeklyProgress] = useState<number[]>([])
  const [totalHours, setTotalHours] = useState<number>(0)
  const [peakActivity, setPeakActivity] = useState<string>('')
  const [insights, setInsights] = useState<string>('')

  useEffect(() => {
    const progress: number[] = []
    let total = 0
    const activityByDay: { [key: string]: number } = {}

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const dayReviews = reviews.filter(r => r.created_at.slice(0, 10) === dateStr)
      progress.push(dayReviews.length)
      total += dayReviews.length
      activityByDay[dateStr] = dayReviews.length
    }

    setWeeklyProgress(progress)
    setTotalHours(total)

    const peakDay = Object.keys(activityByDay).reduce((a, b) => activityByDay[a] > activityByDay[b] ? a : b, '')
    setPeakActivity(new Date(peakDay).toLocaleDateString('en-US', { weekday: 'long' }))

    setInsights(`Your peak activity was on ${new Date(peakDay).toLocaleDateString('en-US', { weekday: 'long' })}. Consider focusing on consistent study habits.`)
  }, [reviews])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Weekly Activity
        </CardTitle>
        <CardDescription>
          Your learning activity over the past 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="text-lg font-semibold">Total Hours Spent: {totalHours}</div>
            <div className="text-lg font-semibold">Peak Activity: {peakActivity}</div>
          </div>
          <div className="text-sm text-gray-600">{insights}</div>
          <div className="flex items-end justify-between h-32">
            {weeklyProgress.map((count, index) => {
              const maxCount = Math.max(...weeklyProgress)
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              return (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="w-8 bg-gradient-to-t from-blue-500 to-blue-600 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-gray-500 mt-2">{days[index]}</div>
                  <div className="text-xs font-medium">{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default WeeklyActivity