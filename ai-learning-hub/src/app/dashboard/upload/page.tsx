"use client"
import React from 'react'
import FileUpload from '@/components/ui/file-upload'
import { useUser } from '@clerk/nextjs'

const UploadPage = () => {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-lg shadow-md p-6">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-lg shadow-md p-6">
          <div className="text-muted-foreground">Please sign in to upload documents.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Upload Your Study Materials</h2>
        <p className="text-muted-foreground mb-6">
          Upload your documents to process them with AI and make them available for Q&A, and flashcards.
        </p>
        
        <FileUpload userId={user.id} />
      </div>
    </div>
  )
}

export default UploadPage