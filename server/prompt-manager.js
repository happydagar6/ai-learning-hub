import CacheManager from './cache-manager.js'

class EnhancedPromptManager {
  constructor() {
    this.cache = new CacheManager()
    
    // Advanced prompt templates for different query types
    this.promptTemplates = {
      definition: {
        system: `You are an expert technical analyst specializing in providing clear, comprehensive definitions. Your responses should be well-structured with examples and context.`,
        template: (context, query) => `
**DEFINITION REQUEST**: "${query}"

**RELEVANT CONTEXT**:
${context}

**RESPONSE REQUIREMENTS**:
1. **Primary Definition**: Provide a clear, concise definition
2. **Detailed Explanation**: Expand with technical details and context
3. **Key Characteristics**: List 3-5 important attributes or features
4. **Practical Examples**: Include 2-3 real-world examples or use cases
5. **Related Concepts**: Mention related terms or concepts
6. **Source References**: Include page numbers where information was found

Format your response with clear headings, bullet points, and **bold text** for key terms.`
      },

      explanation: {
        system: `You are an expert educator skilled at breaking down complex concepts into understandable explanations with logical flow and clear examples.`,
        template: (context, query) => `
**EXPLANATION REQUEST**: "${query}"

**RELEVANT CONTEXT**:
${context}

**RESPONSE REQUIREMENTS**:
1. **Overview**: Start with a high-level explanation
2. **Step-by-Step Breakdown**: Break down the concept into digestible parts
3. **How It Works**: Explain the mechanism or process
4. **Why It Matters**: Explain the importance and benefits
5. **Common Applications**: Show where this is used in practice
6. **Visual Aids**: Describe any diagrams, charts, or visual elements mentioned
7. **Key Takeaways**: Summarize the most important points

Use numbered lists, bullet points, and clear section headers. Include page references.`
      },

      procedure: {
        system: `You are a technical instructor expert at documenting step-by-step procedures and workflows with precision and clarity.`,
        template: (context, query) => `
**PROCEDURE REQUEST**: "${query}"

**RELEVANT CONTEXT**:
${context}

**RESPONSE REQUIREMENTS**:
1. **Prerequisites**: What's needed before starting
2. **Step-by-Step Instructions**: Clear, numbered steps
3. **Expected Outcomes**: What should happen at each step
4. **Troubleshooting**: Common issues and solutions
5. **Best Practices**: Tips for optimal results
6. **Verification**: How to confirm successful completion
7. **Next Steps**: What comes after this procedure

Format as a clear procedure guide with numbered steps, warnings, and tips.`
      },

      comparison: {
        system: `You are an analytical expert skilled at comparing and contrasting concepts, highlighting similarities, differences, and trade-offs.`,
        template: (context, query) => `
**COMPARISON REQUEST**: "${query}"

**RELEVANT CONTEXT**:
${context}

**RESPONSE REQUIREMENTS**:
1. **Items Being Compared**: Clearly identify what's being compared
2. **Similarities**: What do they have in common
3. **Key Differences**: Major distinctions between them
4. **Advantages/Disadvantages**: Pros and cons of each
5. **Use Cases**: When to use each option
6. **Performance Comparison**: If applicable, compare efficiency/effectiveness
7. **Recommendation**: Which to choose in different scenarios

Use comparison tables, bullet points, and clear categorization.`
      },

      troubleshooting: {
        system: `You are a technical support expert skilled at diagnosing problems and providing systematic troubleshooting guidance.`,
        template: (context, query) => `
**TROUBLESHOOTING REQUEST**: "${query}"

**RELEVANT CONTEXT**:
${context}

**RESPONSE REQUIREMENTS**:
1. **Problem Analysis**: Identify the core issue
2. **Possible Causes**: List potential reasons for the problem
3. **Diagnostic Steps**: How to identify the specific cause
4. **Solution Methods**: Step-by-step fixes for each cause
5. **Prevention**: How to avoid this issue in the future

Format with clear diagnostic steps and actionable solutions.`
      },

      financial: {
        system: `You are a financial analyst expert at analyzing financial documents, statements, and reports. Provide comprehensive, detailed financial analysis with proper context and explanations.`,
        template: (context, query) => `
**FINANCIAL ANALYSIS REQUEST**: "${query}"

**RELEVANT FINANCIAL CONTEXT**:
${context}

**COMPREHENSIVE ANALYSIS REQUIREMENTS**:
1. **Financial Overview**: Provide a comprehensive summary of the requested financial information
2. **Detailed Breakdown**: Break down all components, line items, and calculations
3. **Numerical Analysis**: Include all relevant figures, percentages, and calculations found in the document
4. **Period Comparison**: If applicable, compare across different periods or quarters
5. **Key Metrics**: Highlight important financial ratios, percentages, or trends
6. **Context & Implications**: Explain what these numbers mean and their significance
7. **Complete Documentation**: Include ALL relevant information found in the source documents
8. **Source Attribution**: Reference specific pages and sections where information was found

**FORMATTING REQUIREMENTS**:
- Use clear financial headings and subheadings
- Present numbers in properly formatted tables when applicable
- Include currency symbols and units (millions, billions, etc.)
- Use bullet points for detailed breakdowns
- **Bold** important financial figures and terms
- Provide complete, thorough explanations rather than brief summaries

Extract and present ALL relevant financial information comprehensively.`
      },

      comprehensive: {
        system: `You are an expert document analyst skilled at extracting and synthesizing comprehensive information from complex documents. Your goal is to provide thorough, detailed responses that cover all aspects of the query.`,
        template: (context, query) => `
**COMPREHENSIVE INFORMATION REQUEST**: "${query}"

**COMPLETE DOCUMENT CONTEXT**:
${context}

**COMPREHENSIVE RESPONSE REQUIREMENTS**:
1. **Complete Overview**: Provide a thorough introduction covering all aspects of the topic
2. **Detailed Content Analysis**: Extract and explain ALL relevant information found
3. **Structured Information**: Organize information into logical sections and subsections
4. **Supporting Details**: Include examples, specifics, and supporting evidence
5. **Cross-References**: Connect related information from different parts of the document
6. **Quantitative Data**: Include all numbers, statistics, percentages, and measurements
7. **Qualitative Analysis**: Explain implications, significance, and context
8. **Complete Coverage**: Ensure no important information is omitted
9. **Source Documentation**: Reference specific pages and sections for all information

**FORMATTING FOR COMPREHENSIVE RESPONSES**:
- Use hierarchical headings (##, ###) for organization
- Create detailed bullet points and numbered lists
- Include tables for complex data when appropriate
- Use **bold** for key terms and important points
- Provide complete explanations rather than brief summaries
- Include all page references and source citations

Provide a thorough, comprehensive response that fully addresses the query with complete detail.`
      },

      summary: {
        system: `You are an expert summarizer skilled at extracting and organizing the most important information into concise, well-structured overviews.`,
        template: (context, query) => `
**SUMMARY REQUEST**: "${query}"

**RELEVANT CONTEXT**:
${context}

**RESPONSE REQUIREMENTS**:
1. **Executive Summary**: Brief overview in 2-3 sentences
2. **Key Points**: Most important concepts or findings
3. **Main Categories**: Organize information into logical groups
4. **Supporting Details**: Important specifics and examples
5. **Conclusions**: Key takeaways and implications
6. **References**: Page numbers and sections where information was found

Create a well-organized summary with clear hierarchy and easy scanning.`
      },

      general: {
        system: `You are an expert document analyst providing comprehensive, well-structured answers based exclusively on the provided content.`,
        template: (context, query) => `
**QUERY**: "${query}"

**DOCUMENT CONTEXT**:
${context}

**RESPONSE REQUIREMENTS**:
1. **Direct Answer**: Address the specific question asked
2. **Supporting Evidence**: Quote relevant passages from the document
3. **Additional Context**: Provide related information that adds value
4. **Practical Applications**: How this information can be used
5. **Cross-References**: Connect to other parts of the document
6. **Completeness Check**: Note if any information seems incomplete

Use clear formatting with headings, bullet points, and page references.`
      }
    }

    // Context optimization strategies
    this.contextStrategies = {
      relevanceThreshold: 0.7,
      maxContextLength: 8000,
      minContextSections: 3,
      maxContextSections: 12,
      prioritizeRecent: true,
      includeMetadata: true
    }
  }

  // Intelligent query classification for optimal prompt selection - ENHANCED FOR COMPREHENSIVE QUERIES
  classifyQuery(query) {
    const lowerQuery = query.toLowerCase()
    
    const patterns = {
      financial: /(liabilities|equity|revenue|assets|income|financial|balance sheet|income statement|shareholders|stockholders|apple inc|cash flow|debt|comprehensive income)/,
      comprehensive: /(give me|show me|tell me about|all|complete|full|entire|comprehensive|detailed|everything about|all information|total|overall)/,
      definition: /(what is|define|definition of|meaning of|explain what)/,
      explanation: /(how does|why does|explain how|explain why|how to understand)/,
      procedure: /(how to|steps to|procedure for|process of|workflow for)/,
      comparison: /(difference between|compare|versus|vs|contrast|which is better)/,
      troubleshooting: /(problem|issue|error|not working|failed|fix|solve|debug)/,
      summary: /(summarize|overview of|summary of|main points|key points)/
    }

    // Check for financial queries first (high priority)
    if (patterns.financial.test(lowerQuery)) {
      return 'financial'
    }
    
    // Check for comprehensive information requests
    if (patterns.comprehensive.test(lowerQuery)) {
      return 'comprehensive'
    }

    // Check other patterns
    for (const [type, pattern] of Object.entries(patterns)) {
      if (type !== 'financial' && type !== 'comprehensive' && pattern.test(lowerQuery)) {
        return type
      }
    }

    // Default to comprehensive for thorough coverage
    return 'comprehensive'
  }

  // Enhanced context formatting with intelligent prioritization
  formatEnhancedContext(docs, query) {
    if (!docs || docs.length === 0) return "No relevant context found."

    const queryType = this.classifyQuery(query)
    const sortedDocs = this.prioritizeDocuments(docs, query, queryType)
    
    let formattedContext = `**DOCUMENT ANALYSIS FOR**: "${query}"\n`
    formattedContext += `**Query Type Detected**: ${queryType.toUpperCase()}\n`
    formattedContext += `**Context Sections**: ${sortedDocs.length}\n\n`

    sortedDocs.forEach((doc, idx) => {
      const metadata = doc.metadata || {}
      const pageInfo = metadata.loc?.pageNumber ? `Page ${metadata.loc.pageNumber}` : `Section ${idx + 1}`
      const contentType = metadata.contentType || 'general'
      const relevanceScore = doc.relevanceScore || 0
      const structureScore = metadata.structureScore || 0
      
      // Enhanced relevance indicators
      let relevanceIndicator = "📄"
      if (relevanceScore > 4) relevanceIndicator = "🔥 HIGH RELEVANCE"
      else if (relevanceScore > 2.5) relevanceIndicator = "⭐ RELEVANT"
      else if (structureScore > 2) relevanceIndicator = "📋 STRUCTURED"
      
      formattedContext += `${relevanceIndicator} **${pageInfo}** | Content: ${contentType} | Score: ${relevanceScore.toFixed(2)}\n`
      
      // Add technical terms if available
      if (metadata.technicalTerms && metadata.technicalTerms.length > 0) {
        formattedContext += `*Technical Terms*: ${metadata.technicalTerms.slice(0, 5).join(', ')}\n`
      }
      
      // Add key phrases if available
      if (metadata.keyPhrases && metadata.keyPhrases.length > 0) {
        formattedContext += `*Key Phrases*: ${metadata.keyPhrases.slice(0, 3).join(', ')}\n`
      }
      
      formattedContext += `**Content**:\n${doc.pageContent.trim()}\n`
      formattedContext += `${"═".repeat(80)}\n\n`
    })

    // Add context summary
    formattedContext += this.generateContextSummary(sortedDocs, queryType)
    
    return formattedContext
  }

  // Intelligent document prioritization based on query type and content
  prioritizeDocuments(docs, query, queryType) {
    const queryWords = query.toLowerCase().split(/\s+/)
    
    return docs
      .map(doc => {
        let priorityScore = doc.relevanceScore || 0
        const metadata = doc.metadata || {}
        const content = doc.pageContent.toLowerCase()
        
        // Boost based on content type matching query type
        if (metadata.contentType === queryType) priorityScore += 2
        
        // Boost for query-specific content patterns
        switch (queryType) {
          case 'definition':
            if (metadata.hasDefinitions) priorityScore += 1.5
            if (content.includes('definition') || content.includes('means')) priorityScore += 1
            break
          case 'procedure':
            if (metadata.hasProcedures) priorityScore += 1.5
            if (metadata.hasLists) priorityScore += 1
            if (content.includes('step') || content.includes('process')) priorityScore += 1
            break
          case 'comparison':
            if (content.includes('versus') || content.includes('difference')) priorityScore += 1.5
            break
          case 'explanation':
            if (metadata.hasExamples) priorityScore += 1
            if (content.includes('because') || content.includes('therefore')) priorityScore += 0.5
            break
        }
        
        // Boost for technical content if query contains technical terms
        if (metadata.technicalTerms && metadata.technicalTerms.length > 0) {
          const hasQueryTechnicalTerms = queryWords.some(word => 
            metadata.technicalTerms.some(term => term.toLowerCase().includes(word))
          )
          if (hasQueryTechnicalTerms) priorityScore += 1
        }
        
        // Boost for structured content
        if (metadata.structureScore > 1) priorityScore += 0.5
        
        // Boost for high semantic density
        if (metadata.semanticDensity > 0.6) priorityScore += 0.5
        
        return { ...doc, finalPriorityScore: priorityScore }
      })
      .sort((a, b) => (b.finalPriorityScore || 0) - (a.finalPriorityScore || 0))
      .slice(0, this.contextStrategies.maxContextSections)
  }

  // Generate intelligent context summary
  generateContextSummary(docs, queryType) {
    const contentTypes = docs.reduce((acc, doc) => {
      const type = doc.metadata?.contentType || 'general'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const technicalTerms = new Set()
    docs.forEach(doc => {
      if (doc.metadata?.technicalTerms) {
        doc.metadata.technicalTerms.forEach(term => technicalTerms.add(term))
      }
    })

    let summary = `\n**CONTEXT ANALYSIS SUMMARY**:\n`
    summary += `• **Query Type**: ${queryType}\n`
    summary += `• **Total Sections**: ${docs.length}\n`
    summary += `• **Content Distribution**: ${Object.entries(contentTypes).map(([type, count]) => `${type}(${count})`).join(', ')}\n`
    summary += `• **Technical Terms Found**: ${Array.from(technicalTerms).slice(0, 10).join(', ')}\n`
    summary += `• **Average Relevance**: ${(docs.reduce((sum, doc) => sum + (doc.relevanceScore || 0), 0) / docs.length).toFixed(2)}\n`
    summary += `• **Structured Content**: ${docs.filter(doc => (doc.metadata?.structureScore || 0) > 1).length}/${docs.length} sections\n\n`

    return summary
  }

  // Generate optimized prompt with caching
  async generateOptimizedPrompt(query, docs) {
    const cacheKey = `prompt_${query}_${docs.length}_${Date.now()}`
    
    // Check cache for similar query patterns
    const cachedResult = await this.cache.getCachedQueryResult(query)
    if (cachedResult) {
      console.log('📦 Using cached query context')
      return {
        systemPrompt: this.promptTemplates.general.system,
        userPrompt: cachedResult.result,
        fromCache: true
      }
    }

    const queryType = this.classifyQuery(query)
    const template = this.promptTemplates[queryType] || this.promptTemplates.general
    
    const enhancedContext = this.formatEnhancedContext(docs, query)
    const optimizedPrompt = template.template(enhancedContext, query)

    console.log(`🤖 Generated ${queryType} prompt for query: "${query.substring(0, 50)}..."`)
    
    return {
      systemPrompt: template.system,
      userPrompt: optimizedPrompt,
      queryType,
      contextLength: enhancedContext.length,
      fromCache: false
    }
  }

  // Advanced prompt optimization with response quality scoring
  async optimizePromptForQuality(query, docs, previousResponses = []) {
    const basePrompt = await this.generateOptimizedPrompt(query, docs)
    
    // If we have previous responses, learn from them
    if (previousResponses.length > 0) {
      const qualityMetrics = this.analyzeResponseQuality(previousResponses)
      basePrompt.userPrompt += this.generateQualityImprovementInstructions(qualityMetrics)
    }

    // Add dynamic instruction based on context characteristics
    const contextStats = this.analyzeContextCharacteristics(docs)
    basePrompt.userPrompt += this.generateContextSpecificInstructions(contextStats)

    return basePrompt
  }

  // Analyze response quality from previous interactions
  analyzeResponseQuality(responses) {
    const metrics = {
      avgLength: responses.reduce((sum, r) => sum + r.length, 0) / responses.length,
      structureQuality: responses.filter(r => r.includes('##') || r.includes('**')).length / responses.length,
      hasExamples: responses.filter(r => r.includes('example') || r.includes('for instance')).length / responses.length,
      hasReferences: responses.filter(r => r.includes('Page') || r.includes('Section')).length / responses.length
    }

    return metrics
  }

  // Generate quality improvement instructions
  generateQualityImprovementInstructions(metrics) {
    let instructions = '\n\n**QUALITY ENHANCEMENT INSTRUCTIONS**:\n'
    
    if (metrics.structureQuality < 0.7) {
      instructions += '• Ensure proper formatting with headings (##) and bold text (**)\n'
    }
    
    if (metrics.hasExamples < 0.5) {
      instructions += '• Include more specific examples and practical applications\n'
    }
    
    if (metrics.hasReferences < 0.8) {
      instructions += '• Always include page references and section citations\n'
    }
    
    if (metrics.avgLength < 300) {
      instructions += '• Provide more comprehensive and detailed explanations\n'
    }

    return instructions
  }

  // Analyze context characteristics for specialized instructions
  analyzeContextCharacteristics(docs) {
    return {
      hasCode: docs.some(doc => doc.pageContent.includes('```') || doc.pageContent.includes('function')),
      hasNumbers: docs.some(doc => doc.metadata?.hasNumbers),
      hasLists: docs.some(doc => doc.metadata?.hasLists),
      hasTables: docs.some(doc => doc.pageContent.includes('|') && doc.pageContent.includes('---')),
      technicalDensity: docs.reduce((sum, doc) => sum + (doc.metadata?.technicalTerms?.length || 0), 0) / docs.length
    }
  }

  // Generate context-specific instructions
  generateContextSpecificInstructions(stats) {
    let instructions = '\n\n**CONTENT-SPECIFIC INSTRUCTIONS**:\n'
    
    if (stats.hasCode) {
      instructions += '• Format any code snippets with proper syntax highlighting\n'
    }
    
    if (stats.hasNumbers) {
      instructions += '• Pay special attention to numerical data and calculations\n'
    }
    
    if (stats.hasLists) {
      instructions += '• Preserve list structures and hierarchies from the source\n'
    }
    
    if (stats.hasTables) {
      instructions += '• Convert table data into clear, readable formats\n'
    }
    
    if (stats.technicalDensity > 2) {
      instructions += '• Provide definitions for technical terms in context\n'
    }

    return instructions
  }

  // Performance monitoring for prompt effectiveness
  async trackPromptPerformance(query, promptType, responseTime, responseLength, userFeedback = null) {
    const performanceData = {
      query: query.substring(0, 100),
      promptType,
      responseTime,
      responseLength,
      userFeedback,
      timestamp: new Date().toISOString()
    }

    await this.cache.cacheProcessingStats(`prompt_performance_${Date.now()}`, performanceData)
    console.log(`📊 Prompt performance tracked: ${promptType} (${responseTime}ms, ${responseLength} chars)`)
  }

  // Get prompt performance analytics
  async getPromptAnalytics() {
    const cacheStats = await this.cache.getCacheStats()
    return {
      cachePerformance: cacheStats,
      promptTemplatesAvailable: Object.keys(this.promptTemplates),
      optimizationStrategies: this.contextStrategies
    }
  }
}

export default EnhancedPromptManager
