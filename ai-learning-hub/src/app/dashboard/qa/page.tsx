"use client"
import React, { useState } from 'react'
import QAInterface from '@/components/ui/qa-interface'
import CompactDocumentSelector from '@/components/ui/CompactDocumentSelector'
import { Button } from '@/components/ui/button'
import { StudyDocument } from '@/types/document'
import { useUser } from '@clerk/nextjs'

const QAPage = () => {
  const [selectedDocument, setSelectedDocument] = useState<StudyDocument | null>(null);
  const { user, isLoaded } = useUser()

  const handleDocumentSelect = (document: StudyDocument | null) => {
    setSelectedDocument(document);
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Please sign in to access Q&A.</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Ask Questions About Your Materials</h2>
        <p className="text-muted-foreground">
          Get instant answers to your questions about your uploaded study materials using AI with document citations.
        </p>
      </div>
      
      {/* Document Selector */}
      <div className="flex-shrink-0">
        <CompactDocumentSelector 
          selectedDocument={selectedDocument} 
          onDocumentSelect={handleDocumentSelect}
        />
      </div>
      
      <div className="flex-1 min-h-0 h-[calc(100vh-16rem)]">
        <QAInterface 
          userId={user.id} 
          selectedDocument={selectedDocument}
        />
      </div>
    </div>
  )
}

export default QAPage