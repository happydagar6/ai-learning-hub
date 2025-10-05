import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()

import { Worker } from "bullmq"
import { OpenAIEmbeddings } from "@langchain/openai"
import { QdrantVectorStore } from "@langchain/qdrant"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { QdrantClient } from "@qdrant/js-client-rest"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import mammoth from "mammoth"
import CacheManager from "./cache-manager.js"

// Validate environment variables at startup
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY environment variable is not set!")
  process.exit(1)
}

console.log("✅ Environment variables loaded successfully")

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Enhanced document processor with caching and optimization
class OptimizedDocumentProcessor {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_KEY,
      batchSize: 100, // Process embeddings in batches
      maxRetries: 3,
    })

    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      timeout: 30000 // 35 second timeout for Qdrant operations
    })
    this.cache = new CacheManager()
    
    // Performance tracking
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      processingTimes: [],
      embeddingTimes: [],
      chunkCounts: []
    }
  }

  // Health check for services
  async healthCheck() {
    const health = {
      qdrant: false,
      redis: false,
      openai: false
    }

    try {
      // Check Qdrant connection
      await Promise.race([
        this.client.getCollections(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ])
      health.qdrant = true
    } catch (error) {
      console.warn(`⚠️ Qdrant health check failed:`, error.message)
    }

    try {
      // Check Redis connection via cache
      await this.cache.ping()
      health.redis = true
    } catch (error) {
      console.warn(`⚠️ Redis health check failed:`, error.message)
    }

    try {
      // Check OpenAI connection (lightweight test)
      await Promise.race([
        this.embeddings.embedQuery("test"),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ])
      health.openai = true
    } catch (error) {
      console.warn(`⚠️ OpenAI health check failed:`, error.message)
    }

    return health
  }

  // Enhanced status update with metrics
  async updateStatus(jobId, status, progress, error = null) {
    const maxRetries = 3
    let retries = 0

    const statusData = {
      jobId,
      status,
      progress,
      error,
      metrics: {
        cacheHitRatio: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
        avgProcessingTime: this.metrics.processingTimes.length > 0 
          ? this.metrics.processingTimes.reduce((a, b) => a + b) / this.metrics.processingTimes.length 
          : 0,
        totalProcessed: this.metrics.chunkCounts.reduce((a, b) => a + b, 0)
      }
    }

    while (retries < maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

  const response = await fetch(`${process.env.DOCUMENT_SERVER_URL}/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statusData),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        if (response.ok) {
          console.log(`📊 Status updated: ${jobId} -> ${status} (${progress}%) | Cache Hit Ratio: ${(statusData.metrics.cacheHitRatio * 100).toFixed(1)}%`)
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (err) {
        retries++
        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
        }
      }
    }
  }

  // Optimized chunk creation with intelligent splitting
  async createOptimizedChunks(docs, documentId) {
    const startTime = Date.now()
    
    // Check cache first
    const cachedChunks = await this.cache.getCachedDocumentChunks(documentId)
    if (cachedChunks) {
      this.metrics.cacheHits++
      console.log(`📦 Using cached chunks for document ${documentId}`)
      return cachedChunks.map(chunk => new Document({
        pageContent: chunk.content,
        metadata: chunk.metadata
      }))
    }
    
    this.metrics.cacheMisses++

    // Enhanced preprocessing with better text cleaning
    const preprocessedDocs = docs.map((doc, index) => {
      let content = doc.pageContent
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n\n")
        .replace(/([.!?])\s*([A-Z])/g, "$1\n\n$2")
        .replace(/(\d+\.)\s+/g, "\n$1 ")
        .replace(/([•\-*])\s+/g, "\n$1 ")
        .replace(/(Chapter|Section|Part)\s+(\d+)/gi, "\n\n$1 $2")
        .trim()

      return {
        ...doc,
        pageContent: content,
        metadata: {
          ...doc.metadata,
          documentIndex: index,
          processingTime: new Date().toISOString(),
          contentQuality: this.assessContentQuality(content)
        }
      }
    })

    // Enhanced adaptive chunking with comprehensive semantic boundaries
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.getOptimalChunkSize(preprocessedDocs),
      chunkOverlap: 400, // Increased overlap for better context preservation and comprehensive coverage
      separators: [
        "\n# ", "\n## ", "\n### ", "\n#### ", // Section headers (all levels)
        "\nSection ", "\nLesson ", "\nChapter ", "\nPart ", "\nUnit ", // Educational content markers
        "\nAssets:", "\nLiabilities:", "\nEquity:", "\nRevenue:", "\nIncome:", // Financial statement sections
        "\nCurrent assets", "\nNon-current assets", "\nCurrent liabilities", "\nLong-term", // Financial subsections
        "\nApple Inc", "\nConsolidated", "\nFinancial", "\nBalance Sheet", "\nIncome Statement", // Company/document specific
        "\n\n\n", "\n\n", // Paragraph breaks
        ". ", "! ", "? ", // Sentence endings
        ": ", "; ", // Colon and semicolon breaks for lists and definitions
        "\n", " ", "" // Fallback separators
      ],
      lengthFunction: (text) => text.length,
      keepSeparator: true, // Preserve separators for better context
      addStartIndex: true, // Track position within document for better organization
    })

    const chunks = await splitter.splitDocuments(preprocessedDocs)

    // Enhanced chunk enrichment with semantic analysis
    const enhancedChunks = chunks.map((chunk, index) => {
      const analysis = this.analyzeChunkContent(chunk.pageContent)
      
      // Enhanced page number calculation for all file types
      let estimatedPage = chunk.metadata.page || 1
      let chunkPosition = 'middle'
      
      if (chunk.metadata.source) {
        const source = chunk.metadata.source.toLowerCase()
        
        if (source.includes('.docx')) {
          // Improved DOCX page estimation
          const wordsPerPage = 350 // More accurate estimate
          const chunkWordCount = chunk.pageContent.split(/\s+/).length
          const cumulativeWords = chunks.slice(0, index).reduce((sum, c) => 
            sum + c.pageContent.split(/\s+/).length, 0)
          estimatedPage = Math.floor(cumulativeWords / wordsPerPage) + 1
          
          // Determine chunk position within page
          const pagePosition = (cumulativeWords % wordsPerPage) / wordsPerPage
          chunkPosition = pagePosition < 0.3 ? 'beginning' : pagePosition > 0.7 ? 'end' : 'middle'
          
          console.log(`📄 DOCX chunk ${index}: page ${estimatedPage}, position ${chunkPosition}`)
        } else if (source.includes('.pdf')) {
          // Enhanced PDF page handling to ensure all pages are properly captured
          estimatedPage = chunk.metadata?.loc?.pageNumber || chunk.metadata?.page || 1
          
          // Better position calculation for PDFs
          const pageContent = chunk.pageContent.toLowerCase()
          if (pageContent.includes('page 1') || index < chunks.length * 0.33) {
            chunkPosition = 'beginning'
          } else if (pageContent.includes('page 2') || (index >= chunks.length * 0.33 && index < chunks.length * 0.66)) {
            chunkPosition = 'middle'
          } else {
            chunkPosition = 'end'
          }
          
          // For PDFs, also try to extract page numbers from content
          const pageMatch = pageContent.match(/page\s*(\d+)/i)
          if (pageMatch) {
            estimatedPage = parseInt(pageMatch[1])
          }
          
          console.log(`📄 PDF chunk ${index}: page ${estimatedPage}, position ${chunkPosition}, content length: ${chunk.pageContent.length}`)
        }
      }
      
      // Enhanced semantic context extraction
      const semanticContext = this.extractSemanticContext(chunk.pageContent)
      
      return {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          documentId,
          chunkIndex: index,
          page: estimatedPage,
          chunkPosition, // New: position within page
          ...analysis,
          ...semanticContext, // New: semantic markers
          processingTimestamp: Date.now(),
          semanticDensity: this.calculateSemanticDensity(chunk.pageContent),
          readabilityScore: this.calculateReadabilityScore(chunk.pageContent),
          contextRelevance: this.calculateContextRelevance(chunk.pageContent, index, chunks) // New
        }
      }
    })

    // Enhanced filtering and ranking for better quality with page diversity
    const qualityChunks = enhancedChunks
      .filter(chunk => this.isHighQualityChunk(chunk))
      
    // Ensure page diversity in quality chunks
    const pageGroups = {}
    qualityChunks.forEach(chunk => {
      const page = chunk.metadata.page || 1
      if (!pageGroups[page]) pageGroups[page] = []
      pageGroups[page].push(chunk)
    })
    
    console.log(`📊 Page distribution in quality chunks:`, Object.keys(pageGroups).map(page => `Page ${page}: ${pageGroups[page].length}`).join(', '))
    
    // Sort each page group by quality, then combine with balanced representation
    const balancedChunks = []
    const maxPages = Object.keys(pageGroups).length
    const totalChunksTarget = 800 // Increased from 500 for better comprehensive coverage
    const chunksPerPage = Math.floor(totalChunksTarget / Math.max(maxPages, 1))
    
    Object.values(pageGroups).forEach(pageChunks => {
      const sortedPageChunks = pageChunks.sort((a, b) => {
        const scoreA = (a.metadata.semanticDensity || 0) * 0.4 + 
                      (a.metadata.contextRelevance || 0) * 0.3 +
                      (a.metadata.isEducationalContent ? 0.3 : 0)
        const scoreB = (b.metadata.semanticDensity || 0) * 0.4 + 
                      (b.metadata.contextRelevance || 0) * 0.3 +
                      (b.metadata.isEducationalContent ? 0.3 : 0)
        return scoreB - scoreA
      })
      
      // Take best chunks from this page with higher minimum
      balancedChunks.push(...sortedPageChunks.slice(0, Math.max(chunksPerPage, 15))) // Increased minimum per page
    })
    
    // Fill remaining slots with highest scoring chunks overall
    const remainingSlots = totalChunksTarget - balancedChunks.length
    if (remainingSlots > 0) {
      const remainingChunks = qualityChunks
        .filter(chunk => !balancedChunks.includes(chunk))
        .sort((a, b) => {
          const scoreA = (a.metadata.semanticDensity || 0) * 0.4 + 
                        (a.metadata.contextRelevance || 0) * 0.3 +
                        (a.metadata.isEducationalContent ? 0.3 : 0)
          const scoreB = (b.metadata.semanticDensity || 0) * 0.4 + 
                        (b.metadata.contextRelevance || 0) * 0.3 +
                        (b.metadata.isEducationalContent ? 0.3 : 0)
          return scoreB - scoreA
        })
        .slice(0, remainingSlots)
      
      balancedChunks.push(...remainingChunks)
    }
    
    const finalQualityChunks = balancedChunks.slice(0, totalChunksTarget)

    // Cache the processed chunks
    await this.cache.cacheDocumentChunks(documentId, finalQualityChunks)
    
    const processingTime = Date.now() - startTime
    this.metrics.processingTimes.push(processingTime)
    this.metrics.chunkCounts.push(finalQualityChunks.length)

    // Log final page distribution
    const finalPageDistribution = {}
    finalQualityChunks.forEach(chunk => {
      const page = chunk.metadata.page || 1
      finalPageDistribution[page] = (finalPageDistribution[page] || 0) + 1
    })
    console.log(`📊 Final page distribution in processed chunks:`, finalPageDistribution)

    console.log(`⚡ Created ${finalQualityChunks.length} semantically enhanced chunks in ${processingTime}ms`)
    return finalQualityChunks
  }

  // Enhanced chunk size optimization with content-aware sizing for comprehensive coverage
  getOptimalChunkSize(docs) {
    const totalLength = docs.reduce((sum, doc) => sum + doc.pageContent.length, 0)
    const avgDocLength = totalLength / docs.length
    
    // Analyze content type for better sizing
    const sampleContent = docs.slice(0, 3).map(doc => doc.pageContent).join(' ')
    const isEducational = /section|lesson|chapter|exercise|example/i.test(sampleContent)
    const isTechnical = /function|class|code|algorithm|programming/i.test(sampleContent)
    const isFinancial = /assets|liabilities|revenue|equity|balance sheet|income statement|apple inc|financial/i.test(sampleContent)
    
    // Adaptive sizing with content awareness for comprehensive coverage
    if (isFinancial) {
      // Financial content: larger chunks to preserve financial context and calculations
      return avgDocLength > 8000 ? 2500 : avgDocLength > 4000 ? 2000 : 1600
    } else if (isEducational) {
      // Educational content: preserve lesson/section boundaries with larger chunks
      return avgDocLength > 5000 ? 2200 : avgDocLength > 2000 ? 1800 : 1400
    } else if (isTechnical) {
      // Technical content: moderate chunks for code context preservation
      return avgDocLength > 5000 ? 1400 : avgDocLength > 2000 ? 1200 : 1000
    } else {
      // General content: larger chunks for comprehensive explanations
      return avgDocLength > 5000 ? 1800 : avgDocLength > 2000 ? 1500 : 1200
    }
  }

  // New: Extract semantic context markers
  extractSemanticContext(content) {
    const context = {
      isEducationalContent: false,
      contentType: 'general',
      hasStructure: false,
      keyTopics: [],
      sectionMarkers: []
    }
    
    const lowerContent = content.toLowerCase()
    
    // Detect educational patterns
    if (/section\s+\d+|lesson\s+\d+|chapter\s+\d+/i.test(content)) {
      context.isEducationalContent = true
      context.contentType = 'educational'
      
      // Extract section/lesson numbers
      const sectionMatches = content.match(/section\s+(\d+)/gi)
      const lessonMatches = content.match(/lesson\s+(\d+)/gi)
      
      if (sectionMatches) context.sectionMarkers.push(...sectionMatches)
      if (lessonMatches) context.sectionMarkers.push(...lessonMatches)
    }
    
    // Detect technical content
    if (/function|class|method|algorithm|code|programming|javascript|node\.?js/i.test(content)) {
      context.contentType = context.contentType === 'educational' ? 'educational-technical' : 'technical'
    }
    
    // Detect structure
    context.hasStructure = /^\s*\d+\.|^\s*[a-z]\)|^\s*-|^\s*\*|###|##|#/m.test(content)
    
    // Extract key topics (improved)
    const topicPatterns = [
      /\b(node\.?js|javascript|programming|development|coding)\b/gi,
      /\b(function|method|class|object|array|string)\b/gi,
      /\b(file\s+system|command\s+line|socket\.?io|express|server)\b/gi,
      /\b(module|require|import|export|package)\b/gi
    ]
    
    topicPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        context.keyTopics.push(...matches.map(m => m.toLowerCase()))
      }
    })
    
    // Remove duplicates
    context.keyTopics = [...new Set(context.keyTopics)]
    
    return context
  }

  // New: Calculate context relevance
  calculateContextRelevance(content, index, allChunks) {
    let relevance = 0.5 // Base relevance
    
    // Boost for educational markers
    if (/section|lesson|chapter|exercise/i.test(content)) relevance += 0.3
    
    // Boost for structured content
    if (/^\s*\d+\.|^\s*[a-z]\)|^\s*-|^\s*\*/m.test(content)) relevance += 0.2
    
    // Boost for content with examples
    if (/example|for\s+instance|such\s+as|like/i.test(content)) relevance += 0.15
    
    // Context from neighboring chunks
    const prevChunk = allChunks[index - 1]
    const nextChunk = allChunks[index + 1]
    
    if (prevChunk && this.hasTopicContinuity(prevChunk.pageContent, content)) relevance += 0.1
    if (nextChunk && this.hasTopicContinuity(content, nextChunk.pageContent)) relevance += 0.1
    
    return Math.min(relevance, 1.0)
  }

  // New: Check topic continuity between chunks
  hasTopicContinuity(content1, content2) {
    const getKeywords = (text) => {
      return text.toLowerCase()
        .match(/\b\w{4,}\b/g)
        ?.filter(word => !/^(this|that|they|them|with|from|have|been|will|would|could|should)$/.test(word))
        ?.slice(0, 10) || []
    }
    
    const keywords1 = new Set(getKeywords(content1))
    const keywords2 = new Set(getKeywords(content2))
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)))
    const union = new Set([...keywords1, ...keywords2])
    
    return intersection.size / union.size > 0.1 // 10% overlap threshold
  }

  // Assess content quality for optimization
  assessContentQuality(content) {
    if (!content || content.trim().length === 0) return 0
    
    let score = 0
    const words = content.split(/\s+/)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Basic content metrics
    if (words.length >= 10) score += 1  // Minimum word count
    if (sentences.length >= 2) score += 1  // Multiple sentences
    
    // Structural elements
    if (/^[A-Z][A-Za-z\s]+:?\s*$/m.test(content)) score += 1  // Headers
    if (/^\s*[\d\-*•]\s+/m.test(content)) score += 1  // Lists
    if (/\d+/.test(content)) score += 0.5  // Contains numbers
    
    // Meaningful content indicators
    if (/(definition|example|procedure|method|process)/i.test(content)) score += 1
    if (content.length > 50 && content.length < 2000) score += 1  // Optimal length
    
    // Penalty for poor quality indicators
    if (content.length < 20) score -= 2  // Too short
    if (/^\s*[^\w\s]*\s*$/.test(content)) score -= 2  // Only symbols/punctuation
    if ((content.match(/\s+/g) || []).length / content.length > 0.5) score -= 1  // Too many spaces
    
    return Math.max(0, Math.min(5, score))  // Scale 0-5
  }

  // Advanced content analysis for better retrieval
  analyzeChunkContent(content) {
    const lowerContent = content.toLowerCase()
    const words = content.split(/\s+/)
    
    return {
      wordCount: words.length,
      hasNumbers: /\d+/.test(content),
      hasLists: /^\s*[\d\-*•]\s+/m.test(content),
      hasHeaders: /^[A-Z][A-Za-z\s]+:?\s*$/m.test(content),
      hasBullets: /[•\-*]\s+/.test(content),
      hasDefinitions: /(definition|means|refers to|is defined as)/i.test(content),
      hasExamples: /(example|for instance|such as|e\.g\.|i\.e\.)/i.test(content),
      hasProcedures: /(step|process|procedure|method|algorithm)/i.test(content),
      hasQuestions: /\?/.test(content),
      contentType: this.classifyContentAdvanced(content),
      structureScore: this.calculateAdvancedStructureScore(content),
      technicalTerms: this.extractTechnicalTerms(content),
      keyPhrases: this.extractKeyPhrases(content)
    }
  }

  // Enhanced content classification
  classifyContentAdvanced(content) {
    const patterns = {
      definition: /(definition|means|refers to|is defined as|can be described as)/i,
      example: /(example|for instance|such as|e\.g\.|i\.e\.|consider|suppose)/i,
      procedure: /(step|process|procedure|method|algorithm|workflow|instructions)/i,
      comparison: /(versus|compared to|difference|similarity|in contrast|however)/i,
      explanation: /(because|therefore|thus|hence|as a result|consequently)/i,
      list: /^\s*[\d\-*•]\s+/m,
      table: /\|.*\||\t.*\t/,
      code: /```|`[^`]+`|function|class|var |let |const /,
      question: /\?|what|how|when|where|why|who/i,
      summary: /(summary|conclusion|overview|recap|in summary)/i,
      header: /^[A-Z][A-Za-z\s]+:?\s*$/m
    }

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) return type
    }
    return 'general'
  }

  // Calculate advanced structure score for better content ranking
  calculateAdvancedStructureScore(content) {
    let score = 0

    // Structural elements scoring
    if (/^\s*[\d\-*•]\s+/m.test(content)) score += 3 // Lists
    if (/^[A-Z][A-Za-z\s]+:?\s*$/m.test(content)) score += 3 // Headers
    if (/(definition|example|procedure|step)/i.test(content)) score += 2 // Key terms
    if (/\d+\.\s+/.test(content)) score += 2 // Numbered items
    if (/([.!?])\s*([A-Z])/g.test(content)) score += 1 // Proper sentences
    
    // Content organization indicators
    if (/(chapter|section|part|subsection)/i.test(content)) score += 2
    if (/(introduction|conclusion|summary)/i.test(content)) score += 1
    if (/\b(first|second|third|finally|lastly)\b/i.test(content)) score += 1
    
    // Technical content indicators
    if (/\b\d+%\b/.test(content)) score += 1 // Percentages
    if (/\$\d+/.test(content)) score += 1 // Currency
    if (/\b\d{4}\b/.test(content)) score += 1 // Years
    if (/\b[A-Z]{2,}\b/.test(content)) score += 1 // Acronyms
    
    // Penalty for poor structure
    if (content.length < 50) score -= 2
    if (!/[.!?]/.test(content)) score -= 1 // No sentence endings
    
    return Math.max(0, score)
  }

  // Calculate semantic density for better ranking
  calculateSemanticDensity(content) {
    const words = content.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'])
    
    const meaningfulWords = Array.from(uniqueWords).filter(word => 
      word.length > 3 && !stopWords.has(word)
    )
    
    const technicalTermScore = meaningfulWords.filter(word => 
      /^[A-Z]/.test(word) || word.includes('_') || word.length > 6
    ).length
    
    return (meaningfulWords.length / words.length) + (technicalTermScore * 0.1)
  }

  // Extract technical terms for better indexing
  extractTechnicalTerms(content) {
    const words = content.split(/\s+/)
    const technicalTerms = []
    
    // Pattern matching for technical terms
    const patterns = [
      /^[A-Z][a-z]+[A-Z]/,  // CamelCase
      /[a-z]+_[a-z]+/i,     // snake_case
      /\b[A-Z]{2,}\b/,      // ACRONYMS
      /\b\w+\(\)/,          // function()
      /\b\d+\.\d+\b/        // version numbers
    ]
    
    words.forEach(word => {
      if (patterns.some(pattern => pattern.test(word)) && word.length > 2) {
        technicalTerms.push(word)
      }
    })
    
    return technicalTerms.slice(0, 10) // Top 10 technical terms
  }

  // Extract key phrases for better context
  extractKeyPhrases(content) {
    const phrases = []
    const sentences = content.split(/[.!?]+/)
    
    sentences.forEach(sentence => {
      // Look for important phrases
      const importantPhrases = sentence.match(/\b(?:important|key|main|primary|essential|critical|fundamental)\s+\w+(?:\s+\w+){0,3}/gi)
      if (importantPhrases) {
        phrases.push(...importantPhrases)
      }
    })
    
    return phrases.slice(0, 5) // Top 5 key phrases
  }

  // Quality assessment for chunk filtering
  isHighQualityChunk(chunk) {
    const content = chunk.pageContent.trim()
    const metadata = chunk.metadata
    
    // Quality criteria
    return content.length > 100 &&                    // Minimum length
           metadata.wordCount > 15 &&                  // Minimum word count
           metadata.semanticDensity > 0.3 &&           // Good semantic density
           !content.match(/^[\s\W]*$/) &&              // Not just whitespace/punctuation
           content.split('\n').length < 20 &&          // Not overly fragmented
           !content.includes('...') &&                 // Complete content
           metadata.readabilityScore > 0.4              // Readable content
  }

  // Calculate readability score
  calculateReadabilityScore(content) {
    const sentences = content.split(/[.!?]+/).length
    const words = content.split(/\s+/).length
    const avgWordsPerSentence = words / Math.max(sentences, 1)
    
    // Simple readability metric (lower is more readable)
    const readabilityScore = Math.max(0, 1 - (avgWordsPerSentence - 15) / 30)
    return Math.min(1, readabilityScore)
  }

  // Optimized embedding generation with caching
  async generateEmbeddingsWithCache(chunks) {
    const startTime = Date.now()
    const embeddings = []
    let cacheHits = 0
    let cacheMisses = 0

    console.log(`🧠 Generating embeddings for ${chunks.length} chunks with caching...`)

    // Process chunks in batches with cache checking
    const batchSize = 50
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const batchEmbeddings = []

      for (const chunk of batch) {
        // Check cache first
        const cachedEmbedding = await this.cache.getCachedEmbedding(chunk.pageContent)
        
        if (cachedEmbedding) {
          batchEmbeddings.push(cachedEmbedding)
          cacheHits++
        } else {
          // Generate new embedding
          try {
            const embedding = await this.embeddings.embedQuery(chunk.pageContent)
            batchEmbeddings.push(embedding)
            
            // Cache the embedding
            await this.cache.cacheEmbedding(chunk.pageContent, embedding)
            cacheMisses++
          } catch (error) {
            console.error(`Failed to generate embedding for chunk:`, error)
            // Use zero vector as fallback
            batchEmbeddings.push(new Array(1536).fill(0))
            cacheMisses++
          }
        }
      }

      embeddings.push(...batchEmbeddings)
      
      // Progress update
      const progress = Math.floor(((i + batch.length) / chunks.length) * 100)
      console.log(`🧠 Embedding progress: ${progress}% (Cache: ${cacheHits}/${cacheHits + cacheMisses})`)
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const embeddingTime = Date.now() - startTime
    this.metrics.embeddingTimes.push(embeddingTime)
    this.metrics.cacheHits += cacheHits
    this.metrics.cacheMisses += cacheMisses

    const cacheHitRatio = (cacheHits / (cacheHits + cacheMisses)) * 100
    console.log(`⚡ Embedding completed in ${embeddingTime}ms | Cache hit ratio: ${cacheHitRatio.toFixed(1)}%`)

    return embeddings
  }

  // Enhanced document processing with comprehensive optimization and file cleanup
  async processDocument(filePath, filename, jobId, documentId, fileType, job = null) {
    const startTime = Date.now()

    try {
      console.log(`🚀 Starting optimized processing: ${filename} (${fileType})`)
      
      // Perform health check before processing
      console.log(`🔍 Performing health check...`)
      const health = await this.healthCheck()
      console.log(`🔍 Health check results:`, health)
      
      if (!health.qdrant) {
        throw new Error("Qdrant vector database is not accessible")
      }
      if (!health.openai) {
        throw new Error("OpenAI API is not accessible")
      }
      
      await this.updateStatus(jobId, "processing", 5)
      if (job) await job.updateProgress(5)

      // Load document with timeout protection
      const docs = await Promise.race([
        this.loadDocument(filePath, fileType, filename),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Loading timeout (60s)`)), 60000)
        ),
      ])

      console.log(`📄 Loaded ${docs.length} sections`)
      await this.updateStatus(jobId, "processing", 20)
      if (job) await job.updateProgress(20)

      if (!docs || docs.length === 0) {
        throw new Error(`No content extracted from ${fileType.toUpperCase()}`)
      }

      // Create optimized chunks with caching
      const optimizedChunks = await this.createOptimizedChunks(docs, documentId)
      await this.updateStatus(jobId, "processing", 40)
      if (job) await job.updateProgress(40)

      if (optimizedChunks.length === 0) {
        throw new Error(`No valid chunks created from content`)
      }

      // Store in vector database with batch processing
      await this.storeInVectorDatabase(optimizedChunks, jobId, job)
      await this.updateStatus(jobId, "processing", 90)
      if (job) await job.updateProgress(90)

      // Update document status
      await this.updateDocumentStatus(documentId, true)
      await this.updateStatus(jobId, "completed", 100)
      if (job) await job.updateProgress(100)

      // PRODUCTION FIX: Clean up uploaded file after processing
      await this.cleanupUploadedFile(filePath)

      const processingTime = Date.now() - startTime
      
      // Generate comprehensive statistics
      const stats = this.generateProcessingStats(filename, docs, optimizedChunks, processingTime, jobId)
      
      // Cache the processing statistics
      await this.cache.cacheProcessingStats(`document_${documentId}`, stats)

      console.log("🎯 Optimized processing completed:", stats)
      return stats

    } catch (error) {
      console.error(`❌ Processing failed for ${filename}:`, error)
      await this.updateStatus(jobId, "failed", 0, error.message)
      throw error
    }
  }

  // Clean RTF content by removing control characters and tags
  cleanRTFContent(content) {
    if (!content) return ""

    let cleaned = content
      // Remove RTF control words (starting with backslash)
      .replace(/\\[a-z]+\d*\s?/gi, "")
      // Remove control characters
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
      // Remove extra braces
      .replace(/[{}]/g, "")
      // Replace multiple spaces with single space
      .replace(/\s+/g, " ")
      // Trim whitespace
      .trim()

    return cleaned
  }

  // Load document content with support for multiple file types
  async loadDocument(filePath, fileType, filename) {
    console.log(`📂 Loading ${fileType.toUpperCase()} document: ${filename}`)

    try {
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath)

      // Verify file exists
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`)
      }

      // Get file stats for validation
      const stats = fs.statSync(absolutePath)
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

      if (stats.size > 50 * 1024 * 1024) {
        // 50MB limit
        throw new Error(`File too large: ${(stats.size / 1024 / 1024).toFixed(2)} MB. Maximum size is 50MB.`)
      }

      let docs = []

      switch (fileType.toLowerCase()) {
        case "pdf":
          try {
            console.log("🔧 Using PDFLoader for PDF processing...")
            const loader = new PDFLoader(absolutePath, {
              splitPages: true,
              parsedItemSeparator: "\n\n",
            })
            docs = await loader.load()
            
            // IMPORTANT: Normalize source paths to prevent production issues
            // PDFLoader sets source to absolute path, but we only want the filename
            docs = docs.map(doc => ({
              ...doc,
              metadata: {
                ...doc.metadata,
                source: filename, // Use only filename, not full path
                originalPath: doc.metadata.source // Keep original for debugging if needed
              }
            }))
            
            console.log(`✅ PDFLoader successfully processed ${docs.length} pages with normalized paths`)
          } catch (pdfError) {
            console.error("❌ PDFLoader failed:", pdfError.message)
            throw new Error(`Failed to process PDF: ${pdfError.message}`)
          }
          break

        case "docx":
          try {
            console.log("🔧 Processing DOCX file...")
            const result = await mammoth.extractRawText({ path: absolutePath })
            const content = result.value

            if (!content || content.trim().length === 0) {
              throw new Error("No text content found in DOCX file")
            }

            docs = [
              new Document({
                pageContent: content,
                metadata: { source: filename, page: 1 },
              }),
            ]
            console.log(`✅ DOCX processed successfully`)
          } catch (docxError) {
            console.error("❌ DOCX processing failed:", docxError.message)
            throw new Error(`Failed to process DOCX: ${docxError.message}`)
          }
          break

        case "doc":
          try {
            console.log("🔧 Processing DOC file (attempting DOCX compatibility)...")
            const result = await mammoth.extractRawText({ path: absolutePath })
            const content = result.value

            if (!content || content.trim().length === 0) {
              console.log("⚠️ No content from mammoth, trying manual text extraction...")
              const buffer = fs.readFileSync(absolutePath)
              const content = buffer.toString("utf8").replace(/[^\x20-\x7E\n\r]/g, " ")

              if (!content || content.trim().length < 50) {
                throw new Error("Unable to extract meaningful content from DOC file")
              }

              docs = [
                new Document({
                  pageContent: content,
                  metadata: { source: filename, page: 1 },
                }),
              ]
            } else {
              docs = [
                new Document({
                  pageContent: content,
                  metadata: { source: filename, page: 1 },
                }),
              ]
            }
            console.log(`✅ DOC processed successfully`)
          } catch (docError) {
            console.error("❌ DOC processing failed:", docError.message)
            throw new Error(`Failed to process DOC: ${docError.message}`)
          }
          break

        case "txt":
        case "md":
          try {
            console.log(`🔧 Processing ${fileType.toUpperCase()} file...`)
            const content = fs.readFileSync(absolutePath, "utf8")

            if (!content || content.trim().length === 0) {
              throw new Error(`No text content found in ${fileType.toUpperCase()} file`)
            }

            docs = [
              new Document({
                pageContent: content,
                metadata: { source: filename, page: 1 },
              }),
            ]
            console.log(`✅ ${fileType.toUpperCase()} processed successfully`)
          } catch (txtError) {
            console.error(`❌ ${fileType.toUpperCase()} processing failed:`, txtError.message)
            throw new Error(`Failed to process ${fileType.toUpperCase()}: ${txtError.message}`)
          }
          break

        case "rtf":
          try {
            console.log("🔧 Processing RTF file...")
            const buffer = fs.readFileSync(absolutePath)
            const content = this.cleanRTFContent(buffer.toString("utf8"))

            if (!content || content.trim().length === 0) {
              throw new Error("No text content found in RTF file")
            }

            docs = [
              new Document({
                pageContent: content,
                metadata: { source: filename, page: 1 },
              }),
            ]
            console.log(`✅ RTF processed successfully`)
          } catch (rtfError) {
            console.error("❌ RTF processing failed:", rtfError.message)
            throw new Error(`Failed to process RTF: ${rtfError.message}`)
          }
          break

        case "csv":
          try {
            console.log("🔧 Processing CSV file...")
            const content = fs.readFileSync(absolutePath, "utf8")
            const lines = content.split("\n").filter((line) => line.trim())

            if (lines.length === 0) {
              throw new Error("No content found in CSV file")
            }

            // Convert CSV to readable text format
            const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
            const textContent = lines
              .slice(1)
              .map((line, index) => {
                const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
                return headers
                  .map((header, i) => `${header}: ${values[i] || ""}`)
                  .filter((item) => item.split(": ")[1])
                  .join(", ")
              })
              .filter((line) => line.length > 0)
              .join("\n")

            docs = [
              new Document({
                pageContent: `CSV Data:\n${textContent}`,
                metadata: { source: filename, page: 1, rows: lines.length - 1 },
              }),
            ]
            console.log(`✅ CSV processed successfully (${lines.length - 1} rows)`)
          } catch (csvError) {
            console.error("❌ CSV processing failed:", csvError.message)
            throw new Error(`Failed to process CSV: ${csvError.message}`)
          }
          break

        default:
          throw new Error(`Unsupported file type: ${fileType}`)
      }

      // Validate loaded documents
      if (!docs || docs.length === 0) {
        throw new Error(`No documents were loaded from ${fileType.toUpperCase()} file`)
      }

      // Filter out empty documents
      docs = docs.filter((doc) => doc.pageContent && doc.pageContent.trim().length > 0)

      if (docs.length === 0) {
        throw new Error(`All loaded documents were empty for ${fileType.toUpperCase()} file`)
      }

      console.log(`✅ Successfully loaded ${docs.length} document(s) from ${filename}`)
      return docs
    } catch (error) {
      console.error(`❌ Error loading document ${filename}:`, error.message)
      throw error
    }
  }

  // Update document status in Supabase database
  async updateDocumentStatus(documentId, processed = true) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const { error } = await supabase
        .from("documents")
        .update({ processed: processed })
        .eq("documentId", documentId)

      if (error) {
        console.error("Failed to update document status in Supabase:", error)
        throw error
      }

      console.log(`✅ Document ${documentId} marked as processed in database`)
    } catch (error) {
      console.error("Error updating document status:", error)
      throw error
    }
  }

  // Update processing status via API with enhanced retry logic
  async updateStatus(jobId, status, progress, error = null) {
    const maxRetries = 3
    let retries = 0

    while (retries < maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

  const response = await fetch(`${process.env.DOCUMENT_SERVER_URL}/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, status, progress, error }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          return
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (fetchError) {
        retries++
        if (retries === maxRetries) {
          console.error(`Failed to update status after ${maxRetries} retries:`, fetchError.message)
        } else {
          console.log(`Status update failed, retrying (${retries}/${maxRetries})...`)
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
        }
      }
    }
  }

  // Store chunks in vector database with batch processing
  async storeInVectorDatabase(chunks, jobId, job = null) {
    const batchSize = 25
    let processedChunks = 0
    const startTime = Date.now()

    try {
      // Try to connect to existing collection with timeout
      console.log(`📚 Connecting to vector database...`)
      
      const vectorStore = await Promise.race([
        QdrantVectorStore.fromExistingCollection(this.embeddings, {
          client: this.client,
          collectionName: "node-js-docs",
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Vector store connection timeout (30s)`)), 30000)
        ),
      ])

      console.log(`📚 Connected to vector database successfully`)

      // Process in batches with progress updates
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)

        try {
          // Add timeout to batch processing
          await Promise.race([
            vectorStore.addDocuments(batch),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Batch processing timeout (60s)`)), 60000)
            ),
          ])
          
          processedChunks += batch.length

          // Calculate progress between 50% and 85%
          const progress = 50 + Math.floor((processedChunks / chunks.length) * 35)
          await this.updateStatus(jobId, "processing", progress)
          if (job) await job.updateProgress(progress)

          console.log(`📚 Stored ${processedChunks}/${chunks.length} chunks (${progress}%)`)

          // Small delay between batches to prevent overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (batchError) {
          console.error(`❌ Error storing batch ${i}-${i + batchSize}:`, batchError.message)
          
          // Try to recover by creating a new collection if this batch fails
          if (batchError.message.includes('timeout') || batchError.message.includes('connection')) {
            console.log(`🔄 Attempting to recover from batch error...`)
            await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds
            // Don't throw immediately, try next batch
            continue
          } else {
            throw batchError
          }
        }
      }

      const storageTime = Date.now() - startTime
      console.log(`📚 Successfully stored ${chunks.length} chunks in vector database (${storageTime}ms)`)
    } catch (error) {
      if (error.message.includes("Collection") && error.message.includes("not found")) {
        // Collection doesn't exist, create new one
        console.log("🆕 Creating new vector collection...")
        
        try {
          const vectorStore = await Promise.race([
            QdrantVectorStore.fromDocuments(chunks, this.embeddings, {
              client: this.client,
              collectionName: "node-js-docs",
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Collection creation timeout (120s)`)), 120000)
            ),
          ])
          
          console.log(`🎉 Created new collection with ${chunks.length} chunks`)
          
          // Update progress to 85% after successful creation
          await this.updateStatus(jobId, "processing", 85)
          if (job) await job.updateProgress(85)
        } catch (creationError) {
          console.error(`❌ Failed to create new collection:`, creationError.message)
          throw new Error(`Vector database error: ${creationError.message}`)
        }
      } else {
        console.error(`❌ Vector database storage failed:`, error.message)
        throw new Error(`Vector database error: ${error.message}`)
      }
    }
  }

  // [Include loadDocument, updateDocumentStatus, and other helper methods from original worker.js]
  // ... (keeping existing methods for brevity)

  // Enhanced processing statistics
  generateProcessingStats(filename, docs, chunks, processingTime, jobId) {
    const contentAnalysis = {
      total_definitions: chunks.filter(c => c.metadata.contentType === 'definition').length,
      total_examples: chunks.filter(c => c.metadata.contentType === 'example').length,
      total_procedures: chunks.filter(c => c.metadata.contentType === 'procedure').length,
      avg_semantic_density: chunks.reduce((sum, c) => sum + (c.metadata.semanticDensity || 0), 0) / chunks.length,
      avg_readability: chunks.reduce((sum, c) => sum + (c.metadata.readabilityScore || 0), 0) / chunks.length,
      technical_terms_found: chunks.reduce((sum, c) => sum + (c.metadata.technicalTerms?.length || 0), 0)
    }

    return {
      filename,
      document_analysis: {
        total_pages: docs.length,
        total_chunks: chunks.length,
        avg_chunk_size: Math.round(chunks.reduce((sum, c) => sum + c.pageContent.length, 0) / chunks.length),
        content_types: chunks.reduce((acc, c) => {
          acc[c.metadata.contentType] = (acc[c.metadata.contentType] || 0) + 1
          return acc
        }, {}),
        ...contentAnalysis
      },
      performance_metrics: {
        processing_time_ms: processingTime,
        processing_time_human: `${Math.round(processingTime / 1000)}s`,
        cache_hit_ratio: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
        chunks_per_second: chunks.length / (processingTime / 1000),
        avg_embedding_time: this.metrics.embeddingTimes.length > 0 
          ? this.metrics.embeddingTimes.reduce((a, b) => a + b) / this.metrics.embeddingTimes.length 
          : 0
      },
      quality_metrics: {
        high_quality_chunks: chunks.filter(c => c.metadata.semanticDensity > 0.5).length,
        structured_content_ratio: chunks.filter(c => c.metadata.structureScore > 0).length / chunks.length,
        avg_technical_terms_per_chunk: contentAnalysis.technical_terms_found / chunks.length
      },
      processing_metadata: {
        job_id: jobId,
        timestamp: new Date().toISOString(),
        processor_version: "2.0.0-optimized",
        caching_enabled: true
      }
    }
  }

  // Store chunks in vector database with optimization
  async storeInVectorDatabase(chunks, jobId) {
    try {
      console.log(`📚 Storing ${chunks.length} chunks in vector database...`)
      
      const vectorStore = await QdrantVectorStore.fromExistingCollection(this.embeddings, {
        client: this.client,
        collectionName: "node-js-docs",
      })

      // Store in smaller batches for better performance
      const batchSize = 20
      let processed = 0

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        
        try {
          await vectorStore.addDocuments(batch)
          processed += batch.length
          
          const progress = 70 + Math.floor((processed / chunks.length) * 20)
          await this.updateStatus(jobId, "processing", progress)
          
          console.log(`📚 Stored batch ${Math.ceil((i + 1) / batchSize)}/${Math.ceil(chunks.length / batchSize)}`)
          
          // Brief pause between batches
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (batchError) {
          console.error(`❌ Batch storage error:`, batchError)
          throw batchError
        }
      }

      console.log(`✅ Successfully stored ${chunks.length} chunks`)
    } catch (error) {
      if (error.message.includes("Collection") && error.message.includes("not found")) {
        console.log("🆕 Creating new collection...")
        const vectorStore = await QdrantVectorStore.fromDocuments(chunks, this.embeddings, {
          client: this.client,
          collectionName: "node-js-docs",
        })
        console.log(`🎉 Created new collection with ${chunks.length} chunks`)
      } else {
        throw error
      }
    }
  }

  // Graceful shutdown with cache cleanup
  async shutdown() {
    console.log("🛑 Shutting down optimized processor...")
    await this.cache.close()
    console.log("✅ Shutdown complete")
  }

  // PRODUCTION: Clean up uploaded file after processing
  async cleanupUploadedFile(filePath) {
    try {
      const fs = await import('fs')
      
      // Check if file exists before trying to delete
      await fs.promises.access(filePath)
      await fs.promises.unlink(filePath)
      
      console.log(`🗑️ PRODUCTION: Cleaned up uploaded file: ${filePath}`)
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`📄 File already removed: ${filePath}`)
      } else {
        console.warn(`⚠️ Could not clean up uploaded file: ${filePath}`, error.message)
        // Don't throw - this shouldn't fail the processing
      }
    }
  }
}

// Enhanced worker with optimization settings
const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    console.log(`🔄 Processing optimized job: ${job.id}`)
    
    try {
      // job.data is already an object, no need to JSON.parse()
      const data = job.data
      const processor = new OptimizedDocumentProcessor()

      await job.updateProgress(5)
      const stats = await processor.processDocument(
        data.path, 
        data.filename, 
        data.jobId, 
        data.documentId,
        data.fileType || 'pdf',
        job // Pass the job instance for progress updates
      )

      await job.updateProgress(100)
      console.log(`✅ Optimized job ${job.id} completed successfully`)
      return stats
    } catch (error) {
      console.error(`❌ Optimized job ${job.id} failed:`, error.message)
      
      // Update status to failed in the database
      try {
        const processor = new OptimizedDocumentProcessor()
        await processor.updateStatus(job.data.jobId, "failed", 0, error.message)
      } catch (statusError) {
        console.error(`❌ Failed to update job status:`, statusError.message)
      }
      
      throw error
    }
  },
  {
    concurrency: 2, // Increased concurrency with caching
    connection: (() => {
      if (process.env.REDIS_URL) {
        // Parse the Redis URL for Upstash
        const url = new URL(process.env.REDIS_URL)
        return {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          username: url.username || 'default',
          password: url.password,
          tls: url.protocol === 'rediss:' ? {} : undefined,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
        }
      } else {
        // Fallback to local Redis
        return {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        }
      }
    })(),
    settings: {
      stalledInterval: 60 * 1000, // Check for stalled jobs every 1 minute
      maxStalledCount: 1, // Retry only once if job is stalled
    },
    defaultJobOptions: {
      attempts: 2, // Reduced attempts to prevent infinite retry loops
      backoff: {
        type: "exponential",
        delay: 5000, // Increased delay between retries
      },
      removeOnComplete: 10, // Keep more completed jobs for debugging
      removeOnFail: 5,
      timeout: 10 * 60 * 1000, // Reduced timeout to 10 minutes
    },
  },
)

// Enhanced event handlers
worker.on("completed", async (job, result) => {
  console.log(`🎉 Optimized job ${job.id} completed`)
  console.log(`📊 Performance:`, {
    filename: result?.filename,
    chunks: result?.document_analysis?.total_chunks,
    processingTime: result?.performance_metrics?.processing_time_human,
    cacheHitRatio: `${(result?.performance_metrics?.cache_hit_ratio * 100 || 0).toFixed(1)}%`
  })
})

worker.on("failed", async (job, err) => {
  console.error(`💥 Optimized job ${job?.id} failed:`, err.message)
  
  // Update status to failed in the database
  try {
    const processor = new OptimizedDocumentProcessor()
    await processor.updateStatus(job.data.jobId, "failed", 0, err.message)
  } catch (statusError) {
    console.error(`❌ Failed to update job status:`, statusError.message)
  }
})

worker.on("stalled", async (job) => {
  console.warn(`⏳ Job ${job.id} has stalled, will be retried`)
  
  // Update status to indicate job is being retried
  try {
    const processor = new OptimizedDocumentProcessor()
    await processor.updateStatus(job.data.jobId, "processing", 0, "Job stalled, retrying...")
  } catch (statusError) {
    console.error(`❌ Failed to update stalled job status:`, statusError.message)
  }
})

worker.on("progress", (job, progress) => {
  console.log(`📈 Job ${job.id} progress: ${progress}%`)
})

worker.on("error", (err) => {
  console.error(`❌ Worker error:`, err.message)
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, shutting down optimized worker...`)
  try {
    await worker.close()
    console.log("✅ Optimized worker shut down successfully")
    process.exit(0)
  } catch (error) {
    console.error("❌ Shutdown error:", error)
    process.exit(1)
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))

console.log("🚀 Optimized document processor started")
console.log("📊 Optimizations enabled:")
console.log("   - Redis caching for embeddings and chunks")
console.log("   - Intelligent chunk sizing and quality filtering")
console.log("   - Advanced semantic analysis and ranking")
console.log("   - Batch processing with progress tracking")
console.log("   - Performance metrics and monitoring")
console.log("⏳ Ready for optimized processing...")
