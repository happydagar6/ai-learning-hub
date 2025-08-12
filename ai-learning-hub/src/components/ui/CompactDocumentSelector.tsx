'use client'

import React, { useState, useEffect } from 'react'
import { FileText, RefreshCw, ChevronDown } from 'lucide-react'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Badge } from './badge'
import { StudyDocument, DocumentSelectorProps } from '@/types/document'

const CompactDocumentSelector: React.FC<DocumentSelectorProps> = ({
  selectedDocument,
  onDocumentSelect,
  className = ""
}) => {
  const [documents, setDocuments] = useState<StudyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch documents for the authenticated user
      const response = await fetch('/api/documents', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setDocuments(data.documents)
        
        // Don't auto-select documents in compact mode to let users choose
      } else {
        setError(data.error || 'Failed to fetch documents')
      }
    } catch (err) {
      setError('Network error while fetching documents')
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: '2-digit',
      month: 'short',
      day: 'numeric'
    })
  }

  const getSubjectColor = (subject: string) => {
    const colors = {
      'Computer Science': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Mathematics': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Physics': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'Chemistry': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'Biology': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
      'History': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      'Literature': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'Economics': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    }
    return colors[subject as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }

  const handleDocumentChange = (documentId: string) => {
    if (documentId === "none") {
      onDocumentSelect(null)
    } else {
      const document = documents.find(doc => doc.id === documentId)
      if (document) {
        onDocumentSelect(document)
      }
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-card border rounded-lg ${className}`}>
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading documents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg ${className}`}>
        <span className="text-sm text-destructive">{error}</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchDocuments}
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-muted/50 border border-dashed rounded-lg ${className}`}>
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No documents uploaded yet</span>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Select 
        value={selectedDocument?.id || "none"} 
        onValueChange={handleDocumentChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a document to chat with">
            {selectedDocument ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{selectedDocument.originalName}</span>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {selectedDocument.subject}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>All documents</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="none" className="font-medium">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-dashed border-muted-foreground/50 rounded"></div>
              <span>Search all documents</span>
            </div>
          </SelectItem>
          
          {documents.map((doc) => (
            <SelectItem key={doc.id} value={doc.id} className="">
              <div className="flex items-start gap-2 py-1 w-full">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{doc.originalName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSubjectColor(doc.subject)}`}>
                      {doc.subject}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doc.uploadDate)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    📚 Topic: {doc.topic}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Document count indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{documents.length} document{documents.length !== 1 ? 's' : ''} available</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchDocuments}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>
    </div>
  )
}

export default CompactDocumentSelector
