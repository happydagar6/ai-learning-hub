'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Calendar, BookOpen, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'
import { StudyDocument, DocumentSelectorProps } from '@/types/document'

const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  selectedDocument,
  onDocumentSelect,
  className = ""
}) => {
  const [documents, setDocuments] = useState<StudyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
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
        
        // Auto-select the most recent document if none selected
        if (!selectedDocument && data.documents.length > 0) {
          onDocumentSelect(data.documents[0])
        }
      } else {
        setError(data.error || 'Failed to fetch documents')
      }
    } catch (err) {
      setError('Network error while fetching documents')
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDocument, onDocumentSelect])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      'Node.js Development': 'bg-green-100 text-green-800',
      'React Development': 'bg-blue-100 text-blue-800',
      'JavaScript Programming': 'bg-yellow-100 text-yellow-800',
      'Python Programming': 'bg-purple-100 text-purple-800',
      'Government & Legal': 'bg-red-100 text-red-800',
      'Human Resources': 'bg-pink-100 text-pink-800',
      'Database Management': 'bg-indigo-100 text-indigo-800',
      'General Studies': 'bg-gray-100 text-gray-800'
    }
    return colors[subject] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading your documents...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
          <Button 
            onClick={fetchDocuments} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <FileText className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No Documents Found</h3>
          <p className="text-yellow-700 text-sm mb-4">
            Upload some study materials first to use the AI Study Assistant
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard/upload'}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Upload Documents
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Select Study Material</span>
          <span className="text-sm text-gray-500">({documents.length} documents)</span>
        </div>
        <Button onClick={fetchDocuments} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 max-h-64 overflow-y-auto">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedDocument?.id === doc.id
                ? 'ring-2 ring-purple-500 bg-purple-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onDocumentSelect(doc)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <h4 className="font-medium text-gray-900 truncate">
                    {doc.originalName}
                  </h4>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                    {doc.fileType}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubjectColor(doc.subject)}`}>
                    {doc.subject}
                  </span>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(doc.uploadDate)}</span>
                  </div>
                </div>
                
                <p className="text-sm text-purple-600 mt-1 font-medium">
                  📚 Study Topic: {doc.topic}
                </p>
              </div>
              
              {selectedDocument?.id === doc.id && (
                <div className="ml-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedDocument && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-700">
            <strong>Selected:</strong> {selectedDocument.originalName}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            The AI assistant will provide help focused on: <strong>{selectedDocument.topic}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

export default DocumentSelector
