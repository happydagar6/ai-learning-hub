"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, CheckCircle, X, RotateCcw, Clock, Target, Calendar } from "lucide-react"
import { useFlashcardStore, type Flashcard } from "@/lib/flashcard-store"

type SpacedRepetitionReviewProps = {}

const SpacedRepetitionReview: React.FC<SpacedRepetitionReviewProps> = () => {
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0,
  })
  const [isReviewActive, setIsReviewActive] = useState(false)

  const { getCardsForReview, calculateNextReview, addReview } = useFlashcardStore()

  useEffect(() => {
    loadReviewCards()
  }, [])

  const loadReviewCards = () => {
    // Use anonymous user for review
    const cards = getCardsForReview("anonymous-user")
    setReviewCards(cards)
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setSessionStats({ correct: 0, incorrect: 0, total: cards.length })
  }

  const startReview = () => {
    setIsReviewActive(true)
    setShowAnswer(false)
  }

  const handleAnswer = async (isCorrect: boolean, difficulty: number) => {
    if (!reviewCards[currentCardIndex]) return

    const currentCard = reviewCards[currentCardIndex]
    const nextReviewDate = calculateNextReview(currentCard, isCorrect, difficulty)

    // Create review record
    const review = {
      id: Date.now(), // Temporary ID
      flashcard_id: currentCard.id,
      user_id: "anonymous-user", // Use anonymous user
      is_correct: isCorrect,
      difficulty_rating: difficulty,
      next_review_date: nextReviewDate.toISOString(),
      interval_days: 1, // This would be calculated properly
      ease_factor: 2.5, // This would be calculated properly
      repetition_count: 0, // This would be calculated properly
      created_at: new Date().toISOString(),
    }

    addReview(review)

    // Update session stats
    setSessionStats((prev) => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }))

    // Move to next card or finish session
    if (currentCardIndex < reviewCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1)
      setShowAnswer(false)
    } else {
      // Review session complete
      setIsReviewActive(false)
      loadReviewCards() // Reload for next session
    }
  }

  const currentCard = reviewCards[currentCardIndex]
  const progress = reviewCards.length > 0 ? ((currentCardIndex + 1) / reviewCards.length) * 100 : 0

  if (reviewCards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Spaced Repetition Review
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Cards Due for Review</h3>
          <p className="text-muted-foreground mb-4">
            Great job! You&apos;re all caught up with your reviews. Check back later for more cards to review.
          </p>
          <Button onClick={loadReviewCards}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Check Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!isReviewActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Spaced Repetition Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{reviewCards.length}</div>
            <p className="text-muted-foreground">Cards ready for review</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">{sessionStats.correct}</div>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">{sessionStats.incorrect}</div>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect || 1)) * 100)}%
              </div>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </div>
          </div>

          <Button onClick={startReview} className="w-full" size="lg">
            <Brain className="h-4 w-4 mr-2" />
            Start Review Session
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Review Session
            </CardTitle>
            <Badge variant="outline">
              {currentCardIndex + 1} / {reviewCards.length}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          {currentCard && (
            <>
              <div className="text-center space-y-4">
                <Badge variant="secondary">{currentCard.difficulty}</Badge>
                <div className="min-h-[400px] sm:min-h-[450px] flex items-center justify-center p-4">
                  {!showAnswer ? (
                    <div className="space-y-4 text-center w-full">
                      <div className="prose prose-sm sm:prose-base max-w-none">
                        <h3 className="text-xl font-semibold">{currentCard.question}</h3>
                      </div>
                      {currentCard.question_type === "multiple_choice" && currentCard.options && (
                        <div className="space-y-2 max-w-md mx-auto">
                          {currentCard.options.map((option, index) => (
                            <div key={index} className="p-3 bg-accent rounded border border-border text-sm sm:text-base text-foreground">
                              <span className="font-medium text-blue-600">{String.fromCharCode(65 + index)}.</span> {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 text-center w-full">
                      <h4 className="text-lg font-medium text-foreground">Answer:</h4>
                      <div className="prose prose-sm sm:prose-base max-w-none">
                        <p className="text-lg">{currentCard.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                {!showAnswer ? (
                  <Button onClick={() => setShowAnswer(true)} size="lg">
                    Show Answer
                  </Button>
                ) : (
                  <div className="space-y-4 w-full">
                    <p className="text-center text-muted-foreground">How well did you know this?</p>
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleAnswer(false, 1)}
                        className="flex flex-col items-center p-4 h-auto border-red-200 hover:bg-red-50"
                      >
                        <X className="h-5 w-5 text-red-500 mb-1" />
                        <span className="text-xs">Again</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAnswer(false, 2)}
                        className="flex flex-col items-center p-4 h-auto border-orange-200 hover:bg-orange-50"
                      >
                        <Clock className="h-5 w-5 text-orange-500 mb-1" />
                        <span className="text-xs">Hard</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAnswer(true, 3)}
                        className="flex flex-col items-center p-4 h-auto border-blue-200 hover:bg-blue-50"
                      >
                        <Target className="h-5 w-5 text-blue-500 mb-1" />
                        <span className="text-xs">Good</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAnswer(true, 4)}
                        className="flex flex-col items-center p-4 h-auto border-green-200 hover:bg-green-50"
                      >
                        <CheckCircle className="h-5 w-5 text-green-500 mb-1" />
                        <span className="text-xs">Easy</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">{sessionStats.correct}</div>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">{sessionStats.incorrect}</div>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">{Math.round(progress)}%</div>
              <p className="text-sm text-muted-foreground">Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SpacedRepetitionReview
