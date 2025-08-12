"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff, Shuffle, Trash2 } from "lucide-react"
import type { Flashcard } from "@/lib/flashcard-store"
import ContentRenderer from "./ContentRenderer"
import { useFlashcardStore } from "@/lib/flashcard-store"
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface FlashcardViewerProps {
  flashcards: Flashcard[]
  hideControls?: boolean // New prop to hide shuffle and delete buttons
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ flashcards, hideControls = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const removeFlashcard = useFlashcardStore((state) => state.removeFlashcard)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (!flashcards || flashcards.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No flashcards available</div>
  }

  const currentCard = flashcards[currentIndex]

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
    setIsFlipped(false)
  }

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setIsFlipped(false)
  }

  const shuffleCards = () => {
    // This shuffle logic only resets index, not actual card order.
    // For true shuffle, you'd need to reorder the flashcards array.
    // For now, it just resets to the first card.
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  // Flip card on click (except navigation area)
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent flip if clicking on a button inside the card
    if ((e.target as HTMLElement).closest("button")) return
    setIsFlipped((f) => !f)
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }
  const confirmDelete = () => {
    removeFlashcard(currentCard.id)
    toast.success('Flashcard deleted!')
    setShowDeleteDialog(false)
    // Adjust index after deletion
    if (flashcards.length === 1) {
      setCurrentIndex(0)
    } else if (currentIndex === flashcards.length - 1) {
      setCurrentIndex((prev) => prev - 1)
    }
    setIsFlipped(false)
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto min-h-[320px] p-2 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      {/* Compact Header */}
      <div className="flex items-center justify-between w-full mb-2 px-3 py-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-white/20 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="outline" className="text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none px-2 py-0.5 shadow-sm">
            {currentIndex + 1}/{flashcards.length}
          </Badge>
          <Badge variant="secondary" className="text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-600 text-white border-none px-2 py-0.5 shadow-sm">
            {currentCard.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none px-2 py-0.5 shadow-sm">
            {currentCard.question_type.replace("_", " ")}
          </Badge>
        </div>
        {!hideControls && (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={shuffleCards} 
              title="Shuffle cards"
              className="hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-110 transition-all duration-200 text-blue-600 dark:text-blue-400"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDelete} 
                  title="Delete flashcard"
                  className="hover:bg-red-100 dark:hover:bg-red-900/30 hover:scale-110 transition-all duration-200 text-red-500 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-red-200 dark:border-red-800">
                <AlertDialogHeader className="">
                  <AlertDialogTitle className="text-red-700 dark:text-red-300">Delete Flashcard?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
                    Are you sure you want to delete this flashcard? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="">
                  <AlertDialogCancel 
                    onClick={() => setShowDeleteDialog(false)} 
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={confirmDelete} 
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
      {/* Ultra Compact 3D Flip Card */}
      <div
        className="relative w-full mx-auto h-[200px] sm:h-[220px] md:h-[240px] cursor-pointer group [perspective:1200px]"
        onClick={handleCardClick}
        tabIndex={0}
        aria-label={isFlipped ? "Show Question" : "Show Answer"}
      >
        <div
          className={`relative w-full h-full transition-all duration-700 ease-in-out [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          } group-hover:scale-[1.02] group-focus:scale-[1.02]`}
        >
          {/* Front (Question) - Ultra Compact */}
          <div className="absolute inset-0 w-full h-full flex flex-col bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 group-hover:shadow-xl transition-all duration-300 [backface-visibility:hidden] overflow-hidden">
            {/* Minimal Question Header */}
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300 p-1.5 bg-gradient-to-r from-blue-100 to-indigo-200 dark:from-blue-900/50 dark:to-indigo-900/50 border-b border-blue-200 dark:border-blue-700">
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              <span className="uppercase tracking-wide">Question</span>
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
            </div>
            
            {/* Compact Question Content */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-600 scrollbar-track-transparent">
              <div className="h-full flex flex-col justify-center">
                <div className="prose prose-sm max-w-none text-center text-gray-800 dark:text-gray-200 leading-snug">
                  <ContentRenderer content={currentCard.question} />
                </div>
              </div>
            </div>
            
            {/* Ultra Compact Multiple Choice */}
            {currentCard.question_type === "multiple_choice" && currentCard.options && (
              <div className="px-3 pb-2">
                <div className="space-y-1 max-h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-600 scrollbar-track-transparent">
                  {currentCard.options.map((option, index) => (
                    <div 
                      key={index} 
                      className="group/option p-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">{option}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Minimal Footer */}
            <div className="flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 p-1.5 bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-t border-blue-200 dark:border-blue-700">
              <Eye className="h-3 w-3" />
              <span className="font-medium">Click for answer</span>
            </div>
          </div>
          
          {/* Back (Answer) - Ultra Compact */}
          <div className="absolute inset-0 w-full h-full flex flex-col bg-gradient-to-br from-emerald-50 via-green-100 to-teal-200 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 rounded-lg shadow-lg border border-emerald-200 dark:border-emerald-800 group-hover:shadow-xl transition-all duration-300 [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
            {/* Minimal Answer Header */}
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 p-1.5 bg-gradient-to-r from-emerald-100 to-teal-200 dark:from-emerald-900/50 dark:to-teal-900/50 border-b border-emerald-200 dark:border-emerald-700">
              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
              <span className="uppercase tracking-wide">Answer</span>
              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
            </div>
            
            {/* Compact Answer Content */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 dark:scrollbar-thumb-emerald-600 scrollbar-track-transparent">
              <div className="h-full flex flex-col justify-center">
                <div className="prose prose-sm max-w-none text-center text-gray-800 dark:text-gray-200 leading-snug">
                  <ContentRenderer content={currentCard.answer} />
                </div>
              </div>
            </div>
            
            {/* Ultra Compact Tags */}
            {currentCard.tags && currentCard.tags.length > 0 && (
              <div className="px-3 pb-2">
                <div className="flex flex-wrap gap-1 justify-center max-h-12 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 dark:scrollbar-thumb-emerald-600 scrollbar-track-transparent">
                  {currentCard.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all duration-200 shadow-sm px-1.5 py-0.5"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Minimal Footer */}
            <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 p-1.5 bg-gradient-to-r from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border-t border-emerald-200 dark:border-emerald-700">
              <RotateCcw className="h-3 w-3" />
              <span className="font-medium">Click for question</span>
            </div>
          </div>
        </div>
      </div>
      {/* Ultra Compact Navigation */}
      <div className="flex items-center justify-center w-full mt-2 gap-2">
        <Button
          variant="outline"
          onClick={prevCard}
          disabled={flashcards.length <= 1}
          className="group flex-1 max-w-[80px] h-7 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-none shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
        >
          <ChevronLeft className="h-3 w-3 mr-1 group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span className="font-medium text-xs">Prev</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => setIsFlipped((f) => !f)}
          className="group flex-1 max-w-[90px] h-7 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:border-purple-500 dark:hover:border-purple-400 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
        >
          <RotateCcw className="h-3 w-3 mr-1 group-hover:rotate-180 transition-transform duration-500" />
          <span className="font-medium text-xs">
            {isFlipped ? "Q" : "A"}
          </span>
        </Button>
        
        <Button
          variant="outline"
          onClick={nextCard}
          disabled={flashcards.length <= 1}
          className="group flex-1 max-w-[80px] h-7 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-none shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
        >
          <span className="font-medium text-xs">Next</span>
          <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform duration-200" />
        </Button>
      </div>
    </div>
  )
}

export default FlashcardViewer
