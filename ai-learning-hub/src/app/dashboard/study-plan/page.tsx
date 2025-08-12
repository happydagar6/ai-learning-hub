"use client"
import React from 'react'
import StudyPlanGenerator from '@/components/ui/study-plan-generator'
import { useUser } from '@clerk/nextjs'

const StudyPlanPage = () => {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="w-full p-6">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="w-full p-6">
        <div className="text-muted-foreground">Please sign in to access study plans.</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <StudyPlanGenerator userId={user.id} />
    </div>
  )
}

export default StudyPlanPage