import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

export interface Flashcard {
  id: number
  document_id: number
  question: string
  answer: string
  difficulty: "easy" | "medium" | "hard"
  question_type: "open" | "multiple_choice" | "fill_blank"
  options?: string[]
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface FlashcardReview {
  id: number
  flashcard_id: number
  user_id: string
  is_correct: boolean
  response_time_ms?: number
  difficulty_rating: number
  next_review_date: string
  interval_days: number
  ease_factor: number
  repetition_count: number
  created_at: string
}

export interface FlashcardSet {
  id: number
  name: string
  description?: string
  document_id: number
  user_id: string
  settings: Record<string, any>
  flashcards?: Flashcard[]
  created_at: string
  updated_at: string
}

export interface GenerationSettings {
  count: number
  difficulty: "easy" | "medium" | "hard" | "mixed"
  questionTypes: ("open" | "multiple_choice" | "fill_blank")[]
  focusAreas: string[]
}

interface FlashcardState {
  // Data
  flashcards: Flashcard[]
  flashcardSets: FlashcardSet[]
  reviews: FlashcardReview[]
  currentSet: FlashcardSet | null
  currentCard: Flashcard | null

  // UI State
  isGenerating: boolean
  isReviewing: boolean
  showAnswer: boolean
  generationProgress: number

  // Settings
  generationSettings: GenerationSettings

  // Actions
  setFlashcards: (flashcards: Flashcard[]) => void
  addFlashcard: (flashcard: Flashcard) => void
  removeFlashcard: (id: number) => void
  updateFlashcard: (id: number, updates: Partial<Flashcard>) => void

  setFlashcardSets: (sets: FlashcardSet[]) => void
  addFlashcardSet: (set: FlashcardSet) => void
  removeFlashcardSet: (id: number) => void
  setCurrentSet: (set: FlashcardSet | null) => void

  setCurrentCard: (card: Flashcard | null) => void
  setShowAnswer: (show: boolean) => void

  setIsGenerating: (generating: boolean) => void
  setGenerationProgress: (progress: number | ((prev: number) => number)) => void
  setGenerationSettings: (settings: Partial<GenerationSettings>) => void

  addReview: (review: FlashcardReview) => void

  // Spaced Repetition
  getCardsForReview: (userId: string) => Flashcard[]
  calculateNextReview: (flashcard: Flashcard, isCorrect: boolean, difficulty: number) => Date

  // Export
  exportFlashcards: (format: "csv" | "json" | "anki") => string

  // Reset
  reset: () => void
}

const initialGenerationSettings: GenerationSettings = {
  count: 15,
  difficulty: "mixed",
  questionTypes: ["open", "multiple_choice"],
  focusAreas: [],
}

export const useFlashcardStore = create<FlashcardState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        flashcards: [],
        flashcardSets: [],
        reviews: [],
        currentSet: null,
        currentCard: null,
        isGenerating: false,
        isReviewing: false,
        showAnswer: false,
        generationProgress: 0,
        generationSettings: initialGenerationSettings,

        // Actions
        setFlashcards: (flashcards) => set({ flashcards }),

        addFlashcard: (flashcard) =>
          set((state) => ({
            flashcards: [...state.flashcards, flashcard],
          })),

        removeFlashcard: (id) =>
          set((state) => ({
            flashcards: state.flashcards.filter((card) => card.id !== id),
          })),

        updateFlashcard: (id, updates) =>
          set((state) => ({
            flashcards: state.flashcards.map((card) => (card.id === id ? { ...card, ...updates } : card)),
          })),

        setFlashcardSets: (sets) => set({ flashcardSets: sets }),

        addFlashcardSet: (set_) =>
          set((state) => ({
            flashcardSets: [...state.flashcardSets, set_],
          })),

        removeFlashcardSet: (id) =>
          set((state) => ({
            flashcardSets: state.flashcardSets.filter((set_) => set_.id !== id),
          })),

        setCurrentSet: (set_) => set({ currentSet: set_ }),
        setCurrentCard: (card) => set({ currentCard: card }),
        setShowAnswer: (show) => set({ showAnswer: show }),

        setIsGenerating: (generating) => set({ isGenerating: generating }),
        setGenerationProgress: (progressOrUpdater) =>
          set((state) => ({
            generationProgress:
              typeof progressOrUpdater === "function"
                ? (progressOrUpdater as (prev: number) => number)(state.generationProgress)
                : progressOrUpdater,
          })),

        setGenerationSettings: (settings) =>
          set((state) => ({
            generationSettings: { ...state.generationSettings, ...settings },
          })),

        addReview: (review) =>
          set((state) => ({
            reviews: [...state.reviews, review],
          })),

        // Spaced Repetition Algorithm (SM-2)
        getCardsForReview: (userId) => {
          const state = get()
          const now = new Date()

          return state.flashcards.filter((card) => {
            const lastReview = state.reviews
              .filter((r) => r.flashcard_id === card.id && r.user_id === userId)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

            if (!lastReview) return true // New cards

            return new Date(lastReview.next_review_date) <= now
          })
        },

        calculateNextReview: (flashcard, isCorrect, difficulty) => {
          const state = get()
          const lastReview = state.reviews
            .filter((r) => r.flashcard_id === flashcard.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

          let interval = 1
          let easeFactor = 2.5
          let repetitionCount = 0

          if (lastReview) {
            interval = lastReview.interval_days
            easeFactor = lastReview.ease_factor
            repetitionCount = lastReview.repetition_count
          }

          if (isCorrect) {
            if (repetitionCount === 0) {
              interval = 1
            } else if (repetitionCount === 1) {
              interval = 6
            } else {
              interval = Math.round(interval * easeFactor)
            }
            repetitionCount++
          } else {
            repetitionCount = 0
            interval = 1
          }

          // Adjust ease factor based on difficulty rating
          easeFactor = easeFactor + (0.1 - (5 - difficulty) * (0.08 + (5 - difficulty) * 0.02))
          easeFactor = Math.max(1.3, easeFactor)

          const nextReview = new Date()
          nextReview.setDate(nextReview.getDate() + interval)

          return nextReview
        },

        exportFlashcards: (format) => {
          const state = get()
          const cards = state.currentSet?.flashcards || state.flashcards

          switch (format) {
            case "csv":
              const csvHeader = "Question,Answer,Difficulty,Type\n"
              const csvRows = cards
                .map((card) => `"${card.question}","${card.answer}","${card.difficulty}","${card.question_type}"`)
                .join("\n")
              return csvHeader + csvRows

            case "json":
              return JSON.stringify(cards, null, 2)

            case "anki":
              return cards.map((card) => `${card.question}\t${card.answer}`).join("\n")

            default:
              return JSON.stringify(cards, null, 2)
          }
        },

        reset: () =>
          set({
            flashcards: [],
            flashcardSets: [],
            reviews: [],
            currentSet: null,
            currentCard: null,
            isGenerating: false,
            isReviewing: false,
            showAnswer: false,
            generationProgress: 0,
            generationSettings: initialGenerationSettings,
          }),
      }),
      {
        name: "flashcard-store",
        partialize: (state) => ({
          flashcards: state.flashcards,
          flashcardSets: state.flashcardSets,
          reviews: state.reviews,
          generationSettings: state.generationSettings,
        }),
      },
    ),
  ),
)
