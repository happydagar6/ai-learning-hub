import Redis from 'ioredis'
import crypto from 'crypto'

class CacheManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    })

    // Cache expiration times (in seconds)
    this.TTL = {
      EMBEDDING: 60 * 60 * 24 * 7, // 7 days for embeddings
      QUERY_RESULT: 60 * 60 * 2,   // 2 hours for query results
      CONTEXT: 60 * 60 * 4,        // 4 hours for document context
      CHUNKS: 60 * 60 * 24 * 3,    // 3 days for processed chunks
      STATS: 60 * 30,              // 30 minutes for statistics
    }

    this.redis.on('error', (err) => {
      console.error('Redis Cache Error:', err)
    })

    this.redis.on('connect', () => {
      console.log('✅ Redis Cache connected successfully')
    })
  }

  // Health check method
  async ping() {
    try {
      await this.redis.ping()
      return true
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`)
    }
  }

  // Generate cache key for different data types
  generateKey(type, identifier) {
    const hash = crypto.createHash('md5').update(identifier.toString()).digest('hex')
    return `ai_learning:${type}:${hash}`
  }

  // Cache embeddings for text chunks
  async cacheEmbedding(text, embedding) {
    try {
      const key = this.generateKey('embedding', text)
      await this.redis.setex(key, this.TTL.EMBEDDING, JSON.stringify({
        embedding,
        text: text.substring(0, 100), // Store first 100 chars for debugging
        cached_at: new Date().toISOString(),
        size: embedding.length
      }))
      return key
    } catch (error) {
      console.error('Failed to cache embedding:', error)
      return null
    }
  }

  // Retrieve cached embedding
  async getCachedEmbedding(text) {
    try {
      const key = this.generateKey('embedding', text)
      const cached = await this.redis.get(key)
      if (cached) {
        const data = JSON.parse(cached)
        console.log(`📦 Cache HIT: Embedding (${data.size} dimensions)`)
        return data.embedding
      }
      console.log('📦 Cache MISS: Embedding')
      return null
    } catch (error) {
      console.error('Failed to retrieve cached embedding:', error)
      return null
    }
  }

  // Cache query results with context
  async cacheQueryResult(query, result, contextDocs) {
    try {
      const key = this.generateKey('query', query)
      const cacheData = {
        query,
        result,
        contextDocs: contextDocs.map(doc => ({
          content: doc.pageContent?.substring(0, 500), // First 500 chars
          metadata: doc.metadata,
          relevanceScore: doc.relevanceScore
        })),
        cached_at: new Date().toISOString(),
        context_count: contextDocs.length
      }
      
      await this.redis.setex(key, this.TTL.QUERY_RESULT, JSON.stringify(cacheData))
      console.log(`📦 Cached query result: "${query}" (${contextDocs.length} contexts)`)
      return key
    } catch (error) {
      console.error('Failed to cache query result:', error)
      return null
    }
  }

  // Retrieve cached query result
  async getCachedQueryResult(query) {
    try {
      const key = this.generateKey('query', query)
      const cached = await this.redis.get(key)
      if (cached) {
        const data = JSON.parse(cached)
        console.log(`📦 Cache HIT: Query "${query}" (${data.context_count} contexts)`)
        return {
          result: data.result,
          contextDocs: data.contextDocs,
          fromCache: true
        }
      }
      console.log(`📦 Cache MISS: Query "${query}"`)
      return null
    } catch (error) {
      console.error('Failed to retrieve cached query result:', error)
      return null
    }
  }

  // Cache processed document chunks
  async cacheDocumentChunks(documentId, chunks) {
    try {
      const key = this.generateKey('chunks', documentId)
      const cacheData = {
        documentId,
        chunks: chunks.map(chunk => ({
          content: chunk.pageContent,
          metadata: chunk.metadata,
          wordCount: chunk.metadata?.wordCount,
          contentType: chunk.metadata?.contentType
        })),
        cached_at: new Date().toISOString(),
        chunk_count: chunks.length
      }
      
      await this.redis.setex(key, this.TTL.CHUNKS, JSON.stringify(cacheData))
      console.log(`📦 Cached document chunks: ${documentId} (${chunks.length} chunks)`)
      return key
    } catch (error) {
      console.error('Failed to cache document chunks:', error)
      return null
    }
  }

  // Retrieve cached document chunks
  async getCachedDocumentChunks(documentId) {
    try {
      const key = this.generateKey('chunks', documentId)
      const cached = await this.redis.get(key)
      if (cached) {
        const data = JSON.parse(cached)
        console.log(`📦 Cache HIT: Document chunks ${documentId} (${data.chunk_count} chunks)`)
        return data.chunks
      }
      console.log(`📦 Cache MISS: Document chunks ${documentId}`)
      return null
    } catch (error) {
      console.error('Failed to retrieve cached document chunks:', error)
      return null
    }
  }

  // Cache processing statistics
  async cacheProcessingStats(operation, stats) {
    try {
      const key = this.generateKey('stats', `${operation}_${Date.now()}`)
      await this.redis.setex(key, this.TTL.STATS, JSON.stringify({
        operation,
        stats,
        timestamp: new Date().toISOString()
      }))
      return key
    } catch (error) {
      console.error('Failed to cache processing stats:', error)
      return null
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const keys = await this.redis.keys('ai_learning:*')
      const stats = {
        total_keys: keys.length,
        by_type: {},
        redis_info: null,
        server_uptime: null
      }

      // Get Redis info safely
      try {
        const info = await this.redis.info('memory')
        stats.redis_info = info
      } catch (infoError) {
        console.warn('Could not get Redis memory info:', infoError.message)
      }

      // Get server uptime safely
      try {
        const serverInfo = await this.redis.info('server')
        stats.server_uptime = serverInfo
      } catch (uptimeError) {
        console.warn('Could not get Redis server info:', uptimeError.message)
      }

      // Group by cache type
      keys.forEach(key => {
        const type = key.split(':')[1]
        stats.by_type[type] = (stats.by_type[type] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return {
        total_keys: 0,
        by_type: {},
        redis_info: null,
        server_uptime: null,
        error: error.message
      }
    }
  }

  // Clear specific cache type
  async clearCacheType(type) {
    try {
      const pattern = `ai_learning:${type}:*`
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
        console.log(`🗑️ Cleared ${keys.length} ${type} cache entries`)
        return keys.length
      }
      return 0
    } catch (error) {
      console.error(`Failed to clear ${type} cache:`, error)
      return 0
    }
  }

  // Cache warmup for frequently accessed data
  async warmupCache(documentIds = []) {
    console.log('🔥 Starting cache warmup...')
    let warmedUp = 0

    for (const docId of documentIds) {
      try {
        // Pre-load document chunks if not cached
        const chunks = await this.getCachedDocumentChunks(docId)
        if (!chunks) {
          console.log(`⚡ Cache warmup needed for document: ${docId}`)
          // This would trigger actual processing if needed
        } else {
          warmedUp++
        }
      } catch (error) {
        console.error(`Cache warmup error for ${docId}:`, error)
      }
    }

    console.log(`🔥 Cache warmup completed: ${warmedUp}/${documentIds.length} documents`)
    return warmedUp
  }

  // Health check for cache system
  async healthCheck() {
    try {
      const testKey = 'ai_learning:health:test'
      await this.redis.set(testKey, 'ok', 'EX', 10)
      const value = await this.redis.get(testKey)
      await this.redis.del(testKey)
      
      return {
        status: value === 'ok' ? 'healthy' : 'unhealthy',
        latency_ms: Date.now(),
        connected: true
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false
      }
    }
  }

  // Close Redis connection
  async close() {
    await this.redis.quit()
    console.log('📦 Cache manager disconnected')
  }
}

export default CacheManager
