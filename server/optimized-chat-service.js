import { OpenAIEmbeddings } from "@langchain/openai"
import { QdrantVectorStore } from "@langchain/qdrant"
import { QdrantClient } from "@qdrant/js-client-rest"
import OpenAI from "openai"
import CacheManager from './cache-manager.js'
import EnhancedPromptManager from './prompt-manager.js'

// Enhanced chat endpoint with comprehensive optimization
class OptimizedChatService {
  constructor() {
    this.cache = new CacheManager()
    this.promptManager = new EnhancedPromptManager()
    
    this.embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_KEY,
      batchSize: 50,
      maxRetries: 3,
    })

    this.qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY
    })
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 150000, // 2.5 minutes timeout for complex queries
      maxRetries: 2, // Retry failed requests
    })

    // Performance tracking
    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      avgResponseTime: 0,
      responseTimes: [],
      errorRate: 0,
      errors: 0
    }

    console.log("🚀 Optimized Chat Service initialized")
  }

  // Enhanced context retrieval with intelligent caching and ranking - IMPROVED FOR COMPREHENSIVE ANSWERS
  async getOptimizedContext(query, topK = 20, documentId = null) { // Increased default topK for more context
    const startTime = Date.now()
    
    try {
      // Check cache for recent similar queries (include documentId in cache key)
      const cacheKey = documentId ? `${query}|doc:${documentId}` : query
      const cachedResult = await this.cache.getCachedQueryResult(cacheKey)
      if (cachedResult && cachedResult.contextDocs) {
        // Validate that cached documents have content
        const hasValidContent = cachedResult.contextDocs.some(doc => 
          doc.pageContent && doc.pageContent.trim().length > 10
        )
        
        if (hasValidContent) {
          this.metrics.cacheHits++
          console.log(`📦 Cache HIT: Query context retrieved in ${Date.now() - startTime}ms`)
          return cachedResult.contextDocs
        } else {
          console.warn(`🔄 Cache contains invalid documents, bypassing cache for query: "${query.substring(0, 50)}..."`)
        }
      }

      // Enhanced query embedding with comprehensive semantic enrichment
      let queryEmbedding = await this.cache.getCachedEmbedding(query)
      if (!queryEmbedding) {
        // Multi-level query enhancement for better semantic matching
        const enhancedQuery = this.enhanceQueryForEmbedding(query)
        const semanticVariations = this.generateSemanticVariations(query)
        const contextualQuery = this.addContextualTerms(query)
        
        // Combine all variations for richer embedding
        const combinedQuery = [enhancedQuery, ...semanticVariations.slice(0, 2), contextualQuery].join(' ')
        
        queryEmbedding = await this.embeddings.embedQuery(combinedQuery)
        await this.cache.cacheEmbedding(query, queryEmbedding)
        console.log(`🔍 Generated comprehensive embedding for: "${combinedQuery.substring(0, 100)}..."`)
      }

      // Connect to vector store with error handling for missing collection
      let vectorStore
      try {
        console.log(`🔌 Connecting to vector store (collection: node-js-docs)`)
        vectorStore = await QdrantVectorStore.fromExistingCollection(this.embeddings, {
          client: this.qdrantClient,
          collectionName: "node-js-docs",
        })
        console.log(`✅ Vector store connection successful`)
      } catch (collectionError) {
        console.error("❌ Vector collection connection failed:", collectionError.message)
        console.error("Full error:", collectionError)
        
        // Check if Qdrant is running
        try {
          const healthCheck = await fetch('http://localhost:6333/health')
          console.log(`🏥 Qdrant health check: ${healthCheck.status}`)
        } catch (healthError) {
          console.error("❌ Qdrant appears to be down:", healthError.message)
        }
        
        // Return empty result if no collection exists
        console.warn("⚠️ Returning empty context due to vector store issues")
        return []
      }

      // Advanced multi-strategy search for comprehensive content retrieval
      const queryLower = query.toLowerCase()
      const isSectionQuery = queryLower.includes('section') && queryLower.match(/section\s*\d+/i)
      const isLessonQuery = queryLower.includes('lesson') && queryLower.match(/lesson\s*\d+/i)
      const isSpecificQuery = isSectionQuery || isLessonQuery
      const isFinancialQuery = /liabilities|equity|revenue|assets|income|financial|balance|apple|cash|debt|comprehensive|stockholders|shareholders/i.test(query)
      
      let searchResults = []
      
      if (isSpecificQuery) {
        // Multi-target search for specific sections/lessons with increased coverage
        console.log(`🎯 Performing targeted search for specific content`)
        
        // Search 1: Exact query with higher limit
        const exactResults = await vectorStore.similaritySearch(query, Math.min(topK, 12), undefined)
        
        // Search 2: Enhanced semantic variations with broader coverage
        const variations = this.generateSemanticVariations(query)
        for (const variation of variations.slice(0, 5)) { // Increased from 3 to 5
          const varResults = await vectorStore.similaritySearch(variation, Math.min(8, topK), undefined)
          searchResults.push(...varResults)
        }
        
        // Search 3: Context-aware variations
        const contextualTerms = this.addContextualTerms(query)
        const contextResults = await vectorStore.similaritySearch(contextualTerms, Math.min(8, topK), undefined)
        
        searchResults.push(...exactResults, ...contextResults)
      } else if (isFinancialQuery) {
        // Enhanced financial query processing for comprehensive coverage
        console.log(`💰 Performing comprehensive financial document search`)
        
        // Strategy 1: Direct financial search with increased scope
        const directResults = await vectorStore.similaritySearch(query, Math.min(topK, 15), undefined)
        
        // Strategy 2: Financial keyword expansion
        const financialKeywords = this.extractFinancialKeywords(query)
        const keywordResults = await vectorStore.similaritySearch(financialKeywords, Math.min(12, topK), undefined)
        
        // Strategy 3: Related financial concepts
        const relatedConcepts = this.generateFinancialConcepts(query)
        const conceptResults = await vectorStore.similaritySearch(relatedConcepts, Math.min(10, topK), undefined)
        
        // Strategy 4: Broad financial context
        const contextQuery = this.addFinancialContext(query)
        const contextResults = await vectorStore.similaritySearch(contextQuery, Math.min(8, topK), undefined)
        
        searchResults = [...directResults, ...keywordResults, ...conceptResults, ...contextResults]
      } else {
        // Enhanced general search with multiple comprehensive strategies
        console.log(`🔍 Performing comprehensive multi-strategy search`)
        
        // Strategy 1: Direct semantic search with increased scope
        const directResults = await vectorStore.similaritySearch(query, Math.min(topK, 15), undefined)
        
        // Strategy 2: Keyword-enhanced search with broader terms
        const keywordQuery = this.extractKeywordsForSearch(query)
        const keywordResults = await vectorStore.similaritySearch(keywordQuery, Math.min(12, topK), undefined)
        
        // Strategy 3: Context-aware search with related terms
        const contextQuery = this.addContextualTerms(query)
        const contextResults = await vectorStore.similaritySearch(contextQuery, Math.min(10, topK), undefined)
        
        // Strategy 4: Semantic variations for broader coverage
        const variations = this.generateSemanticVariations(query)
        const variationResults = []
        for (const variation of variations.slice(0, 3)) {
          const varResults = await vectorStore.similaritySearch(variation, Math.min(6, topK), undefined)
          variationResults.push(...varResults)
        }
        
        searchResults = [...directResults, ...keywordResults, ...contextResults, ...variationResults]
      }
      
      let similarityDocs, keywordDocs, recentDocs
      
      if (isSectionQuery) {
        console.log(`🎯 Detected section query, using targeted search`)
        const sectionMatch = queryLower.match(/section\s*(\d+)/i)
        if (sectionMatch) {
          const sectionNumber = sectionMatch[1]
          console.log(`🔍 Searching specifically for Section ${sectionNumber}`)
          
          // Use multiple search strategies for sections
          const [sectionResults1, sectionResults2, sectionResults3] = await Promise.all([
            vectorStore.similaritySearch(`Section ${sectionNumber}`, topK),
            vectorStore.similaritySearch(`section ${sectionNumber}`, topK),
            vectorStore.similaritySearch(query, topK)
          ])
          
          // Combine and prioritize exact section matches
          similarityDocs = [...sectionResults1, ...sectionResults2, ...sectionResults3]
          keywordDocs = await this.performKeywordSearch(vectorStore, `section ${sectionNumber}`, Math.floor(topK / 2))
          recentDocs = []
        }
      } else {
        // Enhanced retrieval with comprehensive multi-strategy approach
        console.log(`🔍 Performing comprehensive enhanced search`)
        
        const [simDocs, keyDocs, recDocs] = await Promise.all([
          // Primary similarity search - significantly increased for comprehensive coverage
          vectorStore.similaritySearch(query, topK * 4), // Increased from topK * 3
          
          // Keyword-based search for exact matches with broader scope
          this.performKeywordSearch(vectorStore, query, Math.floor(topK * 1.5)),
          
          // Recent document search (if metadata available)
          this.getRecentDocuments(vectorStore, Math.floor(topK / 4))
        ])
        
        similarityDocs = simDocs
        keywordDocs = keyDocs
        recentDocs = recDocs
        
        // Enhanced fallback searches for comprehensive coverage
        if (isFinancialQuery && (similarityDocs.length + keywordDocs.length) < 8) {
          console.log(`💰 Running comprehensive financial fallback search`)
          
          // Comprehensive financial search terms
          const fallbackTerms = [
            'apple', 'balance sheet', 'financial', 'income', 'revenue', 'assets', 'liabilities',
            'shareholders equity', 'cash flow', 'comprehensive income', 'stockholders',
            'current assets', 'long term debt', 'net income', 'operating income'
          ]
          for (const term of fallbackTerms) {
            try {
              const fallbackResults = await vectorStore.similaritySearch(term, 6)
              similarityDocs.push(...fallbackResults)
            } catch (err) {
              console.warn(`Fallback search failed for "${term}":`, err.message)
            }
          }
        }
        
        // Add comprehensive context-aware search for all queries
        console.log(`📚 Adding comprehensive context-aware search`)
        try {
          // Multi-level context searches for thorough coverage
          const contextSearchTerms = [
            query.split(' ').slice(0, 3).join(' '), // First 3 words
            query.split(' ').slice(-3).join(' '),   // Last 3 words
            query.split(' ').slice(1, -1).join(' '), // Middle portion
            this.extractKeywordsForSearch(query),    // Key terms
            this.addContextualTerms(query)           // Related context
          ]
          
          for (const term of contextSearchTerms) {
            if (term && term.trim().length > 2) {
              const contextResults = await vectorStore.similaritySearch(term, 5)
              similarityDocs.push(...contextResults)
            }
          }
        } catch (err) {
          console.warn(`Context-aware search failed:`, err.message)
        }
      }

      console.log(`🔍 Retrieval results: Similarity: ${similarityDocs.length}, Keywords: ${keywordDocs.length}, Recent: ${recentDocs.length}`)

      // Apply document filtering if documentId is specified
      let filteredSimilarityDocs = similarityDocs
      let filteredKeywordDocs = keywordDocs
      let filteredRecentDocs = recentDocs

      if (documentId) {
        console.log(`🔍 Applying document filter for ID: ${documentId}`)
        
        // Debug: Log some sample metadata to understand the structure
        if (similarityDocs.length > 0) {
          console.log(`📋 Sample metadata from first doc:`, JSON.stringify(similarityDocs[0].metadata, null, 2))
        }
        
        // We need to find documents by their original filename since documentId is likely 
        // the original name while vector store uses timestamped filenames
        // First, try to get the original filename from the frontend
        // The documentId passed from frontend is actually the original filename
        
        const isDocumentMatch = (doc) => {
          const metadata = doc.metadata || {}
          const source = metadata.source || ''
          
          // Clean up the documentId for comparison (remove any path separators)
          const cleanDocumentId = documentId.replace(/^.*[\\\/]/, '').trim()
          const cleanSource = source.replace(/^.*[\\\/]/, '').trim()
          
          // PRODUCTION-READY matching - only match by filename, not paths
          // This ensures it works regardless of server environment or upload folder structure
          let matches = false
          
          // Direct filename matching (this should work now that we normalize sources in worker)
          if (cleanSource === cleanDocumentId) {
            matches = true
          } else if (metadata.originalName === cleanDocumentId) {
            matches = true
          } else if (metadata.filename === cleanDocumentId) {
            matches = true
          } else {
            // Fallback: Handle timestamp prefix removal for older processed documents
            const sourceWithoutTimestamp = cleanSource.replace(/^\d+-\d+-/, '')
            if (sourceWithoutTimestamp === cleanDocumentId) {
              matches = true
            }
          }
          
          // Additional validation: ensure the document actually contains processed content
          // and isn't just a file match from local storage
          if (matches) {
            const hasValidContent = doc.pageContent && doc.pageContent.trim().length > 50
            const hasValidMetadata = metadata.chunkIndex !== undefined || metadata.page !== undefined
            
            if (!hasValidContent || !hasValidMetadata) {
              console.log(`❌ Document match rejected: "${source}" - insufficient content or metadata`)
              return false
            }
            
            console.log(`✅ Document match confirmed: "${cleanSource}" matches "${cleanDocumentId}"`)
          }
          
          return matches
        }
        
        // Filter documents based on documentId in metadata
        filteredSimilarityDocs = similarityDocs.filter(isDocumentMatch)
        filteredKeywordDocs = keywordDocs.filter(isDocumentMatch)
        filteredRecentDocs = recentDocs.filter(isDocumentMatch)

        console.log(`📄 Filtered results: Similarity: ${filteredSimilarityDocs.length}, Keywords: ${filteredKeywordDocs.length}, Recent: ${filteredRecentDocs.length}`)
        
        // If no documents match the filter, log all available metadata for debugging
        if (filteredSimilarityDocs.length === 0 && filteredKeywordDocs.length === 0 && filteredRecentDocs.length === 0) {
          console.log(`❌ No documents matched filter "${documentId}". Available sources:`)
          const allDocs = [...similarityDocs, ...keywordDocs, ...recentDocs]
          allDocs.slice(0, 5).forEach((doc, i) => {
            console.log(`Doc ${i + 1} source: "${doc.metadata?.source || 'N/A'}"`)
          })
        }
      }

      // Combine and deduplicate results with preference for better page numbers
      const combinedDocs = this.combineAndRankResults(
        filteredSimilarityDocs, 
        filteredKeywordDocs, 
        filteredRecentDocs, 
        query
      )

      // Enhanced relevance scoring with balanced page distribution
      const scoredDocs = combinedDocs.map(doc => {
        const baseScore = this.calculateEnhancedRelevanceScore(doc.pageContent, query, doc.metadata)
        
        // Balanced page scoring - don't penalize any page
        let pageBonus = 0
        const pageNum = doc.metadata?.page || doc.metadata?.loc?.pageNumber
        
        // Give small bonus for having valid page information, regardless of page number
        if (pageNum && pageNum > 0) {
          pageBonus = 0.5 // Small bonus for any valid page
        }
        
        // Log page distribution for debugging
        console.log(`📄 Document page ${pageNum}: score ${baseScore.toFixed(2)} + bonus ${pageBonus}`)
        
        return {
          ...doc,
          relevanceScore: baseScore + pageBonus,
          retrievalMethod: this.identifyRetrievalMethod(doc, similarityDocs, keywordDocs, recentDocs)
        }
      })

      // Final ranking and filtering with improved relevance for financial content
      const optimizedDocs = scoredDocs
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, topK)
        .filter(doc => {
          const score = doc.relevanceScore || 0
          const queryLower = query.toLowerCase()
          const contentLower = doc.pageContent.toLowerCase()
          
          // Extract key terms from the query to match against content
          const queryTerms = queryLower
            .split(/\s+/)
            .filter(word => word.length > 2 && !['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'give', 'me', 'all', 'show'].includes(word))
          
          // Smart filtering based on query content
          if (contentLower.length < 15) {
            return false // Filter out very short content
          }
          
          // Special handling for financial queries - be more lenient
          const isFinancialQuery = /liabilities|equity|revenue|assets|income|financial|balance|apple|cash|debt|comprehensive|stockholders|shareholders/i.test(query)
          if (isFinancialQuery) {
            // For financial queries, include documents with any relevant financial terms
            const hasFinancialContent = /liabilities|equity|revenue|assets|income|balance|cash|debt|apple|comprehensive|stockholders|shareholders|million|billion|dollars|\$|current|total|net/i.test(contentLower)
            if (hasFinancialContent) {
              console.log(`💰 Including financial content (score: ${score.toFixed(2)})`)
              return true
            }
          }
          
          // Check for specific section numbers if mentioned in query
          const sectionMatch = queryLower.match(/section\s*(\d+)/i)
          if (sectionMatch) {
            const sectionNumber = sectionMatch[1]
            if (contentLower.includes(`section ${sectionNumber}`) || contentLower.includes(`section${sectionNumber}`)) {
              console.log(`✅ Found exact section ${sectionNumber} match (score: ${score.toFixed(2)})`)
              return true // Always include exact section matches
            }
          }
          
          // Check for specific lesson numbers if mentioned in query
          const lessonMatch = queryLower.match(/lesson\s*(\d+)/i)
          if (lessonMatch) {
            const lessonNumber = lessonMatch[1]
            if (contentLower.includes(`lesson ${lessonNumber}`) || contentLower.includes(`lesson${lessonNumber}`)) {
              console.log(`✅ Found exact lesson ${lessonNumber} match (score: ${score.toFixed(2)})`)
              return true // Always include exact lesson matches
            }
          }
          
          // Check for content relevance to query terms
          const relevantTerms = queryTerms.filter(term => contentLower.includes(term))
          const termRelevanceRatio = relevantTerms.length / Math.max(queryTerms.length, 1)
          
          // Dynamic threshold based on query type and content
          let scoreThreshold = 1.0 // Default threshold
          let relevanceThreshold = 0.15 // Default relevance threshold
          
          // Lower thresholds for educational/document queries
          const isEducationalQuery = queryLower.includes('section') || queryLower.includes('lesson') || 
                                    queryLower.includes('content') || queryLower.includes('give me') ||
                                    queryLower.includes('show me') || queryLower.includes('what') ||
                                    queryLower.includes('how') || queryLower.includes('explain')
          
          if (isEducationalQuery) {
            scoreThreshold = 0.5 // More lenient for educational queries
            relevanceThreshold = 0.1 // More lenient relevance threshold
          }
          
          // Apply filtering
          if (score < scoreThreshold) {
            console.log(`🚫 Document filtered: low score ${score.toFixed(2)} < ${scoreThreshold}`)
            return false
          }
          
          if (termRelevanceRatio < relevanceThreshold) {
            console.log(`🚫 Document filtered: low relevance ${(termRelevanceRatio * 100).toFixed(1)}% < ${(relevanceThreshold * 100).toFixed(1)}%`)
            return false
          }
          
          console.log(`✅ Document included: score ${score.toFixed(2)}, relevance ${(termRelevanceRatio * 100).toFixed(1)}%, page ${doc.metadata?.page || 'unknown'}`)
          return true
        })

      // Ensure page diversity - prioritize getting content from multiple pages
      const pageDistribution = {}
      optimizedDocs.forEach(doc => {
        const page = doc.metadata?.page || doc.metadata?.loc?.pageNumber || 'unknown'
        pageDistribution[page] = (pageDistribution[page] || 0) + 1
      })
      
      console.log(`📊 Page distribution before balancing:`, pageDistribution)
      
      // If we have content from multiple pages, ensure balanced representation
      const pages = Object.keys(pageDistribution).filter(p => p !== 'unknown')
      if (pages.length > 1) {
        const balancedDocs = []
        const maxPerPage = Math.ceil(topK / pages.length)
        
        // First, ensure we get at least some content from each page
        pages.forEach(page => {
          const pageDocsCount = optimizedDocs.filter(doc => 
            (doc.metadata?.page || doc.metadata?.loc?.pageNumber) == page
          ).length
          
          const pageDocs = optimizedDocs
            .filter(doc => (doc.metadata?.page || doc.metadata?.loc?.pageNumber) == page)
            .slice(0, Math.max(1, Math.min(maxPerPage, pageDocsCount))) // At least 1 per page
            
          balancedDocs.push(...pageDocs)
          console.log(`📄 Including ${pageDocs.length} docs from page ${page}`)
        })
        
        // Fill remaining slots with highest scoring docs
        const remainingSlots = topK - balancedDocs.length
        if (remainingSlots > 0) {
          const remainingDocs = optimizedDocs
            .filter(doc => !balancedDocs.includes(doc))
            .slice(0, remainingSlots)
          balancedDocs.push(...remainingDocs)
        }
        
        // Update optimizedDocs with balanced selection
        optimizedDocs.splice(0, optimizedDocs.length, ...balancedDocs.slice(0, topK))
      }
      
      const finalPageDistribution = {}
      optimizedDocs.forEach(doc => {
        const page = doc.metadata?.page || doc.metadata?.loc?.pageNumber || 'unknown'
        finalPageDistribution[page] = (finalPageDistribution[page] || 0) + 1
      })
      
      console.log(`📊 Final page distribution:`, finalPageDistribution)

      // Cache the results (use the cache key that includes documentId)
      await this.cache.cacheQueryResult(cacheKey, "context_retrieved", optimizedDocs)

      const retrievalTime = Date.now() - startTime
      console.log(`🔍 Context retrieved: ${optimizedDocs.length} docs in ${retrievalTime}ms`)
      
      if (optimizedDocs.length > 0) {
        console.log(`📄 First doc sample: "${optimizedDocs[0].pageContent.substring(0, 200)}..."`)
        console.log(`🎯 Relevance scores: ${optimizedDocs.map(d => d.relevanceScore?.toFixed(2) || 'N/A').join(', ')}`)
      } else {
        console.warn("⚠️ No documents found in context retrieval")
      }
      
      return optimizedDocs

    } catch (error) {
      console.error("❌ Context retrieval error:", error)
      throw new Error(`Context retrieval failed: ${error.message}`)
    }
  }

  // Advanced keyword search for exact term matching - enhanced for financial documents
  async performKeywordSearch(vectorStore, query, limit) {
    try {
      const queryLower = query.toLowerCase()
      
      // Special handling for financial terms and calculations
      let keywords = []
      const isFinancialQuery = /liabilities|equity|revenue|assets|income|financial|balance|apple|cash|debt/i.test(query)
      const isSectionQuery = queryLower.includes('section') && queryLower.match(/section\s*\d+/i)
      
      if (isFinancialQuery) {
        console.log("💰 Detected financial query, using financial keyword extraction")
        
        const financialTerms = [
          'liabilities', 'shareholders equity', 'stockholders equity', 'revenue', 'assets',
          'current assets', 'cash', 'debt', 'apple inc', 'balance sheet', 'income statement',
          'net income', 'operating income', 'gross margin', 'total revenue', 'current liabilities',
          'long-term debt', 'retained earnings', 'comprehensive income', 'accounts payable',
          'accounts receivable', 'inventory', 'property plant equipment', 'goodwill',
          'intangible assets', 'deferred tax', 'common stock', 'accumulated other comprehensive'
        ]
        
        // Extract financial keywords from query
        keywords = financialTerms.filter(term => 
          queryLower.includes(term.toLowerCase()) || 
          term.toLowerCase().split(' ').some(word => queryLower.includes(word))
        )
        
        // Add individual words from financial query
        const queryWords = queryLower.split(/\s+/).filter(word => 
          word.length > 3 && 
          !['give', 'show', 'tell', 'about', 'information', 'what', 'where', 'when'].includes(word)
        )
        keywords.push(...queryWords.slice(0, 5))
        
        // Remove duplicates and limit
        keywords = [...new Set(keywords)].slice(0, 8)
      } else if (isSectionQuery) {
        // For section queries, prioritize section-specific keywords
        const sectionMatch = queryLower.match(/section\s*(\d+)[:\s]*(.+)?/i)
        if (sectionMatch) {
          const sectionNumber = sectionMatch[1]
          const sectionTitle = sectionMatch[2]?.trim()
          
          keywords.push(`section ${sectionNumber}`)
          keywords.push(`section${sectionNumber}`)
          
          if (sectionTitle) {
            // Add keywords from section title
            const titleWords = sectionTitle.split(/\s+/).filter(word => 
              word.length > 3 && !['and', 'the', 'for', 'with'].includes(word)
            )
            keywords.push(...titleWords.slice(0, 3))
          }
        }
      } else {
        // Enhanced keyword extraction for general queries
        keywords = queryLower
          .split(/\s+/)
          .filter(word => {
            return word.length > 2 && 
                   word.length < 30 && 
                   !/[^\w\s]/.test(word) && 
                   !['what', 'where', 'when', 'which', 'also', 'tell', 'about', 'give', 'show', 'information'].includes(word)
          })
          .slice(0, 6) // Increased for better coverage
      }

      if (keywords.length === 0) {
        console.log("📝 No valid keywords found for search")
        return []
      }

      console.log(`🔍 Searching with ${keywords.length} keywords: [${keywords.join(', ')}]`)
      const keywordResults = []
      
      for (const keyword of keywords) {
        try {
          const results = await vectorStore.similaritySearch(keyword, Math.ceil(limit / Math.max(keywords.length, 1)))
          keywordResults.push(...results.map(doc => ({
            ...doc,
            matchedKeyword: keyword,
            keywordRelevance: this.calculateKeywordRelevance(doc.pageContent, keyword)
          })))
        } catch (err) {
          console.warn(`Keyword search failed for "${keyword}":`, err.message)
        }
      }

      // Remove duplicates and sort by relevance
      const uniqueResults = this.removeDuplicateDocuments(keywordResults)
      return uniqueResults
        .sort((a, b) => (b.keywordRelevance || 0) - (a.keywordRelevance || 0))
        .slice(0, limit)

    } catch (error) {
      console.warn("Keyword search failed:", error.message)
      return []
    }
  }

  // Remove duplicate documents based on content similarity
  removeDuplicateDocuments(docs) {
    const seen = new Set()
    const uniqueDocs = []

    for (const doc of docs) {
      const contentHash = this.createContentHash(doc.pageContent)
      if (!seen.has(contentHash)) {
        seen.add(contentHash)
        uniqueDocs.push(doc)
      }
    }

    return uniqueDocs
  }

  // Get recent documents (if timestamp metadata is available)
  async getRecentDocuments(vectorStore, limit) {
    try {
      // This would require metadata filtering in Qdrant
      // For now, return empty array as fallback
      return []
    } catch (error) {
      console.warn("Recent document search failed:", error.message)
      return []
    }
  }

  // Intelligent result combination and deduplication
  combineAndRankResults(similarityDocs, keywordDocs, recentDocs, query) {
    const allDocs = [...similarityDocs, ...keywordDocs, ...recentDocs]
    const seen = new Set()
    const uniqueDocs = []

    for (const doc of allDocs) {
      // Create a hash for deduplication
      const contentHash = this.createContentHash(doc.pageContent)
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash)
        uniqueDocs.push(doc)
      }
    }

    return uniqueDocs;
  }

  // Create content hash for deduplication
  createContentHash(content) {
    return content.substring(0, 100).replace(/\s+/g, '').toLowerCase()
  }

  // Enhanced relevance scoring with multiple factors
  calculateEnhancedRelevanceScore(content, query, metadata = {}) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0)
    const contentLower = content.toLowerCase()
    let score = 0

    // Base term frequency scoring
    queryWords.forEach(word => {
      // Skip empty words and escape special regex characters
      if (!word || word.length < 2) return
      
      try {
        // Escape special regex characters
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi')
        const matches = content.match(regex) || []
        score += matches.length * 0.5
      } catch (regexError) {
        console.warn(`⚠️ Regex error for word "${word}":`, regexError.message)
        // Fallback to simple string matching
        const simpleMatches = contentLower.split(word.toLowerCase()).length - 1
        score += simpleMatches * 0.25
      }
    })

    // Special handling for section queries
    const queryLower = query.toLowerCase()
    if (queryLower.includes('section') && queryLower.match(/section\s*\d+/i)) {
      const sectionMatch = queryLower.match(/section\s*(\d+)/i)
      if (sectionMatch) {
        const sectionNumber = sectionMatch[1]
        // Massive boost for exact section matches
        if (contentLower.includes(`section ${sectionNumber}`) || contentLower.includes(`section${sectionNumber}`)) {
          score += 10 // High priority for section matches
        }
        
        // Boost for lesson content within the section
        if (contentLower.includes('lesson') && contentLower.includes(`section ${sectionNumber}`)) {
          score += 5
        }
      }
    }

    // Boost for exact phrase matches
    if (contentLower.includes(query.toLowerCase())) {
      score += 3
    }

    // Boost for content type relevance
    const contentType = metadata.contentType || 'general'
    const queryType = this.promptManager.classifyQuery(query)
    if (contentType === queryType) {
      score += 2
    }

    // Boost for structured content
    if (metadata.structureScore > 1) {
      score += 1
    }

    // Boost for high semantic density
    if (metadata.semanticDensity > 0.6) {
      score += 1
    }

    // Boost for technical terms matching
    if (metadata.technicalTerms && metadata.technicalTerms.length > 0) {
      const queryHasTechnicalTerms = queryWords.some(word =>
        metadata.technicalTerms.some(term => term.toLowerCase().includes(word))
      )
      if (queryHasTechnicalTerms) {
        score += 1.5
      }
    }

    // Length bonus (up to a point)
    const lengthBonus = Math.min(content.length / 1000, 2)
    score += lengthBonus

    // Readability penalty for very low readability
    if (metadata.readabilityScore && metadata.readabilityScore < 0.3) {
      score -= 0.5
    }

    return Math.max(0, score)
  }

  // Calculate keyword-specific relevance
  calculateKeywordRelevance(content, keyword) {
    const contentLower = content.toLowerCase()
    const keywordLower = keyword.toLowerCase()
    
    let score = 0
    
    // Skip empty or very short keywords
    if (!keyword || keyword.length < 2) {
      return 0
    }
    
    try {
      // Exact keyword matches with escaped regex
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const exactMatches = content.match(new RegExp(`\\b${escapedKeyword}\\b`, 'gi')) || []
      score += exactMatches.length * 2
    } catch (regexError) {
      console.warn(`⚠️ Regex error for keyword "${keyword}":`, regexError.message)
      // Fallback to simple string matching
      const simpleMatches = contentLower.split(keywordLower).length - 1
      score += simpleMatches * 1
    }

    // Partial matches
    if (contentLower.includes(keywordLower)) {
      score += 1
    }

    // Position bonus (keyword appearing early)
    const firstIndex = contentLower.indexOf(keywordLower)
    if (firstIndex >= 0 && firstIndex < 200) {
      score += 1
    }

    return score
  }

  // Identify which retrieval method found the document
  identifyRetrievalMethod(doc, similarityDocs, keywordDocs, recentDocs) {
    if (similarityDocs.some(d => d.pageContent === doc.pageContent)) return 'similarity'
    if (keywordDocs.some(d => d.pageContent === doc.pageContent)) return 'keyword'
    if (recentDocs.some(d => d.pageContent === doc.pageContent)) return 'recent'
    return 'unknown'
  }

  // Enhanced query processing for better embedding - improved for financial documents
  enhanceQueryForEmbedding(query) {
    let enhanced = query
    
    // Add context for technical terms
    enhanced = enhanced.replace(/\bnode\.?js\b/gi, 'Node.js JavaScript runtime server-side')
    enhanced = enhanced.replace(/\bsocket\.?io\b/gi, 'Socket.io real-time websocket communication')
    enhanced = enhanced.replace(/\bexpress\b/gi, 'Express.js web framework server')
    enhanced = enhanced.replace(/\bapi\b/gi, 'API application programming interface')
    
    // Add context for financial terms and Apple-specific content
    enhanced = enhanced.replace(/\bliabilities\b/gi, 'liabilities debt obligations financial statements')
    enhanced = enhanced.replace(/\bshareholders.?equity\b/gi, 'shareholders equity stockholders equity capital')
    enhanced = enhanced.replace(/\brevenue\b/gi, 'revenue income sales net sales total revenue')
    enhanced = enhanced.replace(/\bapple inc\b/gi, 'Apple Inc company corporation financial statements')
    enhanced = enhanced.replace(/\bassets\b/gi, 'assets current assets total assets balance sheet')
    enhanced = enhanced.replace(/\bcash\b/gi, 'cash cash equivalents liquid assets')
    enhanced = enhanced.replace(/\bbalance sheet\b/gi, 'balance sheet financial position statement')
    enhanced = enhanced.replace(/\bincome statement\b/gi, 'income statement profit loss earnings')
    enhanced = enhanced.replace(/\bnet income\b/gi, 'net income profit earnings after tax')
    enhanced = enhanced.replace(/\bgross margin\b/gi, 'gross margin gross profit margin')
    enhanced = enhanced.replace(/\boperating income\b/gi, 'operating income operating profit EBIT')
    
    // Add educational context
    if (/section\s+\d+/i.test(query)) {
      enhanced += ' educational content lesson tutorial'
    }
    if (/lesson\s+\d+/i.test(query)) {
      enhanced += ' educational content section tutorial'
    }
    
    // Add financial context for financial queries
    if (/liabilities|equity|revenue|assets|income|financial|balance|apple/i.test(query)) {
      enhanced += ' financial statements balance sheet income statement'
    }
    
    return enhanced
  }

  // Generate semantic variations for better matching - enhanced for financial content
  generateSemanticVariations(query) {
    const variations = []
    const queryLower = query.toLowerCase()
    
    // For financial queries
    if (/liabilities|equity|revenue|assets|income|financial|balance|apple/i.test(query)) {
      if (queryLower.includes('liabilities')) {
        variations.push(
          query.replace(/liabilities/gi, 'debt'),
          query.replace(/liabilities/gi, 'obligations'),
          query + ' current liabilities long-term debt',
          'balance sheet liabilities section'
        )
      }
      if (queryLower.includes('equity')) {
        variations.push(
          query.replace(/equity/gi, 'shareholders equity'),
          query.replace(/equity/gi, 'stockholders equity'),
          query + ' retained earnings capital',
          'balance sheet equity section'
        )
      }
      if (queryLower.includes('revenue')) {
        variations.push(
          query.replace(/revenue/gi, 'sales'),
          query.replace(/revenue/gi, 'income'),
          query + ' net revenue total revenue',
          'income statement revenue'
        )
      }
      if (queryLower.includes('assets')) {
        variations.push(
          query.replace(/assets/gi, 'current assets'),
          query.replace(/assets/gi, 'total assets'),
          query + ' cash inventory property',
          'balance sheet assets section'
        )
      }
      if (queryLower.includes('apple')) {
        variations.push(
          'Apple Inc financial statements',
          'Apple Inc balance sheet',
          'Apple Inc income statement',
          'Apple financial position'
        )
      }
    }
    
    // For section queries
    if (queryLower.includes('section')) {
      const sectionMatch = query.match(/section\s*(\d+)/i)
      if (sectionMatch) {
        const num = sectionMatch[1]
        variations.push(
          `section ${num} content`,
          `section ${num} lessons`,
          `chapter ${num}`,
          `part ${num}`,
          `unit ${num}`
        )
      }
    }
    
    // For lesson queries
    if (queryLower.includes('lesson')) {
      const lessonMatch = query.match(/lesson\s*(\d+)/i)
      if (lessonMatch) {
        const num = lessonMatch[1]
        variations.push(
          `lesson ${num} content`,
          `lesson ${num} tutorial`,
          `exercise ${num}`,
          `example ${num}`
        )
      }
    }
    
    // For content queries
    if (queryLower.includes('content')) {
      variations.push(
        query.replace('content', 'information'),
        query.replace('content', 'details'),
        query.replace('content', 'material')
      )
    }
    
    return variations
  }

  // Extract and enhance keywords for search
  extractKeywordsForSearch(query) {
    const keywords = []
    const queryLower = query.toLowerCase()
    
    // Extract technical terms
    const techTerms = queryLower.match(/\b(node\.?js|javascript|express|socket\.?io|api|server|module|function|class|method)\b/g)
    if (techTerms) keywords.push(...techTerms)
    
    // Extract educational terms
    const eduTerms = queryLower.match(/\b(section|lesson|chapter|exercise|example|tutorial)\b/g)
    if (eduTerms) keywords.push(...eduTerms)
    
    // Extract numbers
    const numbers = queryLower.match(/\b\d+\b/g)
    if (numbers) keywords.push(...numbers)
    
    // Combine with original query
    return `${query} ${keywords.join(' ')}`
  }

  // Add contextual terms based on query type
  addContextualTerms(query) {
    const queryLower = query.toLowerCase()
    let contextTerms = []
    
    // Add Node.js context
    if (/node|javascript|js/i.test(query)) {
      contextTerms.push('programming', 'development', 'server', 'backend')
    }
    
    // Add educational context
    if (/section|lesson|chapter/i.test(query)) {
      contextTerms.push('tutorial', 'learning', 'education', 'course')
    }
    
    // Add technical context
    if (/function|method|class|code/i.test(query)) {
      contextTerms.push('programming', 'syntax', 'implementation', 'example')
    }
    
    return `${query} ${contextTerms.join(' ')}`
  }

  // Extract financial keywords for enhanced search
  extractFinancialKeywords(query) {
    const queryLower = query.toLowerCase()
    const financialTerms = [
      'liabilities', 'shareholders equity', 'stockholders equity', 'revenue', 'assets',
      'current assets', 'cash', 'debt', 'apple inc', 'balance sheet', 'income statement',
      'net income', 'operating income', 'gross margin', 'total revenue', 'current liabilities',
      'long-term debt', 'retained earnings', 'comprehensive income', 'accounts payable',
      'accounts receivable', 'inventory', 'property plant equipment', 'goodwill',
      'intangible assets', 'deferred tax', 'common stock', 'accumulated other comprehensive'
    ]
    
    const relevantTerms = financialTerms.filter(term => 
      queryLower.includes(term.toLowerCase()) || 
      term.toLowerCase().split(' ').some(word => queryLower.includes(word))
    )
    
    // Add query words that seem financial
    const queryWords = queryLower.split(/\s+/).filter(word => 
      word.length > 3 && 
      /^[a-z]+$/i.test(word) &&
      !['give', 'show', 'tell', 'about', 'information', 'what', 'where', 'when'].includes(word)
    )
    
    const combinedTerms = [...relevantTerms, ...queryWords].slice(0, 10)
    return combinedTerms.join(' ')
  }

  // Generate related financial concepts for broader search
  generateFinancialConcepts(query) {
    const queryLower = query.toLowerCase()
    const concepts = []
    
    if (queryLower.includes('liabilities')) {
      concepts.push('debt obligations current liabilities long-term debt accounts payable')
    }
    if (queryLower.includes('equity')) {
      concepts.push('shareholders equity stockholders equity retained earnings common stock')
    }
    if (queryLower.includes('revenue')) {
      concepts.push('sales income net revenue total revenue operating revenue')
    }
    if (queryLower.includes('assets')) {
      concepts.push('current assets total assets cash inventory property equipment')
    }
    if (queryLower.includes('apple')) {
      concepts.push('Apple Inc company financial statements quarterly annual report')
    }
    
    return concepts.join(' ')
  }

  // Add financial context terms
  addFinancialContext(query) {
    const baseTerms = 'financial statements balance sheet income statement cash flow'
    const contextTerms = []
    
    if (/apple/i.test(query)) {
      contextTerms.push('Apple Inc company corporation')
    }
    if (/liabilities|equity|assets/i.test(query)) {
      contextTerms.push('balance sheet financial position')
    }
    if (/revenue|income/i.test(query)) {
      contextTerms.push('income statement profit loss earnings')
    }
    
    return `${query} ${baseTerms} ${contextTerms.join(' ')}`
  }

  // Validate if the query topic actually matches the document content
  validateQueryRelevance(query, contextDocs) {
    if (!contextDocs || contextDocs.length === 0) return false
    
    const queryLower = query.toLowerCase()
    
    // For ANY document-related query, be permissive
    const isDocumentQuery = queryLower.includes('section') || queryLower.includes('lesson') || 
                           queryLower.includes('content') || queryLower.includes('give me') ||
                           queryLower.includes('show me') || queryLower.includes('what') ||
                           queryLower.includes('how') || queryLower.includes('chapter') ||
                           queryLower.includes('part') || queryLower.includes('explain')
    
    if (isDocumentQuery) {
      console.log(`✅ Document query detected - using permissive validation`)
      
      // Quick check for ANY substantial content (very permissive)
      const hasContent = contextDocs.some(doc => {
        const content = (doc.pageContent || '').toLowerCase()
        return content.length > 20 // Just needs to have some content
      })
      
      if (hasContent) {
        console.log(`✅ Found substantial content - allowing query`)
        return true
      }
    }
    
    // For all other queries, use smart validation based on query terms
    const queryTerms = queryLower
      .split(/\s+/)
      .filter(word => {
        const stopWords = ['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'a', 'an']
        return word.length > 2 && !stopWords.includes(word)
      })
      .slice(0, 6) // Keep reasonable number for efficiency
    
    if (queryTerms.length === 0) return true // Allow general queries
    
    // Smart relevance check - look for query terms in document content
    let relevantCount = 0
    const sampleSize = Math.min(8, contextDocs.length) // Check more docs for better accuracy
    
    for (let i = 0; i < sampleSize; i++) {
      const content = (contextDocs[i].pageContent || '').toLowerCase()
      
      // Check if document contains any query terms
      const hasRelevantTerms = queryTerms.some(term => {
        // Also check for partial matches and related terms
        return content.includes(term) || 
               content.includes(term.substring(0, Math.max(4, term.length - 1))) // Partial match
      })
      
      if (hasRelevantTerms) relevantCount++
    }
    
    const relevanceRatio = relevantCount / sampleSize
    console.log(`🔍 Smart relevance check: ${(relevanceRatio * 100).toFixed(1)}% of docs relevant for terms: ${queryTerms.join(', ')}`)
    
    return relevanceRatio >= 0.25 // 25% threshold - balanced but permissive
  }

  // Extract the main topics from documents to provide helpful feedback
  extractDocumentTopics(contextDocs) {
    const topicCounts = new Map()
    
    contextDocs.forEach(doc => {
      const content = (doc.pageContent || '').toLowerCase()
      
      // Common technical/domain keywords to identify topics
      const topics = [
        'javascript', 'node', 'nodejs', 'programming', 'code', 'software', 'development',
        'human resource', 'management', 'hr', 'employee', 'business', 'organization',
        'marketing', 'strategy', 'customer', 'sales', 'brand',
        'finance', 'accounting', 'money', 'budget', 'financial',
        'education', 'learning', 'teaching', 'student', 'course',
        'health', 'medical', 'medicine', 'patient', 'treatment',
        'legal', 'law', 'contract', 'agreement', 'regulation',
        'science', 'research', 'study', 'analysis', 'data'
      ]
      
      topics.forEach(topic => {
        if (content.includes(topic)) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
        }
      })
    })
    
    // Get top 3 topics
    const sortedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, count]) => topic)
    
    return sortedTopics.length > 0 ? sortedTopics.join(', ') : 'various technical topics'
  }

  // Enhanced AI response generation with optimized prompts
  async generateOptimizedResponse(query, contextDocs) {
    const startTime = Date.now()

    try {
      // Debug: Log context information
      console.log(`🔍 Context Debug: Found ${contextDocs.length} documents`)
      if (contextDocs.length > 0) {
        console.log(`📄 First doc preview: "${contextDocs[0].pageContent.substring(0, 100)}..."`)
        console.log(`📊 Context docs metadata:`, contextDocs.map(d => ({
          length: d.pageContent?.length || 0,
          hasContent: !!d.pageContent?.trim(),
          source: d.metadata?.source || 'unknown'
        })))
      }

      // Validate that we have meaningful content
      const meaningfulDocs = contextDocs.filter(doc => 
        doc.pageContent && doc.pageContent.trim().length > 20
      )

      if (meaningfulDocs.length === 0) {
        console.warn("⚠️ No meaningful context found, returning early")
        throw new Error("No meaningful context available for this query")
      }

      // Generate optimized prompt
      const promptStartTime = Date.now()
      const promptData = await this.promptManager.generateOptimizedPrompt(query, meaningfulDocs)
      const promptTime = Date.now() - promptStartTime
      
      console.log(`🤖 Using ${promptData.queryType} prompt template (${promptData.contextLength} chars)`)
      console.log(`📝 Prompt generation took ${promptTime}ms`)
      console.log(`📝 System prompt preview: "${promptData.systemPrompt.substring(0, 100)}..."`)
      console.log(`💬 User prompt preview: "${promptData.userPrompt.substring(0, 200)}..."`)

      // Enhanced OpenAI call with optimized parameters for comprehensive responses
      console.log(`🔄 Starting OpenAI API call...`)
      const apiStartTime = Date.now()
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-5-mini-2025-08-07", // Efficient model for detailed responses
        messages: [
          { 
            role: "system", 
            content: promptData.systemPrompt 
          },
          { 
            role: "user", 
            content: promptData.userPrompt 
          }
        ],
        max_completion_tokens: 4600, // Significantly increased for comprehensive explanations
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        response_format: { type: "text" }
      })

      const apiTime = Date.now() - apiStartTime
      console.log(`✅ OpenAI API call completed in ${apiTime}ms`)

      const response = completion.choices[0].message.content
      const responseTime = Date.now() - startTime

      console.log(`📊 Performance breakdown:`)
      console.log(`   • Prompt generation: ${promptTime}ms`)
      console.log(`   • OpenAI API call: ${apiTime}ms`)
      console.log(`   • Total time: ${responseTime}ms`)
      console.log(`   • Response length: ${response.length} characters`)
      console.log(`   • Tokens used: ${completion.usage?.total_tokens || 'unknown'}`)

      // Track performance metrics
      await this.promptManager.trackPromptPerformance(
        query, 
        promptData.queryType, 
        responseTime, 
        response.length
      )

      console.log(`✅ Response generated in ${responseTime}ms (${response.length} chars)`)

      return {
        response,
        queryType: promptData.queryType,
        contextUsed: contextDocs.length,
        responseTime,
        usage: completion.usage,
        fromCache: promptData.fromCache
      }

    } catch (error) {
      console.error("❌ Response generation error:", error)
      throw new Error(`Response generation failed: ${error.message}`)
    }
  }

  // Main chat processing method with full optimization
  // Helper function to detect greetings and general conversation
  isGreetingOrGeneralQuery(query) {
    const lowerQuery = query.toLowerCase().trim()
    const greetings = [
      'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'whats up', "what's up", 'howdy', 'hiya', 'sup'
    ]
    
    const generalQueries = [
      'who are you', 'what are you', 'what can you do', 'help me', 'help',
      'what is this', 'how does this work', 'what is your name', 'introduce yourself'
    ]
    
    // Check if query is just a greeting or very general
    const isGreeting = greetings.some(greeting => lowerQuery === greeting || lowerQuery.startsWith(greeting + ' '))
    const isGeneral = generalQueries.some(general => lowerQuery.includes(general))
    
    return isGreeting || isGeneral || lowerQuery.length < 10
  }

  // Generate a friendly response for greetings and general queries
  generateFriendlyResponse(query) {
    const lowerQuery = query.toLowerCase().trim()
    
    if (lowerQuery.includes('hi') || lowerQuery.includes('hello') || lowerQuery.includes('hey')) {
      return `Hello! 👋 I'm your AI learning assistant, here to help you understand and explore the documents you've uploaded.

I can help you with:
• **Document Analysis** - Ask questions about specific content in your uploaded documents
• **Explanations** - Get detailed explanations of concepts from your materials
• **Examples** - Find practical examples and code snippets from your documents
• **Summaries** - Get summaries of specific topics or sections

**To get started, try asking:**
• "What is the main topic of this document?"
• "Explain [specific concept] from the uploaded material"
• "Show me examples of [topic] from the documents"
• "Summarize the key points about [subject]"

Please note: I can only answer questions based on the documents you've uploaded. If you haven't uploaded any documents yet, please use the upload section to add your learning materials first!

What would you like to learn about from your documents? 📚`
    }
    
    if (lowerQuery.includes('how are you')) {
      return `I'm doing great, thank you for asking! 😊 

I'm your AI learning assistant, ready to help you explore and understand your uploaded documents. I'm here whenever you need help analyzing your learning materials, explaining concepts, or finding specific information.

What would you like to learn about from your documents today?`
    }
    
    if (lowerQuery.includes('who are you') || lowerQuery.includes('what are you')) {
      return `I'm your AI-powered learning assistant! 🤖📚

My purpose is to help you:
• Understand and analyze your uploaded documents
• Answer questions based on your learning materials
• Provide explanations and examples from your documents
• Help you study more effectively

I work best when you ask specific questions about the content in your uploaded documents. Try asking me about concepts, definitions, or examples from your materials!

What would you like to explore from your documents?`
    }
    
    // Default friendly response for other general queries
    return `Hi there! 👋 I'm your AI learning assistant, specialized in helping you understand and explore your uploaded documents.

I can assist you with questions about:
• Content analysis and explanations
• Finding specific information in your documents
• Providing examples and detailed breakdowns
• Summarizing key concepts

**Important:** I can only answer questions based on the documents you've uploaded to the system. If you haven't uploaded any documents yet, please use the upload section first.

Feel free to ask me anything about your learning materials! What would you like to know? 📖✨`
  }

  // Generate system message based on response mode and depth
  getSystemMessage(responseMode, responseDepth) {
    const baseMessage = "You are a helpful document-based educational assistant. When documents contain relevant information about the user's question, provide comprehensive answers with proper page references [Reference X - Page Y]. When documents don't contain relevant information, clearly explain what you cannot find and what the documents actually cover instead."
    
    if (responseMode === 'professional') {
      return `${baseMessage} 

PROFESSIONAL MODE INSTRUCTIONS:
- When documents are relevant: Structure responses with clear sections: Document Analysis, Key Insights, and Industry Applications  
- When documents are not relevant: Explain the topic mismatch professionally
- Always include proper page references [Reference X - Page Y] for relevant information
- Be thorough when answering relevant questions, honest when documents don't match the query`
    }
    
    return `${baseMessage} Provide comprehensive answers when documents are relevant, clear explanations when they're not. Always include proper page citations.`
  }

  // Enhanced prompt generation with comprehensive instructions
  generateEnhancedPrompt(query, contextDocs, responseMode, responseDepth) {
    // Build enriched document context
    const documentContext = contextDocs.map((doc, index) => {
      // Enhanced page number logic
      let pageInfo;
      const originalSource = doc.metadata?.source || '';
      
      if (originalSource.toLowerCase().includes('.pdf')) {
        pageInfo = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || 'Unknown';
      } else if (originalSource.toLowerCase().includes('.docx')) {
        pageInfo = doc.metadata?.page || 'Unknown';
        if (pageInfo === 1 && doc.metadata?.chunkIndex !== undefined) {
          pageInfo = Math.max(1, Math.floor(doc.metadata.chunkIndex / 3) + 1);
        }
      } else {
        pageInfo = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || doc.metadata?.page || 'Unknown';
      }
      
      let cleanDocumentName = 'Document';
      if (doc.metadata?.source) {
        const source = doc.metadata.source;
        const filename = source.split(/[\\\/]/).pop() || 'Document';
        cleanDocumentName = filename.replace(/^\d+-\d+-/, '').replace(/\.[^.]+$/, '') || 'Document';
      }
      
      // Add semantic context indicators
      const contentType = doc.metadata?.isEducationalContent ? ' [Educational Content]' : 
                         doc.metadata?.contentType === 'technical' ? ' [Technical Content]' : '';
      
      return `[Reference ${index + 1} - Page ${pageInfo} - ${cleanDocumentName}${contentType}]:
${doc.pageContent}

---`;
    }).join('\n');

    // Enhanced base requirements
    const baseRequirements = `
🎯 CORE ANALYSIS PRINCIPLES:
• Extract and utilize ALL relevant information from the provided documents
• Provide comprehensive, educational responses when documents contain relevant content
• Use clear structure with appropriate headings and subheadings
• Include [Reference X - Page Y] citations for every piece of information
• Maintain accuracy by staying strictly within document content
• Be thorough and complete when documents are relevant to the query`;

    // Professional mode with advanced structure
    if (responseMode === 'professional') {
      return `You are a senior educational consultant and document analyst. Your expertise lies in extracting comprehensive information from technical and educational documents to provide thorough, well-structured responses.

🎯 USER QUESTION: "${query}"

📄 DOCUMENT CONTENT WITH REFERENCES:
${documentContext}

${baseRequirements}

🏢 PROFESSIONAL ANALYSIS FRAMEWORK:
When documents contain relevant information, structure your response as:

## 📋 Document Analysis Overview
[Comprehensive summary of what the documents reveal about the topic]

## 🔍 Detailed Findings
[In-depth analysis with specific details, examples, and explanations from documents]

## 🎓 Educational Context
[How this information fits into broader learning objectives and applications]

## 💡 Key Insights & Best Practices
[Important takeaways and practical recommendations based on document content]

## 📚 Summary & Implementation
[Consolidated key points with actionable guidance from the documents]

⚠️ CRITICAL: All insights must be derived exclusively from the provided document content.`;
    }

    // Enhanced standard mode with intelligent query analysis
    const queryLower = query.toLowerCase();
    const isListRequest = queryLower.includes('all') && (queryLower.includes('lesson') || queryLower.includes('section') || queryLower.includes('names'));
    const isSpecificContentRequest = queryLower.match(/section\s*\d+/i) || queryLower.match(/lesson\s*\d+/i);
    const isExplanationRequest = queryLower.includes('what') || queryLower.includes('how') || queryLower.includes('explain');
    const isEducationalQuery = queryLower.includes('section') || queryLower.includes('lesson') || queryLower.includes('content');

    return `You are an expert AI document assistant specializing in comprehensive content extraction and educational support.

🎯 USER QUESTION: "${query}"

📄 DOCUMENT CONTENT WITH REFERENCES:
${documentContext}

${baseRequirements}

🧠 INTELLIGENT RESPONSE STRATEGY:

${isListRequest ? `
📋 COMPREHENSIVE LIST REQUEST DETECTED
• User wants a complete inventory of items (lessons, sections, names, etc.)
• Scan ALL documents thoroughly and systematically
• Extract every relevant item mentioned in the documents
• Present as well-organized lists with clear numbering/bullets
• Include brief descriptions or details for each item where available
• Be exhaustive - ensure no relevant items are missed

RESPONSE FORMAT:
1. Clear heading describing what list you're providing
2. Comprehensive numbered or bulleted list
3. Brief descriptions for each item when available in documents
4. Page references for each item [Reference X - Page Y]
` : isSpecificContentRequest ? `
🎯 SPECIFIC CONTENT EXTRACTION REQUEST
• User is asking for detailed content about a particular section/lesson
• Focus exclusively on the requested section/lesson number
• Extract ALL available information about this specific item
• Include explanations, examples, sub-topics, and details
• Provide comprehensive coverage of the requested content

RESPONSE FORMAT:
1. Clear heading with the specific section/lesson title
2. Complete content extraction with full details
3. Organized sub-sections if the content has structure
4. Examples and explanations where provided in documents
5. Comprehensive page references [Reference X - Page Y]
` : isExplanationRequest ? `
💡 DETAILED EXPLANATION REQUEST
• User wants comprehensive understanding of concepts/topics
• Extract all relevant explanatory content from documents
• Provide thorough educational explanations
• Include definitions, examples, and practical applications
• Structure for maximum clarity and understanding

RESPONSE FORMAT:
1. Clear conceptual overview
2. Detailed explanations based on document content
3. Examples and practical applications from documents
4. Step-by-step breakdowns where applicable
5. Comprehensive citations [Reference X - Page Y]
` : isEducationalQuery ? `
📚 EDUCATIONAL CONTENT REQUEST
• User is seeking educational/learning material from documents
• Extract comprehensive educational content related to the query
• Provide thorough, well-structured educational responses
• Include all relevant learning materials and examples
• Maintain educational quality and completeness

RESPONSE FORMAT:
1. Educational overview of the topic
2. Detailed content extraction with clear structure
3. Learning objectives and key points from documents
4. Examples and practical applications
5. Complete citations [Reference X - Page Y]
` : `
📝 GENERAL INFORMATION REQUEST
• Analyze documents for content relevant to the user's question
• Provide comprehensive answers when relevant information exists
• Extract all pertinent details and explanations
• Structure responses clearly and logically
• Maintain accuracy and thoroughness

RESPONSE FORMAT:
1. Direct response to the user's question
2. Comprehensive information from documents
3. Clear organization with appropriate headings
4. Complete details and explanations
5. Proper citations [Reference X - Page Y]
`}

⚠️ EXECUTION STANDARDS:
• START DIRECTLY with the requested information (avoid unnecessary disclaimers)
• EXTRACT ALL relevant information comprehensively
• ORGANIZE content with clear, descriptive headings
• INCLUDE complete details, examples, and explanations where available
• CITE every piece of information with [Reference X - Page Y]
• MAINTAIN educational quality and thoroughness throughout
• ENSURE responses are complete and leave no relevant information unused

  generateEnhancedPrompt(query, contextDocs, responseMode, responseDepth) {
    const documentContext = contextDocs.map((doc, index) => {
      let pageInfo;
      const originalSource = doc.metadata?.source || '';
      
      if (originalSource.toLowerCase().includes('.pdf')) {
        pageInfo = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || 'Unknown';
      } else if (originalSource.toLowerCase().includes('.docx')) {
        pageInfo = doc.metadata?.page || 'Unknown';
        if (pageInfo === 1 && doc.metadata?.chunkIndex !== undefined) {
          pageInfo = Math.max(1, Math.floor(doc.metadata.chunkIndex / 3) + 1);
        }
      } else {
        pageInfo = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || doc.metadata?.page || 'Unknown';
      }
      
      let cleanDocumentName = 'Document';
      if (doc.metadata?.source) {
        const source = doc.metadata.source;
        const filename = source.split(/[\\\/]/).pop() || 'Document';
        cleanDocumentName = filename.replace(/^\d+-\d+-/, '').replace(/\.[^.]+$/, '') || 'Document';
      }
      
      const referenceHeader = '[Reference ' + (index + 1) + ' - Page ' + pageInfo + ' - ' + cleanDocumentName + ']:';
      return referenceHeader + '\n' + doc.pageContent + '\n\n---';
    }).join('\n');

    const coreRequirements = [
      'Extract and utilize ALL relevant information from the provided documents',
      'Provide comprehensive, educational responses when documents contain relevant content',
      'Use clear structure with appropriate headings and subheadings',
      'Include [Reference X - Page Y] citations for every piece of information',
      'Maintain accuracy by staying strictly within document content',
      'Be thorough and complete when documents are relevant to the query'
    ].join('\n• ');

    const queryLower = query.toLowerCase();
    const isListRequest = queryLower.includes('all') && (queryLower.includes('lesson') || queryLower.includes('section'));
    const isSpecificRequest = queryLower.match(/section\s*\d+/i) || queryLower.match(/lesson\s*\d+/i);
    const isEducationalQuery = queryLower.includes('section') || queryLower.includes('lesson') || queryLower.includes('content');

    let responseStrategy = 'GENERAL REQUEST: Analyze documents for relevant information and provide comprehensive answers when content is available.';
    if (isListRequest) {
      responseStrategy = 'LIST REQUEST: Extract and organize all requested items comprehensively. Present as well-organized lists with descriptions where available.';
    } else if (isSpecificRequest) {
      responseStrategy = 'SPECIFIC CONTENT REQUEST: Focus on the exact section/lesson requested. Extract ALL available information with complete details.';
    } else if (isEducationalQuery) {
      responseStrategy = 'EDUCATIONAL REQUEST: Provide comprehensive educational content with thorough explanations and examples.';
    }

    const executionStandards = [
      'Start directly with requested information (avoid unnecessary disclaimers)',
      'Extract ALL relevant information comprehensively',
      'Use clear, descriptive headings for organization',
      'Include complete details and examples where available',
      'Cite every piece of information with [Reference X - Page Y]',
      'Ensure responses are complete and educationally valuable'
    ].join('\n• ');

    const promptContent = [
      'You are an expert AI document assistant specializing in comprehensive content extraction and educational support.',
      '',
      'Question: "' + query + '"',
      '',
      'Document content with references:',
      documentContext,
      '',
      'CORE ANALYSIS PRINCIPLES:',
      '• ' + coreRequirements,
      '',
      'RESPONSE STRATEGY:',
      responseStrategy,
      '',
      'EXECUTION STANDARDS:',
      '• ' + executionStandards
    ].join('\n');

    return promptContent;
  }

  async processQuery(query, options = {}) {
${documentContext}

${baseRequirements}

RESPONSE STRATEGY:
${isEducationalQuery ? `
� EDUCATIONAL QUERY DETECTED: The user is asking for specific educational content.

IMPORTANT INSTRUCTIONS:
• The provided documents CONTAIN relevant educational content about the requested topic
• Extract and present ALL relevant information from the documents 
• Do NOT start with disclaimers like "I cannot find" or "The documents do not contain"
• Focus on delivering the content the user requested with confidence
• Organize the content clearly with proper headings and structure
• Include page references for all information used [Reference X - Page Y]

FOR SECTION/LESSON QUERIES:
• Extract all relevant lesson names, section content, and details from the documents
• If looking for specific lessons, provide detailed content for each requested lesson
• Structure the response with clear headings for each section/lesson
• Be comprehensive - include all relevant information found in the documents

RESPONSE FORMAT:
1. Start directly with the requested information (NO disclaimers)
2. Use clear headings for organization
3. Include all relevant content from the documents
4. Add proper page references [Reference X - Page Y]
5. Be thorough and educational in your response
` : `
1. Analyze if the document content contains information relevant to the user's question
2. If the documents contain relevant information: Provide a comprehensive, well-structured answer using that information  
3. If the documents contain NO relevant information: Clearly state what you cannot find and what the documents actually contain
`}
4. When answering relevant questions: Use clear headings, examples, and include page references for all information used

IMPORTANT: 
- When documents contain information about the topic asked (like Node.js, modules, etc.), provide thorough explanations using all relevant content
- When documents are about completely different topics than the question, be honest about the mismatch
- Structure your responses professionally with clear sections and proper citations`;
  }

  async processQuery(query, options = {}) {
    const overallStartTime = Date.now()
    this.metrics.totalQueries++

    try {
      console.log(`🔄 Processing optimized query: "${query.substring(0, 50)}..."`)
      
      // Extract options including response mode and document filter
      const { documentId, responseMode = 'standard', responseDepth = 'standard' } = options
      
      console.log(`📊 Response Mode: ${responseMode}, Depth: ${responseDepth}`)
      
      if (documentId) {
        console.log(`📄 Document filter applied: ${documentId}`)
      }

      // Input validation and preprocessing
      if (!query || query.trim().length === 0) {
        console.log("❌ Empty query provided")
        throw new Error("Query cannot be empty")
      }

      if (query.length > 1000) {
        console.log(`⚠️ Query too long, truncating from ${query.length} to 1000 chars`)
        query = query.substring(0, 1000) + "..."
      }

      // Handle greetings and general conversation
      if (this.isGreetingOrGeneralQuery(query)) {
        console.log(`👋 Detected greeting/general query: "${query}"`)
        const friendlyResponse = this.generateFriendlyResponse(query)
        
        return {
          message: friendlyResponse,
          docs: [],
          query,
          contextSections: 0,
          fromCache: false,
          isGreeting: true,
          suggestions: [
            "Upload a document to get started",
            "Ask about specific topics in your documents",
            "Try: 'What is the main concept in this document?'",
            "Try: 'Explain [topic] from the uploaded material'"
          ]
        }
      }

      // Enhanced context retrieval
      console.log(`🔍 Starting context retrieval for query: "${query.substring(0, 30)}..."`)
      
      let contextDocs
      try {
        // Increase the number of documents to get more variety
        const topK = documentId ? 15 : 8  // More docs when filtering by document to find varied pages
        contextDocs = await this.getOptimizedContext(query, topK, documentId)
        console.log(`✅ Context retrieval successful: ${contextDocs.length} documents found`)
      } catch (contextError) {
        console.error(`❌ Context retrieval failed:`, contextError)
        
        // Return a helpful error message instead of throwing
        return {
          error: "Context retrieval failed",
          details: `Unable to search documents: ${contextError.message}`,
          query,
          suggestions: [
            "Check if the vector database is running",
            "Verify that documents have been processed",
            "Try a simpler query",
            "Check server logs for more details"
          ],
          contextSections: 0,
          fromCache: false
        }
      }

      console.log(`🔍 DEBUG: Context retrieval complete. Found ${contextDocs.length} documents`)
      
      if (contextDocs.length === 0) {
        console.warn("⚠️ No relevant context documents found - query may be outside document scope")
        
        let noResultsMessage = `I couldn't find relevant information about "${query}" in the available documents.`
        
        if (documentId) {
          noResultsMessage += `\n\nI searched specifically within the selected document "${documentId}", but it doesn't appear to contain information related to your question.\n\n**Possible reasons:**\n• The selected document covers different topics than what you're asking about\n• Try rephrasing your question to match the document's content\n• Consider selecting a different document that might contain this information\n\n**Suggestion:** You can remove the document filter to search across all your uploaded materials, or upload documents that specifically cover the topic you're asking about.`
        } else {
          noResultsMessage += `\n\n**This could mean:**\n• Your uploaded documents don't contain information about this specific topic\n• The question is outside the scope of your document collection\n• You might need to upload documents that cover this subject area\n\n**Suggestion:** Try asking questions that relate to the topics actually covered in your uploaded documents.`
        }
        
        return {
          message: noResultsMessage,
          docs: [],
          query,
          contextSections: 0,
          fromCache: false,
          suggestions: [
            "Upload a document first using the upload section",
            "Wait for document processing to complete",
            "Try rephrasing your question",
            "Use simpler or more specific keywords"
          ]
        }
      }

      // DEBUG: Log actual context content
      console.log(`📄 Context preview: "${contextDocs[0]?.pageContent?.substring(0, 300) || 'No content'}..."`)

      // CRITICAL: Validate topic relevance before generating response
      // But be very permissive for educational/document queries
      const queryLower = query.toLowerCase()
      const isEducationalQuery = queryLower.includes('section') || queryLower.includes('lesson') || 
                                queryLower.includes('document') || queryLower.includes('content') ||
                                queryLower.includes('give me') || queryLower.includes('show me') ||
                                queryLower.includes('chapter') || queryLower.includes('part')
      
      let isQueryRelevant = true // Default to allowing queries
      
      if (!isEducationalQuery) {
        // Only validate relevance for non-educational queries
        isQueryRelevant = this.validateQueryRelevance(query, contextDocs)
      } else {
        console.log(`✅ Educational query detected - skipping strict relevance validation`)
      }
      
      if (!isQueryRelevant) {
        console.warn("⚠️ Query topic does not match document content - preventing irrelevant response")
        
        // Extract main topic from documents to provide helpful feedback
        const documentTopics = this.extractDocumentTopics(contextDocs)
        
        let mismatchMessage = `I cannot find information about "${query}" in the provided documents.`
        
        if (documentId) {
          mismatchMessage += `\n\nThe selected document "${documentId}" appears to focus on: **${documentTopics}**\n\nYour question is about a different topic. Please:\n• Ask questions related to the actual content of this document\n• Select a different document that covers the topic you're asking about\n• Upload documents that specifically contain information about "${query}"`
        } else {
          mismatchMessage += `\n\nYour uploaded documents appear to focus on: **${documentTopics}**\n\nTo get answers about "${query}", you would need to:\n• Upload documents that specifically cover this topic\n• Ask questions related to the actual content of your uploaded documents`
        }
        
        return {
          message: mismatchMessage,
          docs: [],
          query,
          contextSections: 0,
          fromCache: false,
          topicMismatch: true
        }
      }

      // Generate response with enhanced prompt that includes page references
      const contextText = contextDocs.map(doc => doc.pageContent || '').join('\n\n')
      
      console.log(`📝 Total context length: ${contextText.length} characters`)

      if (!contextText.trim()) {
        console.error("❌ Context text is empty after joining!")
        return {
          message: "Found documents but they appear to be empty. This might be a processing issue.",
          docs: contextDocs,
          query,
          contextSections: contextDocs.length,
          fromCache: false
        }
      }

      // Create enhanced prompt based on response mode and depth
      const enhancedPrompt = this.generateEnhancedPrompt(query, contextDocs, responseMode, responseDepth)

      console.log(`🤖 Sending ${responseMode} mode prompt to OpenAI (${enhancedPrompt.length} chars)`)

      let completion
      try {
        const systemMessage = this.getSystemMessage(responseMode, responseDepth)
        completion = await this.openai.chat.completions.create({
          model: "gpt-5-mini-2025-08-07",
          messages: [
            { 
              role: "system", 
              content: systemMessage 
            },
            { 
              role: "user", 
              content: enhancedPrompt
            }
          ],
          // temperature: 0.1,
          max_completion_tokens: 3800, // Reduced for faster response
        })
        console.log(`✅ OpenAI response received: ${completion.choices[0].message.content.length} characters`)
      } catch (openaiError) {
        console.error(`❌ OpenAI API error:`, openaiError)
        
        // Return a helpful error message instead of throwing
        return {
          error: "AI response generation failed",
          details: `OpenAI API error: ${openaiError.message}`,
          query,
          suggestions: [
            "Check OpenAI API key configuration",
            "Verify API quota and billing",
            "Try again in a few moments",
            "Contact support if the issue persists"
          ],
          contextSections: contextDocs.length,
          fromCache: false
        }
      }

      const response = completion.choices[0].message.content

      // Calculate total processing time
      const totalTime = Date.now() - overallStartTime
      this.updatePerformanceMetrics(totalTime)

      // Enhanced result with page references and source information
      const result = {
        message: response,
        docs: contextDocs.map((doc, index) => {
          // Clean up the source information for production-ready display
          let cleanSource = 'Document';
          if (doc.metadata?.source) {
            const source = doc.metadata.source;
            // Extract just the filename, removing any path components and timestamps
            const filename = source.split(/[\\\/]/).pop() || 'Document';
            cleanSource = filename.replace(/^\d+-\d+-/, '').replace(/\.[^.]+$/, '') || 'Document';
          }
          
          // Fix: Prioritize correct page number sources based on file type
          let pageNumber;
          const originalSource = doc.metadata?.source || '';
          
          if (originalSource.toLowerCase().includes('.pdf')) {
            // For PDF files, use loc.pageNumber (this is the correct one)
            pageNumber = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || 'Unknown';
          } else if (originalSource.toLowerCase().includes('.docx')) {
            // For DOCX files, check if we have a proper page number or need to calculate
            pageNumber = doc.metadata?.page || 'Unknown';
            
            if (pageNumber === 1 && doc.metadata?.chunkIndex !== undefined) {
              // Estimate page based on chunk position (assuming ~3 chunks per page)
              const estimatedPage = Math.max(1, Math.floor(doc.metadata.chunkIndex / 3) + 1);
              pageNumber = estimatedPage;
            }
          } else {
            // For other file types, try different page number sources
            pageNumber = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || doc.metadata?.page || 'Unknown';
          }
          
          return {
            content: doc.pageContent,
            metadata: {
              ...doc.metadata,
              pageNumber: pageNumber,
              source: cleanSource, // Use clean source instead of full path
              referenceId: index + 1
            },
            score: doc.score || 0
          }
        }),
        query,
        contextSections: contextDocs.length,
        pageReferences: contextDocs.map((doc, index) => {
          // Clean up source for page references too
          // Clean up the source information for production-ready display
          let cleanSource = 'Document';
          if (doc.metadata?.source) {
            const source = doc.metadata.source;
            // Extract just the filename, removing any path components and timestamps
            const filename = source.split(/[\\\/]/).pop() || 'Document';
            cleanSource = filename.replace(/^\d+-\d+-/, '').replace(/\.[^.]+$/, '') || 'Document';
          }
          
          // Fix: Prioritize correct page number sources based on file type
          let pageNumber;
          const originalSource = doc.metadata?.source || '';
          
          if (originalSource.toLowerCase().includes('.pdf')) {
            // For PDF files, use loc.pageNumber (this is the correct one)
            pageNumber = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || 'Unknown';
            console.log(`📄 PDF page: Using loc.pageNumber=${doc.metadata?.loc?.pageNumber} for file ${cleanSource}`);
          } else if (originalSource.toLowerCase().includes('.docx')) {
            // For DOCX files, check if we have a proper page number or need to calculate
            pageNumber = doc.metadata?.page || 'Unknown';
            
            if (pageNumber === 1 && doc.metadata?.chunkIndex !== undefined) {
              console.log(`🔍 DOCX debug: originalSource="${originalSource}", cleanSource="${cleanSource}", pageNumber=${pageNumber}, chunkIndex=${doc.metadata?.chunkIndex}, metadata keys: ${Object.keys(doc.metadata || {}).join(',')}`);
              
              // Estimate page based on chunk position (assuming ~3 chunks per page)
              const estimatedPage = Math.max(1, Math.floor(doc.metadata.chunkIndex / 3) + 1);
              pageNumber = estimatedPage;
              console.log(`📄 DOCX runtime fix: chunk ${doc.metadata.chunkIndex} -> estimated page ${estimatedPage}`);
            }
          } else {
            // For other file types, try different page number sources
            pageNumber = doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber || doc.metadata?.page || 'Unknown';
          }
          
          // Debug: Log what we're sending
          console.log(`📤 Sending page reference ${index + 1}: Page ${pageNumber}, Source: ${cleanSource}`);
          
          return {
            referenceId: index + 1,
            pageNumber: pageNumber,
            source: cleanSource, // Use clean source
            preview: doc.pageContent.substring(0, 150) + '...'
          }
        }),
        fromCache: false,
        performance: {
          totalTime: totalTime,
          cacheHit: false,
          success: true
        },
        formatted: true
      }

      // Cache the result for future similar queries
      try {
        await this.cache.cacheQueryResult(query, response, contextDocs)
        console.log(`💾 Result cached successfully`)
      } catch (cacheError) {
        console.warn(`⚠️ Failed to cache result:`, cacheError.message)
        // Don't fail the request if caching fails
      }

      console.log(`🎯 Query processed successfully in ${totalTime}ms`)
      return result

    } catch (error) {
      this.metrics.errors++
      this.metrics.errorRate = this.metrics.errors / this.metrics.totalQueries
      
      console.error(`❌ Query processing failed:`, error)
      
      return {
        error: "Failed to process your question",
        details: error.message,
        query,
        suggestions: this.generateQuerySuggestions(query),
        performance: {
          totalTime: Date.now() - overallStartTime,
          success: false
        },
        formatted: true
      }
    }
  }

  // Generate helpful query suggestions
  generateQuerySuggestions(originalQuery) {
    const suggestions = []
    const words = originalQuery.toLowerCase().split(/\s+/)
    
    // Suggest simpler versions
    if (words.length > 5) {
      suggestions.push(`Try using fewer keywords: "${words.slice(0, 3).join(' ')}"`)
    }
    
    // Suggest different question types
    if (!originalQuery.includes('what') && !originalQuery.includes('how')) {
      suggestions.push(`Try: "What is ${words[0]}?" or "How does ${words[0]} work?"`)
    }
    
    // Suggest specific terms
    suggestions.push('Try using more specific technical terms')
    suggestions.push('Try asking about definitions, procedures, or examples')
    
    return suggestions.slice(0, 3)
  }

  // Update performance metrics
  updatePerformanceMetrics(responseTime) {
    this.metrics.responseTimes.push(responseTime)
    
    // Keep only last 100 response times for rolling average
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-100)
    }
    
    this.metrics.avgResponseTime = 
      this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.responseTimes.length
  }

  // Get service health and performance statistics
  async getServiceHealth() {
    const cacheHealth = await this.cache.healthCheck()
    const promptAnalytics = await this.promptManager.getPromptAnalytics()
    
    return {
      status: 'healthy',
      version: '2.0.0-optimized',
      uptime: process.uptime(),
      performance: {
        totalQueries: this.metrics.totalQueries,
        avgResponseTime: Math.round(this.metrics.avgResponseTime),
        cacheHitRatio: (this.metrics.cacheHits / Math.max(this.metrics.totalQueries, 1)) * 100,
        errorRate: this.metrics.errorRate * 100
      },
      cache: cacheHealth,
      prompts: promptAnalytics,
      timestamp: new Date().toISOString()
    }
  }

  // Shutdown method for graceful cleanup
  async shutdown() {
    console.log("🛑 Shutting down optimized chat service...")
    await this.cache.close()
    console.log("✅ Chat service shutdown complete")
  }
}

export default OptimizedChatService
