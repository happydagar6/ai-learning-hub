"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Loader2, Plus, FolderOpen, X, Info, Upload, AlertCircle, File, FileType, Sheet, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
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
import { toast } from 'sonner'

interface FileUploadProps {
  userId: string
}

interface UploadStatus {
  status: "idle" | "uploading" | "processing" | "success" | "error"
  message: string
  filename?: string
  jobId?: string
  progress?: number
}

interface Course {
  id: number
  name: string
  created_at: string
}

interface Document {
  id: number
  name: string
  file_size: number
  file_type?: string
  processed: boolean
  created_at: string
  course_id: number
  documentId?: string // This serves as the job ID for processing
  courses?: {
    name: string
  }
}

interface FileUploadProps {
  userId: string
}

interface UploadStatus {
  status: "idle" | "uploading" | "processing" | "success" | "error"
  message: string
  filename?: string
  jobId?: string
  progress?: number
}

interface Course {
  id: number
  name: string
  created_at: string
}

interface Document {
  id: number
  name: string
  file_size: number
  file_type?: string
  processed: boolean
  created_at: string
  course_id: number
  courses?: {
    name: string
  }
}

const FileUpload: React.FC<FileUploadProps> = ({ userId }) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [selectedCourseName, setSelectedCourseName] = useState<string>("")
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [newCourseName, setNewCourseName] = useState<string>("")
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false)
  const [showNewCourse, setShowNewCourse] = useState<boolean>(false)
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const [message, setMessage] = useState<string>("")
  const [messageType, setMessageType] = useState<string>("info")
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "idle",
    message: "Ready to upload documents (PDF, TXT, DOC, DOCX, RTF, MD, CSV)",
  })

  // Track resumed jobs to avoid duplicate notifications
  const [resumedJobs, setResumedJobs] = useState<Set<string>>(new Set())
  const [activePollingIntervals, setActivePollingIntervals] = useState<Set<NodeJS.Timeout>>(new Set())

  // Helper function to get file type icon
  const getFileTypeIcon = (fileType?: string, fileName?: string) => {
    let extension = fileType?.toLowerCase()
    
    if (!extension && fileName && typeof fileName === 'string') {
      extension = fileName.split('.').pop()?.toLowerCase()
    }
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-destructive" />
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'txt':
      case 'md':
        return <File className="h-4 w-4 text-muted-foreground" />
      case 'csv':
        return <Sheet className="h-4 w-4 text-green-600" />
      default:
        return <File className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Helper function to get file type from filename
  const getFileTypeFromName = (filename: string | undefined | null) => {
    if (!filename || typeof filename !== 'string') {
      return 'unknown'
    }
    const extension = filename.split('.').pop()?.toLowerCase()
    return extension || 'unknown'
  }

  // Helper function to get file type badge color
  const getFileTypeBadgeColor = (fileType?: string, filename?: string) => {
    const type = fileType || getFileTypeFromName(filename || '')
    
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'bg-red-100 text-red-800'
      case 'doc':
      case 'docx':
        return 'bg-blue-100 text-blue-800'
      case 'txt':
      case 'md':
        return 'bg-muted text-muted-foreground'
      case 'csv':
        return 'bg-green-100 text-green-800'
      case 'rtf':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    fetchDocuments()
    if (selectedCourse) {
      const course = courses.find((c) => String(c.id) === String(selectedCourse))
      setSelectedCourseName(course ? course.name : "")
    }
  }, [selectedCourse, courses])

  // Check for processing documents on component mount and when documents change
  useEffect(() => {
    checkForProcessingDocuments()
  }, [documents])

  const checkForProcessingDocuments = async () => {
    // Find documents that might be processing (not processed and created recently)
    const potentialProcessingDocs = documents.filter(doc => 
      !doc.processed && 
      doc.documentId &&
      !resumedJobs.has(doc.documentId) && // Don't check already monitored jobs
      // Check if document was created within the last 30 minutes
      new Date().getTime() - new Date(doc.created_at || 0).getTime() < 30 * 60 * 1000
    )

    console.log(`🔍 Checking ${potentialProcessingDocs.length} potentially processing documents`)

    for (const doc of potentialProcessingDocs) {
      if (!doc.documentId) continue // Skip if no documentId
      
      try {
        const statusData = await checkProcessingStatus(doc.documentId)
        if (statusData && (statusData.status === 'processing' || statusData.status === 'queued')) {
          console.log(`📄 Resuming monitoring for document: ${doc.name} (Status: ${statusData.status})`)
          
          // Start monitoring this document
          startDocumentMonitoring(doc.documentId, doc.name)
          
          // Add a small delay between starting multiple monitors
          await new Promise(resolve => setTimeout(resolve, 500))
        } else if (statusData && statusData.status === 'completed') {
          console.log(`📄 Document ${doc.name} was completed while away, refreshing...`)
          // Just refresh the documents list, no need to monitor
          await fetchDocuments()
        }
      } catch (error) {
        console.warn(`⚠️ Could not check status for document ${doc.name}:`, error)
      }
    }
  }

  const startDocumentMonitoring = (jobId: string, filename: string) => {
    // Check if we're already monitoring this job
    if (resumedJobs.has(jobId)) {
      console.log(`📄 Already monitoring job ${jobId}, skipping`)
      return
    }

    // Add to resumed jobs set
    setResumedJobs(prev => new Set(prev).add(jobId))

    // Set upload status to show processing
    setUploadStatus({
      status: "uploading",
      message: `Resuming processing of ${filename}...`,
      filename: filename,
      progress: 50,
    })

    // Show notification that processing has resumed
    showMessage(`Resumed processing of ${filename}`, "info")

    // Start polling for this document
    let pollCount = 0
    const maxPolls = 90 // 3 minutes with 2-second intervals

    const pollInterval = setInterval(async () => {
      pollCount++
      console.log(`Polling resumed job ${jobId}... Attempt ${pollCount}`)

      const statusData = await checkProcessingStatus(jobId)

      if (statusData) {
        console.log("Resumed status update:", statusData)

        setUploadStatus((prev) => ({
          ...prev,
          progress: statusData.progress || 50,
          message: `Processing ${filename}... ${statusData.progress || 50}%`,
        }))

        if (statusData.status === "completed") {
          clearInterval(pollInterval)
          setActivePollingIntervals(prev => {
            const newSet = new Set(prev)
            newSet.delete(pollInterval)
            return newSet
          })
          
          setUploadStatus({
            status: "success",
            message: `${filename} is ready for chat!`,
            filename: filename,
            progress: 100,
          })
          showMessage(`🎉 ${filename} processing completed successfully!`, "success")

          // Refresh documents list to show updated status
          await fetchDocuments()
          
          // Remove from resumed jobs
          setResumedJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
        } else if (statusData.status === "failed") {
          clearInterval(pollInterval)
          setActivePollingIntervals(prev => {
            const newSet = new Set(prev)
            newSet.delete(pollInterval)
            return newSet
          })
          
          setUploadStatus({
            status: "error",
            message: `Processing failed for ${filename}: ${statusData.error || "Unknown error"}`,
            filename: filename,
          })
          showMessage(`❌ Processing failed for ${filename}. Please try again.`, "error")
          
          // Remove from resumed jobs
          setResumedJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
        }
      } else if (pollCount >= maxPolls) {
        console.log("Resumed polling timeout reached")
        clearInterval(pollInterval)
        setActivePollingIntervals(prev => {
          const newSet = new Set(prev)
          newSet.delete(pollInterval)
          return newSet
        })
        
        setUploadStatus({
          status: "error",
          message: `Processing timeout for ${filename}. Please check document status.`,
          filename: filename,
        })
        showMessage(`⏰ Processing timeout for ${filename}. Please check document status.`, "error")
        
        // Remove from resumed jobs
        setResumedJobs(prev => {
          const newSet = new Set(prev)
          newSet.delete(jobId)
          return newSet
        })
      }
    }, 3000) // Slightly longer interval for resumed monitoring

    // Store interval ID for cleanup
    setActivePollingIntervals(prev => new Set(prev).add(pollInterval))
    
    return pollInterval
  }

  // Cleanup function to clear all polling intervals
  const cleanupPolling = () => {
    activePollingIntervals.forEach(interval => clearInterval(interval))
    setActivePollingIntervals(new Set())
    setResumedJobs(new Set())
  }

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupPolling()
    }
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch courses')
      }

      setCourses(result.courses || [])
    } catch (error) {
      console.error("Error fetching courses:", error)
    }
  }

  const fetchDocuments = async () => {
    setLoadingDocs(true)
    try {
      let url = '/api/documents'
      if (selectedCourse) {
        url += `?courseId=${selectedCourse}`
        console.log('📋 Fetching documents for course:', selectedCourse)
      } else {
        console.log('📋 Fetching all documents')
      }

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()

      console.log('📄 Documents fetch result:', result)
      console.log('📄 Response status:', response.status)
      console.log('📄 Documents array:', result.documents)
      console.log('📄 Documents count:', result.documents?.length || 0)

      if (response.ok) {
        setDocuments(result.documents || [])
      } else {
        console.error("Error fetching documents:", result.error)
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoadingDocs(false)
    }
  }

  const showMessage = (msg: string, type = "info") => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  const createCourse = async () => {
    if (!newCourseName.trim()) return

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCourseName.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create course')
      }

      if (result.course) {
        setCourses([result.course, ...courses])
        setSelectedCourse(String(result.course.id))
        setNewCourseName("")
        setShowNewCourse(false)
        showMessage("Course created successfully!", "success")
      }
    } catch (error) {
      console.error("Error creating course:", error)
      showMessage(error instanceof Error ? error.message : "Unexpected error creating course.", "error")
    }
  }

  const deleteCourse = async (courseId: number, courseName: string) => {
    try {
      // Use the API route instead of direct Supabase calls
      const response = await fetch(`/api/courses?courseId=${courseId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error deleting course:", errorData)
        showMessage(`Failed to delete course: ${errorData.error}`, "error")
        return
      }

      // Update local state
      setCourses(courses.filter(course => course.id !== courseId))
      if (selectedCourse === String(courseId)) {
        setSelectedCourse("")
        setDocuments([])
      }
      
      showMessage(`Course "${courseName}" and all related data deleted successfully!`, "success")
      toast.success(`Course "${courseName}" deleted successfully!`)
    } catch (error) {
      console.error("Error deleting course:", error)
      showMessage("Unexpected error deleting course.", "error")
    }
  }

  const selectCourse = (courseId: string, courseName: string) => {
    setSelectedCourse(courseId)
    setSelectedCourseName(courseName)
    setDropdownOpen(false)
    fetchDocuments()
  }

  const handleDeleteDocument = (document: Document) => {
    setDocumentToDelete(document)
  }

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return

    setDeletingDocumentId(documentToDelete.id)
    
    try {
  // Direct browser fetch to backend API
  const response = await fetch(`${process.env.NEXT_PUBLIC_DOCUMENT_SERVER_URL}/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to delete document: ${errorData}`)
      }

      // Remove the document from the local state
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id))
      
      showMessage("Document deleted successfully!", "success")
    } catch (error) {
      console.error("Error deleting document:", error)
      showMessage(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`, "error")
    } finally {
      setDeletingDocumentId(null)
      setDocumentToDelete(null)
    }
  }

  const checkProcessingStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/status/${jobId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      if (response.ok) {
        const statusData = await response.json()
        console.log(`Status check for job ${jobId}:`, statusData)
        return statusData
      } else {
        console.warn(`Status check failed for job ${jobId}: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error checking status:", error)
    }
    return null
  }

  // Helper function to format file size
  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes || typeof bytes !== 'number' || isNaN(bytes)) {
      return '0.00'
    }
    return (bytes / 1024 / 1024).toFixed(2)
  }

  const handleFileUploadButtonClick = () => {
    const el = document.createElement("input")
    el.setAttribute("type", "file")
    el.setAttribute("accept", ".pdf,.txt,.doc,.docx,.rtf,.md,.csv,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/markdown,text/csv")
    el.addEventListener("change", async (ev) => {
      if (el.files && el.files.length > 0) {
        const file = el.files.item(0)

        if (file) {
          // Validate file type
          const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/rtf',
            'text/markdown',
            'text/csv'
          ];

          const allowedExtensions = ['pdf', 'txt', 'doc', 'docx', 'rtf', 'md', 'csv'];
          const fileExtension = file.name.split('.').pop()?.toLowerCase();

          if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
            setUploadStatus({
              status: "error",
              message: "Unsupported file type. Please upload PDF, TXT, DOC, DOCX, RTF, MD, or CSV files.",
              filename: file.name,
            });
            return;
          }

          setUploadStatus({
            status: "uploading",
            message: "Uploading document...",
            filename: file.name,
          })

          try {
            const formData = new FormData()
            formData.append("file", file)
            if (selectedCourse) {
              formData.append("course_id", selectedCourse)
            }

            const response = await fetch("/api/upload", {
              method: "POST",
              credentials: 'include',
              body: formData,
            })

            const result = await response.json()

            if (response.ok) {
              setUploadStatus({
                status: "processing",
                message: `Processing ${result.fileType?.toUpperCase() || 'document'} for chat...`,
                filename: file.name,
                jobId: result.jobId,
                progress: 0,
              })

              // Refresh documents list to show the new document
              await fetchDocuments()

              // Poll for processing status
              let pollCount = 0
              const maxPolls = 90 // 3 minutes with 2-second intervals (increased from 60)

              const pollInterval = setInterval(async () => {
                pollCount++
                console.log(`Polling for status... Attempt ${pollCount}`)

                const statusData = await checkProcessingStatus(result.jobId)

                if (statusData) {
                  console.log("Status update:", statusData)

                  setUploadStatus((prev) => ({
                    ...prev,
                    progress: statusData.progress || 0,
                    message: `Processing ${result.fileType?.toUpperCase() || 'document'}... ${statusData.progress || 0}%`,
                  }))

                  if (statusData.status === "completed") {
                    clearInterval(pollInterval)
                    setUploadStatus({
                      status: "success",
                      message: "Document ready for chat!",
                      filename: file.name,
                      progress: 100,
                    })
                    showMessage("Document processed successfully!", "success")

                    // Refresh documents list to show updated status
                    await fetchDocuments()
                  } else if (statusData.status === "failed") {
                    clearInterval(pollInterval)
                    setUploadStatus({
                      status: "error",
                      message: `Processing failed: ${statusData.error || "Unknown error"}`,
                      filename: file.name,
                    })
                    showMessage("Processing failed. Please try again.", "error")
                  }
                } else if (pollCount >= maxPolls) {
                  console.log("Polling timeout reached")
                  clearInterval(pollInterval)
                  setUploadStatus({
                    status: "error",
                    message: "Processing timeout. Please check document status.",
                    filename: file.name,
                  })
                  showMessage("Processing timeout. Please check document status.", "error")
                }
              }, 2000)
            } else {
              throw new Error(result.error || "Upload failed")
            }
          } catch (error) {
            console.error("Upload error:", error)
            setUploadStatus({
              status: "error",
              message: "Upload failed. Please try again.",
              filename: file.name,
            })
            showMessage("Upload failed. Please try again.", "error")
          }
        }
      }
    })
    el.click()
  }

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      case "success":
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case "error":
        return <AlertCircle className="h-8 w-8 text-red-500" />
      default:
        return <Upload className="h-8 w-8 text-slate-600" />
    }
  }

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case "uploading":
      case "processing":
        return "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/50"
      case "success":
        return "border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-950/50"
      case "error":
        return "border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-950/50"
      default:
        return "border-border bg-card hover:bg-accent/50"
    }
  }

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Course Materials</h1>
        <p className="text-muted-foreground mt-2">Manage your study materials and chat with your documents</p>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            Select Course
          </CardTitle>
          <CardDescription>Choose a course to organize your documents or create a new one</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Course Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full p-3 text-left bg-card border border-border rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className={selectedCourseName ? "text-foreground" : "text-muted-foreground"}>
                  {selectedCourseName || "Choose a course..."}
                </span>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                <button
                  onClick={() => {
                    setSelectedCourse("")
                    setSelectedCourseName("")
                    setDropdownOpen(false)
                    fetchDocuments() // Fetch all documents when "View All" is selected
                  }}
                  className="w-full p-3 text-left hover:bg-accent focus:bg-accent focus:outline-none border-b border-border transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">View All Documents</span>
                    {selectedCourse === "" && <CheckCircle className="w-4 h-4 text-blue-600" />}
                  </div>
                </button>

                {courses.length === 0 ? (
                  <div className="p-3 text-muted-foreground text-center">No courses found</div>
                ) : (
                  courses.map((course: Course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between p-3 hover:bg-accent border-b border-border last:border-b-0 transition-colors"
                    >
                      <button
                        onClick={() => selectCourse(String(course.id), course.name)}
                        className="flex-1 text-left focus:outline-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">{course.name}</span>
                          {selectedCourse === String(course.id) && <CheckCircle className="w-4 h-4 text-blue-600" />}
                        </div>
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="">
                          <AlertDialogHeader className="">
                            <AlertDialogTitle className="">Delete Course</AlertDialogTitle>
                            <AlertDialogDescription className="">
                              Are you sure you want to delete the course &quot;{course.name}&quot;?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <p className="text-sm text-muted-foreground mb-2">This will permanently delete:</p>
                            <ul className="ml-4 list-disc text-sm text-muted-foreground space-y-1">
                              <li>All documents in this course</li>
                              <li>All flashcards generated from these documents</li>
                              <li>All related study data</li>
                            </ul>
                            <p className="text-sm text-muted-foreground mt-3 font-medium">This action cannot be undone.</p>
                          </div>
                          <AlertDialogFooter className="">
                            <AlertDialogCancel className="">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCourse(course.id, course.name)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Course
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* New Course */}
          <div className="pt-2 border-t border-gray-200">
            {!showNewCourse ? (
              <Button
                onClick={() => setShowNewCourse(true)}
                variant="outline"
                className="w-full border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Course
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter course name"
                  value={newCourseName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCourseName(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && createCourse()}
                />
                <Button onClick={createCourse} disabled={!newCourseName.trim()}>
                  Create
                </Button>
                <Button
                  onClick={() => {
                    setShowNewCourse(false)
                    setNewCourseName("")
                  }}
                  variant="outline"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced File Upload */}
      <Card className={`transition-all duration-300 ${getStatusColor()}`}>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Documents
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Upload your documents (PDF, TXT, DOC, DOCX, RTF, MD, CSV) to {selectedCourseName ? `${selectedCourseName}` : "your document collection"} and
            start chatting with them
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            <div className="flex justify-center">{getStatusIcon()}</div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                {uploadStatus.status === "idle" ? "Upload Document" : "Processing Document"}
              </h3>
              <p className="text-sm text-foreground/80">{uploadStatus.message}</p>
              {uploadStatus.filename && (
                <div className="flex items-center justify-center space-x-2 text-xs text-foreground bg-accent/50 rounded-lg p-2">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-[200px] font-medium">{uploadStatus.filename}</span>
                </div>
              )}
              {uploadStatus.status === "processing" && uploadStatus.progress !== undefined && (
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${uploadStatus.progress}%` }}
                  ></div>
                </div>
              )}
            </div>

            <Button
              onClick={handleFileUploadButtonClick}
              disabled={uploadStatus.status === "uploading" || uploadStatus.status === "processing"}
              className="w-full h-12 text-base font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              variant={uploadStatus.status === "success" ? "outline" : "default"}
            >
              {uploadStatus.status === "success" ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Upload Another Document
                </>
              ) : uploadStatus.status === "uploading" || uploadStatus.status === "processing" ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {uploadStatus.status === "uploading" ? "Uploading..." : "Processing..."}
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Choose Document
                </>
              )}
            </Button>

            <div className="bg-accent/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <Info className="h-4 w-4 text-blue-600" />
                Upload Guidelines
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                  <span>Supports PDF, TXT, DOC, DOCX, RTF, MD, CSV files</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0"></span>
                  <span>Maximum file size: 10MB</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0"></span>
                  <span>Processing takes 30-60 seconds</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-2 h-2 bg-orange-600 rounded-full flex-shrink-0"></span>
                  <span>Your document is processed securely</span>
                </div>
              </div>
              {selectedCourseName && (
                <div className="text-center mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded border-l-4 border-blue-600">
                  <p className="font-medium text-blue-700 dark:text-blue-300 text-sm">
                    📁 Will be added to &quot;{selectedCourseName}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Alert */}
      {message && (
        <Alert
          className={`${
            messageType === "success"
              ? "border-green-200 bg-green-50"
              : messageType === "error"
                ? "border-red-200 bg-red-50"
                : "border-blue-200 bg-blue-50"
          }`}
          variant="default"
        >
          <div className="flex items-center gap-2">
            {messageType === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
            {messageType === "error" && <Info className="w-4 h-4 text-destructive" />}
            {messageType === "info" && <Info className="w-4 h-4 text-blue-600" />}
            <AlertDescription
              className={`${
                messageType === "success"
                  ? "text-green-800"
                  : messageType === "error"
                    ? "text-red-800"
                    : "text-blue-800"
              }`}
            >
              {message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Documents</CardTitle>
              <CardDescription>
                {selectedCourse ? `Documents for ${selectedCourseName}` : "All uploaded materials"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={loadingDocs}>
              {loadingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="font-medium">No documents found</p>
              <p className="text-sm">
                {selectedCourse ? `Upload a document to ${selectedCourseName}` : "Upload a document to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: Document, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getFileTypeIcon(doc.file_type, doc.name)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{doc.name || 'Unnamed Document'}</h4>
                        <Badge className={`text-xs px-2 py-0.5 ${getFileTypeBadgeColor(doc.file_type, doc.name)}`}>
                          {(doc.file_type || getFileTypeFromName(doc.name) || 'unknown').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {doc.courses?.name || "No Course"} • {formatFileSize(doc.file_size)} MB •{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.processed ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready for Chat
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                        {doc.documentId && resumedJobs.has(doc.documentId) && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Monitoring
                          </Badge>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deletingDocumentId === doc.id}
                      className="ml-2 p-2 h-8 w-8"
                      title="Delete document"
                    >
                      {deletingDocumentId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent className="">
          <AlertDialogHeader className="">
            <AlertDialogTitle className="">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="">
              Are you sure you want to delete &quot;{documentToDelete?.name}&quot;? This action cannot be undone and will remove the document from your database and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="">
            <AlertDialogCancel className="" onClick={() => setDocumentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={confirmDeleteDocument}
              disabled={!!deletingDocumentId}
            >
              {deletingDocumentId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Document'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default FileUpload
