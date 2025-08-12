"use client"
import React from 'react'
import { useUser } from '@clerk/nextjs'
import FlashcardGenerator from '@/components/ui/flashcard-generator'

const FlashcardsPage = () => {
  const { user } = useUser()

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card border border-border rounded-lg shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 animate-in fade-in-50 duration-500">Generate and Study Flashcards</h2>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
            Create interactive flashcards from your study materials to enhance your learning experience.
          </p>
          <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-1000">
            <FlashcardGenerator userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlashcardsPage