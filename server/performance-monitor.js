import express from 'express'
import CacheManager from './cache-manager.js'

class PerformanceMonitor {
  constructor() {
    this.cache = new CacheManager()
    this.metrics = {
      system: {
        startTime: Date.now(),
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgProcessingTime: 0,
        peakMemoryUsage: 0,
        currentMemoryUsage: 0
      },
      processing: {
        documentsProcessed: 0,
        totalChunksCreated: 0,
        embeddingsGenerated: 0,
        avgChunksPerDocument: 0,
        avgProcessingTimePerDoc: 0,
        cacheUtilization: 0
      },
      queries: {
        totalQueries: 0,
        avgQueryResponseTime: 0,
        cacheHitRatio: 0,
        queryTypeDistribution: {},
        avgContextDocsPerQuery: 0,
        popularQueries: []
      },
      errors: {
        totalErrors: 0,
        errorsByType: {},
        recentErrors: [],
        errorRate: 0
      }
    }

    // Start periodic monitoring
    this.startPeriodicMonitoring()
    console.log("📊 Performance monitor initialized")
  }

  // Start periodic system monitoring
  startPeriodicMonitoring() {
    setInterval(async () => {
      await this.updateSystemMetrics()
    }, 30000) // Every 30 seconds

    setInterval(async () => {
      await this.generatePerformanceReport()
    }, 300000) // Every 5 minutes
  }

  // Update system-level metrics
  async updateSystemMetrics() {
    try {
      const memUsage = process.memoryUsage()
      this.metrics.system.currentMemoryUsage = memUsage.heapUsed
      this.metrics.system.peakMemoryUsage = Math.max(
        this.metrics.system.peakMemoryUsage,
        memUsage.heapUsed
      )

      // Get cache statistics safely
      try {
        const cacheStats = await this.cache.getCacheStats()
        if (cacheStats) {
          this.metrics.processing.cacheUtilization = 
            (cacheStats.total_keys || 0) / 10000 // Normalize to percentage
        }
      } catch (cacheError) {
        console.warn("Cache stats unavailable:", cacheError.message)
        this.metrics.processing.cacheUtilization = 0
      }

    } catch (error) {
      console.error("Failed to update system metrics:", error)
    }
  }

  // Track document processing metrics
  trackDocumentProcessing(stats) {
    try {
      this.metrics.processing.documentsProcessed++
      this.metrics.processing.totalChunksCreated += stats.document_analysis?.total_chunks || 0
      
      if (stats.performance_metrics?.processing_time_ms) {
        const processingTime = stats.performance_metrics.processing_time_ms
        this.metrics.processing.avgProcessingTimePerDoc = 
          (this.metrics.processing.avgProcessingTimePerDoc * 
           (this.metrics.processing.documentsProcessed - 1) + processingTime) / 
          this.metrics.processing.documentsProcessed
      }

      this.metrics.processing.avgChunksPerDocument = 
        this.metrics.processing.totalChunksCreated / 
        this.metrics.processing.documentsProcessed

      console.log(`📈 Document processing tracked: ${stats.filename}`)
    } catch (error) {
      console.error("Failed to track document processing:", error)
    }
  }

  // Track query processing metrics
  trackQueryProcessing(queryData) {
    try {
      this.metrics.queries.totalQueries++
      
      if (queryData.performance?.totalTime) {
        const responseTime = queryData.performance.totalTime
        this.metrics.queries.avgQueryResponseTime = 
          (this.metrics.queries.avgQueryResponseTime * 
           (this.metrics.queries.totalQueries - 1) + responseTime) / 
          this.metrics.queries.totalQueries
      }

      // Track query type distribution
      if (queryData.queryType) {
        this.metrics.queries.queryTypeDistribution[queryData.queryType] = 
          (this.metrics.queries.queryTypeDistribution[queryData.queryType] || 0) + 1
      }

      // Track context usage
      if (queryData.contextSections) {
        this.metrics.queries.avgContextDocsPerQuery = 
          (this.metrics.queries.avgContextDocsPerQuery * 
           (this.metrics.queries.totalQueries - 1) + queryData.contextSections) / 
          this.metrics.queries.totalQueries
      }

      // Track cache performance
      if (queryData.performance?.cacheHitRatio) {
        this.metrics.queries.cacheHitRatio = queryData.performance.cacheHitRatio
      }

      // Track popular queries
      this.updatePopularQueries(queryData.query)

      console.log(`📊 Query tracked: ${queryData.query?.substring(0, 30)}...`)
    } catch (error) {
      console.error("Failed to track query processing:", error)
    }
  }

  // Update popular queries list
  updatePopularQueries(query) {
    if (!query) return

    const normalizedQuery = query.toLowerCase().trim()
    const existing = this.metrics.queries.popularQueries.find(
      item => item.query === normalizedQuery
    )

    if (existing) {
      existing.count++
    } else {
      this.metrics.queries.popularQueries.push({
        query: normalizedQuery,
        count: 1,
        firstSeen: new Date().toISOString()
      })
    }

    // Keep only top 20 popular queries
    this.metrics.queries.popularQueries = this.metrics.queries.popularQueries
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }

  // Track errors and failures
  trackError(error, context = {}) {
    try {
      this.metrics.errors.totalErrors++
      
      const errorType = error.name || 'UnknownError'
      this.metrics.errors.errorsByType[errorType] = 
        (this.metrics.errors.errorsByType[errorType] || 0) + 1

      // Add to recent errors
      this.metrics.errors.recentErrors.unshift({
        message: error.message,
        type: errorType,
        context,
        timestamp: new Date().toISOString(),
        stack: error.stack?.substring(0, 500)
      })

      // Keep only last 50 errors
      this.metrics.errors.recentErrors = this.metrics.errors.recentErrors.slice(0, 50)

      // Calculate error rate
      const totalRequests = this.metrics.system.totalRequests
      this.metrics.errors.errorRate = totalRequests > 0 
        ? (this.metrics.errors.totalErrors / totalRequests) * 100 
        : 0

      console.error(`🚨 Error tracked: ${errorType} - ${error.message}`)
    } catch (trackingError) {
      console.error("Failed to track error:", trackingError)
    }
  }

  // Track successful requests
  trackSuccess(responseTime = 0) {
    this.metrics.system.totalRequests++
    this.metrics.system.successfulRequests++
    
    if (responseTime > 0) {
      this.metrics.system.avgProcessingTime = 
        (this.metrics.system.avgProcessingTime * 
         (this.metrics.system.successfulRequests - 1) + responseTime) / 
        this.metrics.system.successfulRequests
    }
  }

  // Track failed requests
  trackFailure() {
    this.metrics.system.totalRequests++
    this.metrics.system.failedRequests++
  }

  // Generate comprehensive performance report
  async generatePerformanceReport() {
    try {
      const uptime = Date.now() - this.metrics.system.startTime
      let cacheStats = null
      
      try {
        cacheStats = await this.cache.getCacheStats()
      } catch (cacheError) {
        console.warn("Cache stats unavailable for report:", cacheError.message)
        cacheStats = { total_keys: 0, by_type: {}, error: cacheError.message }
      }

      const report = {
        timestamp: new Date().toISOString(),
        uptime: {
          milliseconds: uptime,
          human: this.formatUptime(uptime)
        },
        system: {
          ...this.metrics.system,
          memoryUsageMB: Math.round(this.metrics.system.currentMemoryUsage / 1024 / 1024),
          peakMemoryMB: Math.round(this.metrics.system.peakMemoryUsage / 1024 / 1024),
          successRate: this.metrics.system.totalRequests > 0 
            ? (this.metrics.system.successfulRequests / this.metrics.system.totalRequests) * 100 
            : 0
        },
        processing: {
          ...this.metrics.processing,
          avgProcessingTimeSeconds: this.metrics.processing.avgProcessingTimePerDoc / 1000,
          chunksPerSecond: this.metrics.processing.avgProcessingTimePerDoc > 0
            ? (this.metrics.processing.avgChunksPerDocument / (this.metrics.processing.avgProcessingTimePerDoc / 1000))
            : 0
        },
        queries: {
          ...this.metrics.queries,
          avgResponseTimeSeconds: this.metrics.queries.avgQueryResponseTime / 1000,
          queriesPerMinute: uptime > 0 ? (this.metrics.queries.totalQueries / (uptime / 60000)) : 0,
          topQueryTypes: Object.entries(this.metrics.queries.queryTypeDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
        },
        cache: cacheStats,
        errors: {
          ...this.metrics.errors,
          topErrorTypes: Object.entries(this.metrics.errors.errorsByType)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5),
          recentErrorsCount: this.metrics.errors.recentErrors.length
        },
        performance_score: this.calculatePerformanceScore()
      }

      // Cache the report
      await this.cache.cacheProcessingStats(`performance_report_${Date.now()}`, report)
      
      console.log(`📊 Performance report generated - Score: ${report.performance_score}/100`)
      return report

    } catch (error) {
      console.error("Failed to generate performance report:", error)
      return null
    }
  }

  // Calculate overall performance score (0-100)
  calculatePerformanceScore() {
    let score = 100

    // Deduct for high error rate
    if (this.metrics.errors.errorRate > 5) score -= 20
    else if (this.metrics.errors.errorRate > 1) score -= 10

    // Deduct for slow response times
    if (this.metrics.queries.avgQueryResponseTime > 5000) score -= 15
    else if (this.metrics.queries.avgQueryResponseTime > 3000) score -= 10
    else if (this.metrics.queries.avgQueryResponseTime > 2000) score -= 5

    // Bonus for high cache hit ratio
    if (this.metrics.queries.cacheHitRatio > 0.8) score += 5
    else if (this.metrics.queries.cacheHitRatio < 0.3) score -= 10

    // Deduct for high memory usage (assuming 1GB limit)
    const memoryUsageGB = this.metrics.system.currentMemoryUsage / 1024 / 1024 / 1024
    if (memoryUsageGB > 0.8) score -= 15
    else if (memoryUsageGB > 0.6) score -= 10

    // Bonus for processing efficiency
    if (this.metrics.processing.avgProcessingTimePerDoc > 0 && 
        this.metrics.processing.avgProcessingTimePerDoc < 30000) score += 5

    return Math.max(0, Math.min(100, score))
  }

  // Format uptime for human readability
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  // Get real-time metrics
  getRealTimeMetrics() {
    return {
      timestamp: new Date().toISOString(),
      system: {
        uptime: this.formatUptime(Date.now() - this.metrics.system.startTime),
        memoryMB: Math.round(this.metrics.system.currentMemoryUsage / 1024 / 1024),
        totalRequests: this.metrics.system.totalRequests,
        successRate: this.metrics.system.totalRequests > 0 
          ? Math.round((this.metrics.system.successfulRequests / this.metrics.system.totalRequests) * 100)
          : 0
      },
      processing: {
        documentsProcessed: this.metrics.processing.documentsProcessed,
        totalChunks: this.metrics.processing.totalChunksCreated,
        avgProcessingTime: Math.round(this.metrics.processing.avgProcessingTimePerDoc / 1000)
      },
      queries: {
        totalQueries: this.metrics.queries.totalQueries,
        avgResponseTime: Math.round(this.metrics.queries.avgQueryResponseTime),
        cacheHitRatio: Math.round(this.metrics.queries.cacheHitRatio * 100)
      },
      errors: {
        totalErrors: this.metrics.errors.totalErrors,
        errorRate: Math.round(this.metrics.errors.errorRate * 100) / 100
      },
      performanceScore: this.calculatePerformanceScore()
    }
  }

  // Get detailed analytics for dashboard
  async getDetailedAnalytics() {
    const report = await this.generatePerformanceReport()
    
    return {
      overview: this.getRealTimeMetrics(),
      detailed: report,
      trends: {
        queryTypeDistribution: this.metrics.queries.queryTypeDistribution,
        popularQueries: this.metrics.queries.popularQueries.slice(0, 10),
        errorsByType: this.metrics.errors.errorsByType,
        recentErrors: this.metrics.errors.recentErrors.slice(0, 10)
      },
      recommendations: this.generateRecommendations()
    }
  }

  // Generate performance improvement recommendations
  generateRecommendations() {
    const recommendations = []

    if (this.metrics.errors.errorRate > 2) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: 'Error rate is above 2%. Check recent errors and implement fixes.',
        action: 'Review error logs and implement error handling improvements'
      })
    }

    if (this.metrics.queries.avgQueryResponseTime > 3000) {
      recommendations.push({
        type: 'response_time',
        priority: 'medium',
        message: 'Average query response time is above 3 seconds.',
        action: 'Optimize database queries and implement more aggressive caching'
      })
    }

    if (this.metrics.queries.cacheHitRatio < 0.4) {
      recommendations.push({
        type: 'cache_performance',
        priority: 'medium',
        message: 'Cache hit ratio is below 40%.',
        action: 'Review cache strategies and increase cache TTL for stable data'
      })
    }

    const memoryUsageGB = this.metrics.system.currentMemoryUsage / 1024 / 1024 / 1024
    if (memoryUsageGB > 0.7) {
      recommendations.push({
        type: 'memory_usage',
        priority: 'high',
        message: 'Memory usage is above 70% of available RAM.',
        action: 'Implement memory cleanup routines and optimize data structures'
      })
    }

    if (this.metrics.processing.documentsProcessed > 10 && 
        this.metrics.processing.avgProcessingTimePerDoc > 60000) {
      recommendations.push({
        type: 'processing_speed',
        priority: 'low',
        message: 'Document processing is taking longer than 1 minute on average.',
        action: 'Consider optimizing chunking algorithms or increasing worker concurrency'
      })
    }

    return recommendations
  }

  // Reset metrics (for testing or maintenance)
  resetMetrics() {
    this.metrics = {
      system: {
        startTime: Date.now(),
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgProcessingTime: 0,
        peakMemoryUsage: 0,
        currentMemoryUsage: 0
      },
      processing: {
        documentsProcessed: 0,
        totalChunksCreated: 0,
        embeddingsGenerated: 0,
        avgChunksPerDocument: 0,
        avgProcessingTimePerDoc: 0,
        cacheUtilization: 0
      },
      queries: {
        totalQueries: 0,
        avgQueryResponseTime: 0,
        cacheHitRatio: 0,
        queryTypeDistribution: {},
        avgContextDocsPerQuery: 0,
        popularQueries: []
      },
      errors: {
        totalErrors: 0,
        errorsByType: {},
        recentErrors: [],
        errorRate: 0
      }
    }

    console.log("📊 Performance metrics reset")
  }

  // Shutdown monitoring
  async shutdown() {
    console.log("📊 Shutting down performance monitor...")
    await this.cache.close()
    console.log("✅ Performance monitor shutdown complete")
  }
}

export default PerformanceMonitor
