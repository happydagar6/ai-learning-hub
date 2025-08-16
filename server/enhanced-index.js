import dotenv from "dotenv"
dotenv.config() // Load .env file
dotenv.config({ path: ".env.local" }) // Try to load .env.local if it exists

import express from "express"
import cors from "cors"
import multer from "multer"
import { Queue } from "bullmq"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import OptimizedChatService from './optimized-chat-service.js'
import PerformanceMonitor from './performance-monitor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Validate environment variables at startup
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE_KEY'
]

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} environment variable is not set!`)
    process.exit(1)
  }
})

console.log("✅ All environment variables validated successfully")

// Initialize services
const app = express()
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
const PORT = process.env.PORT || 8000

// Initialize optimized services
const chatService = new OptimizedChatService()
const performanceMonitor = new PerformanceMonitor()

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, /\.vercel\.app$/] 
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}))
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Initialize Supabase client with service role key for server operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Redis Queue setup - Updated for free hosting
const queue = new Queue("file-upload-queue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 5,
    removeOnFail: 3,
    timeout: 180 * 1000, // 3 minutes for complex processing
  },
})

// Enhanced file upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "uploads")
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now()
    const randomNum = Math.floor(Math.random() * 1000000000)
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    const sanitized = originalName.replace(/[^a-zA-Z0-9.\-_\s]/g, '')
    cb(null, `${timestamp}-${randomNum}-${sanitized}`)
  },
})

// Enhanced file filter with comprehensive validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/rtf',
    'text/markdown',
    'text/csv'
  ]
  
  const allowedExtensions = ['.pdf', '.txt', '.docx', '.doc', '.rtf', '.md', '.csv']
  const fileExtension = path.extname(file.originalname).toLowerCase()
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedExtensions.join(', ')}`), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 1,
  },
  fileFilter: fileFilter,
})

// Performance tracking middleware
app.use((req, res, next) => {
  req.startTime = Date.now()
  
  res.on('finish', () => {
    const responseTime = Date.now() - req.startTime
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      performanceMonitor.trackSuccess(responseTime)
    } else {
      performanceMonitor.trackFailure()
    }
  })
  
  next()
})

// Job status storage for progress tracking
const jobStatuses = new Map()

// Enhanced file upload endpoint with optimization
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      performanceMonitor.trackError(new Error("No file provided"), { endpoint: '/upload' })
      return res.status(400).json({ error: "No file provided" })
    }

    console.log(`📁 Processing upload: ${req.file.originalname} (${req.file.size} bytes)`)

    // Enhanced file validation
    const fileExtension = path.extname(req.file.originalname).toLowerCase()
    const supportedTypes = {
      '.pdf': 'pdf',
      '.txt': 'txt', 
      '.docx': 'docx',
      '.doc': 'doc',
      '.rtf': 'rtf',
      '.md': 'md',
      '.csv': 'csv'
    }

    const fileType = supportedTypes[fileExtension]
    if (!fileType) {
      performanceMonitor.trackError(new Error(`Unsupported file type: ${fileExtension}`), { endpoint: '/upload' })
      return res.status(400).json({ 
        error: `Unsupported file type: ${fileExtension}`,
        supportedTypes: Object.keys(supportedTypes)
      })
    }

    // Generate unique identifiers
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store document metadata in Supabase
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        documentId: documentId,
        name: req.file.originalname,              // Use 'name' instead of 'filename'
        file_size: req.file.size,                 // Keep 'file_size'
        file_type: fileType,                      // Keep 'file_type'
        processed: false,
        created_at: new Date().toISOString(),     // Use 'created_at' instead of 'upload_time'
      })
      .select()

    if (docError) {
      console.error("Supabase insert error:", docError)
      performanceMonitor.trackError(docError, { endpoint: '/upload', documentId })
      return res.status(500).json({ 
        error: "Failed to store document metadata",
        details: docError.message 
      })
    }

    // Initialize job status with enhanced tracking
    jobStatuses.set(jobId, {
      id: jobId,
      documentId: documentId,
      filename: req.file.originalname,
      fileType: fileType,
      status: "queued",
      progress: 0,
      startTime: Date.now(),
      fileSize: req.file.size,
      error: null,
      metrics: {
        queuedAt: new Date().toISOString(),
        estimatedDuration: null,
        cacheUtilization: 0
      }
    })

    // Enhanced job data for the worker
    const jobData = JSON.stringify({
      path: req.file.path,
      filename: req.file.originalname,
      jobId: jobId,
      documentId: documentId,
      fileType: fileType,
      fileSize: req.file.size,
      uploadTime: new Date().toISOString()
    })

    // Add job to queue with priority based on file size
    const priority = req.file.size < 1024 * 1024 ? 10 : 5 // Smaller files get higher priority
    await queue.add("process-document", jobData, { 
      priority,
      delay: 0,
      removeOnComplete: 5,
      removeOnFail: 3
    })

    console.log(`✅ Upload successful: ${req.file.originalname} (Job: ${jobId})`)

    res.status(200).json({
      message: "File uploaded successfully and queued for processing",
      jobId: jobId,
      documentId: documentId,
      filename: req.file.originalname,
      fileType: fileType,
      fileSize: req.file.size,
      estimatedProcessingTime: this.estimateProcessingTime(req.file.size, fileType),
      status: "queued"
    })

  } catch (error) {
    console.error("Upload endpoint error:", error)
    performanceMonitor.trackError(error, { endpoint: '/upload' })
    res.status(500).json({
      error: "Upload failed",
      details: error.message,
    })
  }
})

// Alternative upload endpoint for /upload/document compatibility
app.post("/upload/document", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      performanceMonitor.trackError(new Error("No file provided"), { endpoint: '/upload/document' })
      return res.status(400).json({ error: "No file provided" })
    }

    console.log(`📁 Processing document upload: ${req.file.originalname} (${req.file.size} bytes)`)

    // Enhanced file validation
    const fileExtension = path.extname(req.file.originalname).toLowerCase()
    const supportedTypes = {
      '.pdf': 'pdf',
      '.txt': 'txt', 
      '.docx': 'docx',
      '.doc': 'doc',
      '.rtf': 'rtf',
      '.md': 'md',
      '.csv': 'csv'
    }

    const fileType = supportedTypes[fileExtension]
    if (!fileType) {
      performanceMonitor.trackError(new Error(`Unsupported file type: ${fileExtension}`), { endpoint: '/upload/document' })
      return res.status(400).json({ 
        error: `Unsupported file type: ${fileExtension}`,
        supportedTypes: Object.keys(supportedTypes)
      })
    }

    // Generate unique document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`🆔 Generated IDs - Document: ${documentId}, Job: ${jobId}`)

    // Store document metadata in Supabase with enhanced error handling
    try {
      console.log('📝 Attempting to store document metadata in Supabase...')
      console.log('📊 Document data:', {
        documentId: documentId,
        name: req.file.originalname,      // Use 'name' instead of 'filename'
        file_type: fileType,              // Use 'file_type' instead of 'fileType'
        file_size: req.file.size,         // Use 'file_size' instead of 'fileSize'
        course_id: req.body.course_id || null,
      })

      const { data, error: docError } = await supabase
        .from("documents")
        .insert([
          {
            documentId: documentId,
            name: req.file.originalname,  // Use 'name' instead of 'filename'
            file_type: fileType,          // Use 'file_type' instead of 'fileType'
            file_size: req.file.size,     // Use 'file_size' instead of 'fileSize'
            created_at: new Date().toISOString(),  // Use 'created_at' instead of 'uploadedAt'
            processed: false,
            course_id: req.body.course_id || null,
          },
        ])
        .select()

      if (docError) {
        console.error("❌ Supabase insert error:", docError)
        console.error("❌ Error details:", JSON.stringify(docError, null, 2))
        performanceMonitor.trackError(docError, { endpoint: '/upload/document', documentId })
        return res.status(500).json({ 
          error: "Failed to store document metadata",
          details: docError.message,
          code: docError.code,
          hint: docError.hint
        })
      }

      console.log(`✅ Document metadata stored in Supabase:`, data)
    } catch (dbError) {
      console.error("Database error:", dbError)
      return res.status(500).json({ 
        error: "Database connection failed",
        details: dbError.message 
      })
    }

    // Initialize job status tracking
    jobStatuses.set(jobId, {
      jobId: jobId,
      documentId: documentId,
      status: "queued",
      progress: 0,
      filename: req.file.originalname,
      fileType: fileType,
      startTime: Date.now(),  // Use timestamp instead of ISO string
      lastUpdate: new Date().toISOString(),
      error: null,
      metrics: {
        queueTime: 0,
        processingTime: 0,
        chunks: 0,
        embeddings: 0
      }
    })

    console.log(`📊 Job status initialized for ${jobId}`)

    // Enhanced job data for the worker
    const jobData = JSON.stringify({
      path: req.file.path,
      filename: req.file.originalname,
      jobId: jobId,
      documentId: documentId,
      fileType: fileType,
      fileSize: req.file.size,
      uploadTime: new Date().toISOString(),
      course_id: req.body.course_id || null,
    })

    // Add job to processing queue with enhanced options
    await queue.add("process-document", jobData, {
      priority: 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 10,
      removeOnFail: 3
    })

    console.log(`✅ Document upload successful: ${req.file.originalname} (Job: ${jobId})`)

    res.status(200).json({
      message: "Document uploaded successfully and queued for processing",
      jobId: jobId,
      documentId: documentId,
      filename: req.file.originalname,
      fileType: fileType,
      fileSize: req.file.size,
      estimatedProcessingTime: estimateProcessingTime(req.file.size, fileType),
      status: "queued"
    })

  } catch (error) {
    console.error("Upload/document endpoint error:", error)
    performanceMonitor.trackError(error, { endpoint: '/upload/document' })
    res.status(500).json({
      error: "Document upload failed",
      details: error.message,
    })
  }
})

// Estimate processing time based on file characteristics
function estimateProcessingTime(fileSize, fileType) {
  const baseTimes = {
    'pdf': 30, // seconds per MB
    'docx': 20,
    'doc': 25,
    'txt': 10,
    'md': 10,
    'csv': 15,
    'rtf': 20
  }
  
  const baseTime = baseTimes[fileType] || 25
  const fileSizeMB = fileSize / (1024 * 1024)
  const estimatedSeconds = Math.max(30, baseTime * fileSizeMB)
  
  return `${Math.round(estimatedSeconds)}s`
}

// Process existing document endpoint (for documents uploaded via Next.js API)
app.post("/process-existing", async (req, res) => {
  try {
    const { documentId, fileName, userId, storagePath, fileType } = req.body

    if (!documentId || !fileName || !userId) {
      return res.status(400).json({ 
        error: "Missing required fields: documentId, fileName, userId" 
      })
    }

    console.log(`🔄 Processing existing document: ${fileName} (ID: ${documentId})`)

    // Generate a job ID for tracking
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store job status
    jobStatuses.set(jobId, {
      status: "processing",
      progress: 0,
      filename: fileName,
      fileType: fileType,
      documentId: documentId,
      startTime: Date.now()
    })

    // Download file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath)

    if (downloadError) {
      console.error('Error downloading file from storage:', downloadError)
      jobStatuses.set(jobId, { ...jobStatuses.get(jobId), status: "error", error: downloadError.message })
      return res.status(500).json({ 
        error: "Failed to download file from storage",
        details: downloadError.message 
      })
    }

    // Convert blob to buffer and save temporarily for processing
    const fileBuffer = Buffer.from(await fileData.arrayBuffer())
    const tempFilePath = path.join(__dirname, 'uploads', `temp_${documentId}_${fileName}`)
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    
    // Write file to temporary location
    fs.writeFileSync(tempFilePath, fileBuffer)

    // Enhanced job data for the worker
    const jobData = {
      filename: fileName,
      originalName: fileName,
      path: tempFilePath,
      size: fileBuffer.length,
      mimetype: getMimeType(fileType),
      documentId: documentId,
      userId: userId,
      jobId: jobId, // Add the jobId to the data
      uploadTime: new Date().toISOString(),
      fileType: fileType,
      metadata: {
        source: 'nextjs-api',
        processingMethod: 'existing-document'
      }
    }

    // Add job to processing queue
    await queue.add("process-document", jobData, { 
      jobId: jobId,
      attempts: 3,
      backoff: {
        type: "exponential", 
        delay: 3000
      },
      removeOnComplete: 5,
      removeOnFail: 3
    })

    console.log(`✅ Document ${fileName} queued for processing with job ID: ${jobId}`)

    res.json({
      success: true,
      jobId: jobId,
      message: "Document processing started",
      estimatedTime: estimateProcessingTime(fileBuffer.length, fileType)
    })

  } catch (error) {
    console.error("Process-existing endpoint error:", error)
    res.status(500).json({
      error: "Document processing failed",
      details: error.message,
    })
  }
})

// Helper function to get MIME type from file type
function getMimeType(fileType) {
  const mimeTypes = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'rtf': 'application/rtf',
    'md': 'text/markdown',
    'csv': 'text/csv'
  }
  return mimeTypes[fileType] || 'application/octet-stream'
}

// Enhanced status update endpoint
app.post("/update-status", async (req, res) => {
  try {
    const { jobId, status, progress, error, metrics } = req.body

    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" })
    }

    const jobStatus = jobStatuses.get(jobId)
    if (!jobStatus) {
      return res.status(404).json({ error: "Job not found" })
    }

    // Update job status with enhanced metrics
    const updatedStatus = {
      ...jobStatus,
      status,
      progress: Math.max(0, Math.min(100, progress || 0)),
      lastUpdate: new Date().toISOString(),
      error: error || null,
      metrics: {
        ...jobStatus.metrics,
        ...metrics,
        duration: Date.now() - jobStatus.startTime
      }
    }

    if (status === "completed") {
      updatedStatus.completedAt = new Date().toISOString()
      updatedStatus.metrics.totalDuration = Date.now() - jobStatus.startTime
    }

    jobStatuses.set(jobId, updatedStatus)

    // Track processing completion for analytics
    if (status === "completed" && metrics) {
      performanceMonitor.trackDocumentProcessing({
        filename: jobStatus.filename,
        document_analysis: { total_chunks: metrics.totalProcessed || 0 },
        performance_metrics: { processing_time_ms: updatedStatus.metrics.totalDuration }
      })
    }

    res.status(200).json({ 
      message: "Status updated successfully",
      status: updatedStatus
    })

  } catch (error) {
    console.error("Status update error:", error)
    performanceMonitor.trackError(error, { endpoint: '/update-status' })
    res.status(500).json({
      error: "Failed to update status",
      details: error.message,
    })
  }
})

// Enhanced status check endpoint
app.get("/status/:jobId", (req, res) => {
  try {
    const { jobId } = req.params
    const jobStatus = jobStatuses.get(jobId)

    if (!jobStatus) {
      return res.status(404).json({ 
        error: "Job not found",
        jobId: jobId
      })
    }

    // Calculate additional metrics
    const now = Date.now()
    const duration = now - jobStatus.startTime
    const estimatedTotal = jobStatus.progress > 0 
      ? (duration / jobStatus.progress) * 100 
      : null
    const estimatedRemaining = estimatedTotal && jobStatus.progress < 100
      ? estimatedTotal - duration
      : null

    const enhancedStatus = {
      ...jobStatus,
      metrics: {
        ...jobStatus.metrics,
        currentDuration: duration,
        estimatedTotal: estimatedTotal,
        estimatedRemaining: estimatedRemaining,
        processingSpeed: jobStatus.progress > 0 ? jobStatus.progress / (duration / 1000) : 0
      }
    }

    res.status(200).json(enhancedStatus)

  } catch (error) {
    console.error("Status check error:", error)
    performanceMonitor.trackError(error, { endpoint: '/status' })
    res.status(500).json({
      error: "Failed to get job status",
      details: error.message,
    })
  }
})

// Get document content endpoint for flashcard generation
app.get("/document-content", async (req, res) => {
  try {
    const documentId = req.query.documentId
    console.log(`📄 Fetching content for document ID: ${documentId}`)

    if (!documentId) {
      return res.status(400).json({
        error: "Document ID is required",
        example: "/document-content?documentId=123"
      })
    }

    // First, get the document details from database
    // Try to find by numeric ID first, then by documentId string
    let documentData, fetchError
    
    // Check if the documentId is numeric (database id) or string (documentId)
    const isNumeric = !isNaN(documentId) && !isNaN(parseFloat(documentId))
    
    if (isNumeric) {
      // Try finding by numeric id first
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", parseInt(documentId))
        .single()
      
      documentData = data
      fetchError = error
    } else {
      // Try finding by string documentId
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("documentId", documentId)
        .single()
      
      documentData = data
      fetchError = error
    }

    if (fetchError || !documentData) {
      console.error("❌ Document not found:", fetchError?.message)
      return res.status(404).json({
        error: "Document not found",
        details: fetchError?.message
      })
    }

    console.log(`📖 Found document: ${documentData.name}`)

    // Try to get content from vector store (all chunks for this document)
    try {
      const { QdrantVectorStore } = await import("@langchain/qdrant")
      const { QdrantClient } = await import("@qdrant/js-client-rest")
      const { OpenAIEmbeddings } = await import("@langchain/openai")

  const client = new QdrantClient({ url: process.env.QDRANT_URL || "http://qdrant:6333" })
      const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: process.env.OPENAI_API_KEY,
      })

      const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        client: client,
        collectionName: "node-js-docs",
      })
      
      // Search for all chunks belonging to this document
      // We'll use a broad search and then filter by metadata
      const searchResults = await vectorStore.similaritySearch("", 100) // Get many results
      
    // Debug: Print all metadata for returned chunks
    console.log("Qdrant searchResults metadata:", searchResults.map(doc => doc.metadata));
      // Filter results to only include chunks from this specific document
      // Use the documentId from the database record (string) for metadata filtering
      const documentIdForSearch = documentData.documentId || documentData.id.toString()
      
      const documentChunks = searchResults.filter(doc => 
        doc.metadata && 
        (doc.metadata.documentId === documentIdForSearch || 
         doc.metadata.documentId === documentData.id ||
         doc.metadata.documentId === documentData.id.toString() ||
         doc.metadata.source?.includes(documentData.name))
      )

      if (documentChunks.length > 0) {
        // Combine all chunks into full document content
        const fullContent = documentChunks
          .sort((a, b) => (a.metadata.chunkIndex || 0) - (b.metadata.chunkIndex || 0))
          .map(chunk => chunk.pageContent)
          .join('\n\n')

        console.log(`✅ Retrieved ${documentChunks.length} chunks (${fullContent.length} characters)`)
        
        return res.status(200).json({
          success: true,
          content: fullContent,
          documentName: documentData.name,
          chunks: documentChunks.length,
          totalLength: fullContent.length
        })
      }
    } catch (vectorError) {
      console.warn("⚠️ Could not retrieve from vector store:", vectorError.message)
    }

    // Fallback: Try to read the original file if it still exists
    try {
      const path = await import('path')
      const fs = await import('fs')
      const { fileURLToPath } = await import('url')
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      
      const possiblePaths = [
        path.join(__dirname, 'uploads', path.basename(documentData.name)),
        path.join(__dirname, 'uploads', documentData.name)
      ]

      for (const filePath of possiblePaths) {
        try {
          await fs.promises.access(filePath)
          console.log(`📁 Found original file: ${filePath}`)
          
          // For now, return a message indicating the file exists
          // In a full implementation, you'd want to parse the file content here
          return res.status(200).json({
            success: true,
            content: `Document "${documentData.name}" found but content extraction from original file is not implemented. Please ensure the document is properly processed and stored in the vector database.`,
            documentName: documentData.name,
            source: "original_file",
            note: "Content should be retrieved from vector store after processing"
          })
        } catch (accessError) {
          continue
        }
      }
    } catch (fileError) {
      console.warn("⚠️ Could not access original file:", fileError.message)
    }

    // No content found anywhere
    return res.status(404).json({
      error: "Document content not found",
      message: "Document exists but no processed content was found in vector store or file system",
      suggestion: "Please re-upload and process the document",
      documentName: documentData.name
    })

  } catch (error) {
    console.error("❌ Document content fetch error:", error)
    performanceMonitor.trackError(error, { endpoint: '/document-content' })
    res.status(500).json({
      error: "Internal server error during content fetch",
      details: error.message
    })
  }
})

// Get all documents endpoint
app.get("/documents", async (req, res) => {
  try {
    console.log("📋 Fetching all documents from database")

    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching documents:", error.message)
      return res.status(500).json({
        error: "Failed to fetch documents",
        details: error.message
      })
    }

    console.log(`📄 Found ${documents?.length || 0} documents`)
    
    res.status(200).json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0
    })

  } catch (error) {
    console.error("❌ Documents fetch error:", error)
    performanceMonitor.trackError(error, { endpoint: '/documents GET' })
    res.status(500).json({
      error: "Internal server error during documents fetch",
      details: error.message
    })
  }
})

// Delete document endpoint
app.delete("/documents/:id", async (req, res) => {
  try {
    const documentId = req.params.id
    console.log(`🗑️ Attempting to delete document with ID: ${documentId}`)

    // First, get the document details from database
    const { data: documentData, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single()

    if (fetchError) {
      console.error("❌ Error fetching document:", fetchError.message)
      return res.status(404).json({
        error: "Document not found",
        details: fetchError.message
      })
    }

    if (!documentData) {
      return res.status(404).json({
        error: "Document not found"
      })
    }

    console.log(`📄 Found document: ${documentData.name}`)

    // Delete the document from Supabase database
    const { error: deleteDbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)

    if (deleteDbError) {
      console.error("❌ Error deleting from database:", deleteDbError.message)
      return res.status(500).json({
        error: "Failed to delete document from database",
        details: deleteDbError.message
      })
    }

    // Delete the physical file if it exists
    try {
      const fs = await import('fs')
      const path = await import('path')
      const { fileURLToPath } = await import('url')
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      
      // Try to delete from uploads directory using different possible paths
      const uploadsPaths = [
        path.join(__dirname, 'uploads', path.basename(documentData.name)),
        path.join(__dirname, 'uploads', documentData.name),
        documentData.name // In case it's already a full path
      ]

      for (const filePath of uploadsPaths) {
        try {
          await fs.promises.access(filePath)
          await fs.promises.unlink(filePath)
          console.log(`🗂️ Deleted physical file: ${filePath}`)
          break
        } catch (accessError) {
          // File doesn't exist at this path, try next one
          continue
        }
      }
    } catch (fileError) {
      console.warn("⚠️ Could not delete physical file:", fileError.message)
      // Don't fail the request if file deletion fails
    }

    // TODO: Delete related vector embeddings from Qdrant
    // This would require knowing which chunks belong to this document
    // For now, we'll leave the embeddings (they'll be overwritten if document is re-uploaded)

    console.log(`✅ Successfully deleted document: ${documentData.name}`)
    
    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      deletedDocument: {
        id: documentData.id,
        name: documentData.name
      }
    })

  } catch (error) {
    console.error("❌ Document deletion error:", error)
    performanceMonitor.trackError(error, { endpoint: '/documents/:id DELETE' })
    res.status(500).json({
      error: "Internal server error during document deletion",
      details: error.message
    })
  }
})

// Optimized chat endpoint using the new chat service
app.get("/chat", async (req, res) => {
  // Set timeout for this request (3 minutes for complex queries)
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ 
        error: "Request Timeout",
        message: "The request took too long to complete. This might happen with very complex queries or large documents.",
        suggestion: "Try asking a more specific question or breaking complex queries into smaller parts."
      })
    }
  }, 180000) // Increased to 3 minutes (180 seconds)

  try {
    const userQuery = req.query.message?.trim()
    const documentId = req.query.documentId?.trim()
    const responseMode = req.query.responseMode?.trim() || 'standard' // 'standard' or 'professional'
    const responseDepth = req.query.responseDepth?.trim() || 'standard' // 'quick', 'standard', or 'professional'

    if (!userQuery) {
      clearTimeout(timeoutId)
      return res.status(400).json({ 
        error: "Query message is required",
        example: "/chat?message=What is the main topic of the document?&responseMode=professional&responseDepth=standard"
      })
    }

    console.log(`💬 Processing optimized chat query: "${userQuery.substring(0, 50)}..."`)
    console.log(`🎯 Response Mode: ${responseMode}, Depth: ${responseDepth}`)
    if (documentId) {
      console.log(`📄 Filtering by document filename: "${documentId}"`)
    }

    // Process query using optimized chat service with enhanced options
    const result = await chatService.processQuery(userQuery, { 
      documentId, 
      responseMode, 
      responseDepth 
    })

    // Clear timeout since request completed successfully
    clearTimeout(timeoutId)

    // Track query performance
    performanceMonitor.trackQueryProcessing(result)

    res.status(200).json(result)

  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId)
    
    console.error("Chat endpoint error:", error)
    performanceMonitor.trackError(error, { endpoint: '/chat', query: req.query.message })
    
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to process your question",
        details: error.message,
        suggestions: [
          "Try rephrasing your question",
          "Use simpler language",
          "Check if documents have been processed"
        ],
        formatted: true
      })
    }
  }
})

// Debug endpoint to check vector database status
app.get("/debug/vector-status", async (req, res) => {
  try {
    const { QdrantVectorStore } = await import("@langchain/qdrant")
    const { QdrantClient } = await import("@qdrant/js-client-rest")
    const { OpenAIEmbeddings } = await import("@langchain/openai")

    const client = new QdrantClient({ url: process.env.QDRANT_URL || "http://qdrant:6333" })
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_KEY,
    })

    try {
      // Check if collection exists
      const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        client: client,
        collectionName: "node-js-docs",
      })

      // Try a simple search to test
      const testResults = await vectorStore.similaritySearch("test", 1)
      
      res.json({
        status: "success",
        collection_exists: true,
        test_search_results: testResults.length,
        sample_content: testResults.length > 0 ? testResults[0].pageContent.substring(0, 200) : null
      })
    } catch (collectionError) {
      res.json({
        status: "error",
        collection_exists: false,
        error: collectionError.message,
        suggestion: "No documents have been processed yet or collection was not created"
      })
    }
  } catch (error) {
    res.status(500).json({
      error: "Debug check failed",
      details: error.message
    })
  }
})

// Debug endpoint to test OpenAI API key
app.get("/debug/openai-status", async (req, res) => {
  try {
    console.log("🧪 Testing OpenAI API connection...")
    
    // Test if API key is set
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        status: "error",
        error: "OpenAI API key not configured",
        suggestion: "Set OPENAI_API_KEY environment variable"
      })
    }

    // Test a simple API call
    const OpenAI = (await import("openai")).default
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const testResponse = await openai.chat.completions.create({
      model: "gpt-5-mini-2025-08-07",
      messages: [
        { role: "user", content: "Say 'API test successful'" }
      ],
      max_completion_tokens: 20
    })

    res.json({
      status: "success",
      api_key_configured: true,
      model_accessible: true,
      test_response: testResponse.choices[0].message.content,
      usage: testResponse.usage
    })

  } catch (error) {
    console.error("OpenAI API test failed:", error)
    res.json({
      status: "error",
      api_key_configured: !!process.env.OPENAI_API_KEY,
      error: error.message,
      suggestion: "Check API key validity and quota"
    })
  }
})

// Performance monitoring endpoints
app.get("/performance", async (req, res) => {
  try {
    const analytics = await performanceMonitor.getDetailedAnalytics()
    res.status(200).json(analytics)
  } catch (error) {
    console.error("Performance endpoint error:", error)
    res.status(500).json({ error: "Failed to get performance data" })
  }
})

app.get("/performance/realtime", (req, res) => {
  try {
    const metrics = performanceMonitor.getRealTimeMetrics()
    res.status(200).json(metrics)
  } catch (error) {
    console.error("Real-time metrics error:", error)
    res.status(500).json({ error: "Failed to get real-time metrics" })
  }
})

// Enhanced health check endpoint
app.get("/health", async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0-optimized",
      uptime: process.uptime(),
      services: {}
    }

    // Check OpenAI configuration
    health.services.openai = {
      configured: !!process.env.OPENAI_API_KEY,
      status: "ok"
    }

    // Check Supabase connection
    try {
      const { data, error } = await supabase.from("documents").select("count").limit(1)
      health.services.supabase = {
        status: error ? "error" : "connected",
        error: error?.message
      }
    } catch (err) {
      health.services.supabase = {
        status: "disconnected",
        error: err.message
      }
    }

    // Check Redis/Queue connection
    try {
      await queue.client.ping()
      health.services.redis = {
        status: "connected",
        queueJobs: await queue.getJobCounts()
      }
    } catch (err) {
      health.services.redis = {
        status: "disconnected",
        error: err.message
      }
      health.status = "degraded"
    }

    // Get chat service health
    const chatHealth = await chatService.getServiceHealth()
    health.services.chatService = chatHealth

    // Get performance metrics
    const performanceMetrics = performanceMonitor.getRealTimeMetrics()
    health.performance = performanceMetrics

    // Overall health assessment
    const servicesHealthy = Object.values(health.services).every(
      service => service.status === "connected" || service.status === "ok" || service.status === "healthy"
    )
    
    if (!servicesHealthy) {
      health.status = "degraded"
    }

    res.status(health.status === "healthy" ? 200 : 503).json(health)

  } catch (error) {
    console.error("Health check error:", error)
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Cache management endpoints
app.post("/cache/clear/:type?", async (req, res) => {
  try {
    const { type } = req.params
    
    if (type) {
      const cleared = await chatService.cache.clearCacheType(type)
      res.json({ 
        message: `Cleared ${cleared} ${type} cache entries`,
        type,
        cleared 
      })
    } else {
      // Clear all cache types
      const types = ['embedding', 'query', 'context', 'chunks', 'stats']
      let totalCleared = 0
      
      for (const cacheType of types) {
        const cleared = await chatService.cache.clearCacheType(cacheType)
        totalCleared += cleared
      }
      
      res.json({ 
        message: `Cleared ${totalCleared} total cache entries`,
        totalCleared 
      })
    }
  } catch (error) {
    console.error("Cache clear error:", error)
    res.status(500).json({ error: "Failed to clear cache" })
  }
})

app.get("/cache/stats", async (req, res) => {
  try {
    const stats = await chatService.cache.getCacheStats()
    res.json(stats)
  } catch (error) {
    console.error("Cache stats error:", error)
    res.status(500).json({ error: "Failed to get cache stats" })
  }
})

// Queue management endpoints
app.get("/queue/stats", async (req, res) => {
  try {
    const stats = await queue.getJobCounts()
    const workers = await queue.getWorkers()
    
    res.json({
      jobs: stats,
      workers: workers.length,
      activeJobs: Array.from(jobStatuses.values()).filter(job => 
        job.status === "processing" || job.status === "queued"
      ).length
    })
  } catch (error) {
    console.error("Queue stats error:", error)
    res.status(500).json({ error: "Failed to get queue stats" })
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Enhanced AI Learning Hub Server running on port ${PORT}`)
  console.log(`📊 Performance monitoring enabled`)
  console.log(`💾 Redis caching enabled`) 
  console.log(`🤖 Optimized AI prompts enabled`)
  console.log(`📈 Real-time analytics available at /performance`)
  console.log(`🏥 Health check available at /health`)
  console.log(`⏳ Ready for optimized document processing...`)
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`)
  
  try {
    // Close services in order
    await chatService.shutdown()
    await performanceMonitor.shutdown()
    await queue.close()
    
    console.log("✅ All services shut down successfully")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error during shutdown:", error)
    process.exit(1)
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))

export { app, chatService, performanceMonitor }
