import React, { useMemo } from "react"
import { useFlashcardStore } from "@/lib/flashcard-store"
import { useDailyAccuracy } from "@/hooks/useDailyAccuracy"
import { Line, Pie, Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js"
import { TrendingUp, Clock, CheckCircle, XCircle, Award, Calendar } from "lucide-react"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
)

function getLastNDates(n: number) {
  const dates = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function getStreak(reviews: any[]) {
  // Calculate current streak (consecutive days with reviews)
  const dates = new Set(reviews.map(r => r.created_at.slice(0, 10)))
  let streak = 0
  let d = new Date()
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function getDailyAccuracy(reviews: any[], date: string) {
  const dayReviews = reviews.filter(r => r.created_at.slice(0, 10) === date)
  if (dayReviews.length === 0) return null
  
  const correct = dayReviews.filter(r => r.is_correct).length
  return Math.round((correct / dayReviews.length) * 100)
}

const AnalyticsCharts: React.FC = () => {
  const { reviews, flashcards } = useFlashcardStore()
  const { todayStats, weeklyHistory, averageWeeklyAccuracy, isNewDay } = useDailyAccuracy()
  
  const today = new Date().toISOString().slice(0, 10)

  // 1. Daily review count (last 14 days)
  const last14Days = getLastNDates(14)
  const dailyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const date of last14Days) counts[date] = 0
    for (const r of reviews) {
      const d = r.created_at.slice(0, 10)
      if (counts[d] !== undefined) counts[d]++
    }
    return last14Days.map(d => counts[d])
  }, [reviews])

  // 2. Today's Accuracy (resets daily) - using the hook
  const { 
    correct: todayCorrect, 
    incorrect: todayIncorrect, 
    total: todayTotal, 
    hasReviews: hasTodayReviews,
    studyTimeFormatted 
  } = todayStats

  // 3. Past 7 days accuracy tracking - using the hook
  const weeklyAccuracies = useMemo(() => {
    return weeklyHistory.map(record => ({
      date: record.date,
      accuracy: record.accuracy,
      reviews: record.total
    }))
  }, [weeklyHistory])

  // 4. Cards by status
  const now = new Date()
  let newCount = 0, dueCount = 0, masteredCount = 0
  for (const card of flashcards) {
    const cardReviews = reviews.filter(r => r.flashcard_id === card.id)
    if (cardReviews.length === 0) {
      newCount++
    } else {
      const last = cardReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (new Date(last.next_review_date) <= now) {
        dueCount++
      } else if (last.repetition_count >= 5 && last.is_correct) {
        masteredCount++
      }
    }
  }

  // 5. Streak
  const streak = getStreak(reviews)

  // 6. Session stats
  const totalReviews = reviews.length
  const avgPerDay = totalReviews / (reviews.length ? Math.ceil((new Date().getTime() - new Date(reviews[0].created_at).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Daily Review Count */}
      <div className="bg-card rounded-xl shadow p-4 border">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <span className="font-semibold text-foreground">Daily Reviews (last 14 days)</span>
        </div>
        <Line
          data={{
            labels: last14Days,
            datasets: [
              {
                label: "Reviews",
                data: dailyCounts,
                borderColor: "#6366f1",
                backgroundColor: "rgba(99,102,241,0.2)",
                tension: 0.3,
                fill: true,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { maxTicksLimit: 7 } } },
          }}
        />
      </div>

      {/* Today's Accuracy Pie Chart (Resets Daily) */}
      <div className="bg-card rounded-xl shadow p-4 border flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-semibold text-foreground">Today&apos;s Accuracy</span>
        </div>
        {hasTodayReviews ? (
          <>
            <Pie
              data={{
                labels: ["Correct", "Incorrect"],
                datasets: [
                  {
                    data: [todayCorrect, todayIncorrect],
                    backgroundColor: ["#22c55e", "#ef4444"],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: "bottom" } },
              }}
            />
            <div className="mt-4 text-center">
              <span className="text-2xl font-bold text-green-600">
                {Math.round((todayCorrect / todayTotal) * 100)}%
              </span>
              <span className="ml-2 text-muted-foreground">accuracy today</span>
              <div className="text-sm text-muted-foreground mt-1">
                {todayTotal} reviews completed
              </div>
              {isNewDay && (
                <div className="text-xs text-blue-500 mt-1">
                  ✨ Fresh start for today!
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground">
            <div className="text-6xl mb-2">📊</div>
            <div>No reviews today yet</div>
            <div className="text-sm">Start studying to see your accuracy!</div>
          </div>
        )}
      </div>

      {/* Past 7 Days Accuracy Trend */}
      <div className="bg-card rounded-xl shadow p-4 border">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-foreground">7-Day Accuracy Trend</span>
          {averageWeeklyAccuracy > 0 && (
            <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
              Avg: {averageWeeklyAccuracy}%
            </span>
          )}
        </div>
        {weeklyAccuracies.length > 0 || hasTodayReviews ? (
          <Line
            data={{
              labels: [
                ...weeklyAccuracies.map(day => new Date(day.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })),
                ...(hasTodayReviews ? ['Today'] : [])
              ],
              datasets: [
                {
                  label: "Daily Accuracy %",
                  data: [
                    ...weeklyAccuracies.map(day => day.accuracy),
                    ...(hasTodayReviews ? [Math.round((todayCorrect / todayTotal) * 100)] : [])
                  ],
                  borderColor: "#8b5cf6",
                  backgroundColor: "rgba(139,92,246,0.2)",
                  tension: 0.3,
                  fill: true,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { 
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const dataIndex = context.dataIndex;
                      if (dataIndex < weeklyAccuracies.length) {
                        const day = weeklyAccuracies[dataIndex];
                        return `${context.parsed.y}% accuracy (${day.reviews} reviews)`;
                      } else {
                        // Today's data
                        return `${context.parsed.y}% accuracy (${todayTotal} reviews today)`;
                      }
                    }
                  }
                }
              },
              scales: { 
                y: { 
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: function(value) {
                      return value + '%';
                    }
                  }
                }
              },
            }}
          />
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <div className="text-4xl mb-2">📈</div>
            <div>No review history yet</div>
            <div className="text-sm">Complete reviews for 7 days to see trends!</div>
          </div>
        )}
      </div>

      {/* Cards by Status Bar Chart */}
      <div className="bg-card rounded-xl shadow p-4 border">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold text-foreground">Cards by Status</span>
        </div>
        <Bar
          data={{
            labels: ["New", "Due", "Mastered"],
            datasets: [
              {
                label: "Cards",
                data: [newCount, dueCount, masteredCount],
                backgroundColor: ["#3b82f6", "#f59e42", "#22c55e"],
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
          }}
        />
      </div>

      {/* Streak and Session Stats */}
      <div className="bg-card rounded-xl shadow p-4 border flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-foreground">Daily Stats & Streak</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-bold text-purple-600">{streak} <span className="text-base font-normal">day streak</span></div>
          <div className="text-lg text-blue-600 font-medium">
            {todayTotal} <span className="text-base font-normal text-muted-foreground">reviews today</span>
            {isNewDay && todayTotal === 0 && (
              <span className="text-xs text-green-500 ml-2">✨ Fresh start!</span>
            )}
          </div>
          {hasTodayReviews && (
            <div className="text-sm text-orange-600">
              📚 {studyTimeFormatted} studied today
            </div>
          )}
          <div className="text-sm text-muted-foreground border-t pt-2 mt-1">
            {totalReviews} total reviews all-time
          </div>
          <div className="text-sm text-muted-foreground">{avgPerDay.toFixed(1)} avg reviews/day</div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsCharts 