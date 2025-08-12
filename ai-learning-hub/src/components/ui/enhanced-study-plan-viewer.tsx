"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Brain, 
  Map, 
  List, 
  Download, 
  Eye,
  Lightbulb,
  Target,
  Clock,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Copy,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import InteractiveMindMap from './interactive-mindmap'

interface EnhancedStudyPlanProps {
  studyPlan: {
    title: string
    weeks: any[]
  }
  studyPlanId?: string | null
}

const EnhancedStudyPlanViewer: React.FC<EnhancedStudyPlanProps> = ({ studyPlan, studyPlanId: propStudyPlanId }) => {
  const [mindMapData, setMindMapData] = useState<any>(null)
  const [textMindMap, setTextMindMap] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'interactive' | 'text' | 'overview'>('interactive')
  const [isInitialized, setIsInitialized] = useState(false)
  const [studyPlanId, setStudyPlanId] = useState<string | null>(null)
  const [cacheStatus, setCacheStatus] = useState<{cached: boolean, generatedAt?: string} | null>(null)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get study plan ID from props or URL or generate a unique identifier
  useEffect(() => {
    if (propStudyPlanId) {
      setStudyPlanId(propStudyPlanId)
    } else {
      // Check if we're in browser environment
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        const planId = searchParams.get('studyPlanId')
        if (planId) {
          setStudyPlanId(planId)
        } else {
          // Generate a consistent ID based on the study plan content
          const planHash = btoa(JSON.stringify({ title: studyPlan.title, weeks: studyPlan.weeks }))
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 16)
          setStudyPlanId(`generated_${planHash}`)
        }
      } else {
        // Generate a consistent ID based on the study plan content for SSR
        const planHash = btoa(JSON.stringify({ title: studyPlan.title, weeks: studyPlan.weeks }))
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 16)
        setStudyPlanId(`generated_${planHash}`)
      }
    }
  }, [studyPlan, propStudyPlanId])

  // Generate ONLY interactive mind map
  const generateInteractiveMindMap = async (forceRegenerate = false) => {
    if (!studyPlanId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for generation
      
      const response = await fetch('/api/generate-text-mindmap', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: studyPlan.title,
          weeks: studyPlan.weeks,
          studyPlanId: studyPlanId,
          forceRegenerate: forceRegenerate
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to generate interactive mind map: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      if (data.success) {
        // Set both interactive data and text mindmap
        setMindMapData(data.data.interactiveData)
        setIsInitialized(true)
        if (data.data.mindMapText) {
          setTextMindMap(data.data.mindMapText)
        }
        setCacheStatus({
          cached: data.data.cached,
          generatedAt: data.data.generatedAt
        })
        console.log('✅ Interactive mind map generated:', data.data.cached ? 'from cache' : 'newly generated')
      } else {
        throw new Error(data.error || 'Unknown error occurred while generating interactive mind map')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('❌ Interactive mind map generation timed out')
        setError('Request timed out. Please try again.')
      } else {
        console.error('❌ Interactive mind map generation error:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate interactive mind map')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Generate ONLY text mind map
  const generateTextMindMap = async (forceRegenerate = false) => {
    if (!studyPlanId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout for generation
      
      const response = await fetch('/api/generate-text-mindmap', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: studyPlan.title,
          weeks: studyPlan.weeks,
          studyPlanId: studyPlanId,
          forceRegenerate: forceRegenerate
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to generate text mind map: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      if (data.success) {
        // Set both text mindmap and interactive data
        setTextMindMap(data.data.mindMapText)
        if (data.data.interactiveData) {
          setMindMapData(data.data.interactiveData)
          setIsInitialized(true)
        }
        setCacheStatus({
          cached: data.data.cached,
          generatedAt: data.data.generatedAt
        })
        console.log('✅ Text mind map generated:', data.data.cached ? 'from cache' : 'newly generated')
      } else {
        throw new Error(data.error || 'Unknown error occurred while generating text mind map')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('❌ Text mind map generation timed out')
        setError('Request timed out. Please try again.')
      } else {
        console.error('❌ Text mind map generation error:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate text mind map')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Load mind map data on component mount - ONLY load from cache, never auto-generate
  useEffect(() => {
    if (studyPlanId && !isInitialized && typeof window !== 'undefined') {
      loadMindMapFromCache().catch((error) => {
        console.error('Failed to load mind map from cache:', error)
        setError('Failed to load mind map from cache')
        setIsInitialized(true)
      })
    }
  }, [studyPlanId, isInitialized])

  // Load existing mind map from cache only (no generation)
  const loadMindMapFromCache = async () => {
    if (!studyPlanId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('/api/get-cached-mindmap', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studyPlanId: studyPlanId
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to load mind map: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      if (data.success && data.data) {
        setMindMapData(data.data.interactiveData)
        setTextMindMap(data.data.mindMapText)
        setIsInitialized(true)
        setCacheStatus({
          cached: true,
          generatedAt: data.data.generatedAt
        })
        console.log('✅ Mind map loaded from cache')
      } else {
        // No cached mind map found - show empty state
        setIsInitialized(true)
        console.log('ℹ️ No cached mind map found')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('❌ Mind map loading timed out')
        setError('Request timed out. Please try again.')
      } else {
        console.error('❌ Error loading mind map from cache:', err)
        setError(err instanceof Error ? err.message : 'Failed to load mind map')
      }
      setIsInitialized(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete mindmap functionality
  const deleteMindMap = async (regenerateAfterDelete = false) => {
    if (!studyPlanId) {
      toast.error('No study plan ID available for deletion')
      return
    }

    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/delete-mindmap?studyPlanId=${encodeURIComponent(studyPlanId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to delete mindmap')
      }

      const data = await response.json()
      
      if (data.success) {
        // Clear all mindmap data from state
        setMindMapData(null)
        setTextMindMap('')
        setCacheStatus(null)
        setError(null)
        setIsInitialized(true) // Keep initialized to show empty state
        
        toast.success(data.message || 'Mindmap deleted successfully')
        console.log('✅ Mindmap deleted successfully')

        // If regenerate is requested, generate new mindmap immediately
        if (regenerateAfterDelete) {
          setIsDeleting(false) // Stop showing deleting state
          setShowDeleteDialog(false)
          
          // Generate based on current active view
          if (activeView === 'interactive') {
            generateInteractiveMindMap(true)
          } else if (activeView === 'text') {
            generateTextMindMap(true)
          }
          return
        }
      } else {
        throw new Error(data.error || 'Failed to delete mindmap')
      }
    } catch (err) {
      console.error('❌ Error deleting mindmap:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete mindmap'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const calculateStats = () => {
    const totalWeeks = studyPlan.weeks.length
    const estimatedHours = totalWeeks * 5 // Rough estimate
    const difficulty = totalWeeks <= 4 ? 'Beginner' : totalWeeks <= 8 ? 'Intermediate' : 'Advanced'
    
    return { totalWeeks, estimatedHours, difficulty }
  }

  // Export functionality
  const handleExport = () => {
    setShowDownloadDialog(true)
  }

  const downloadAsJSON = () => {
    const stats = calculateStats()
    const exportData = {
      studyPlan: {
        title: studyPlan.title,
        weeks: studyPlan.weeks,
        stats: stats
      },
      mindMap: {
        interactive: mindMapData,
        text: textMindMap,
        cached: cacheStatus?.cached,
        generatedAt: cacheStatus?.generatedAt
      },
      exportedAt: new Date().toISOString(),
      exportedBy: 'AI Learning Hub'
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${studyPlan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadDialog(false)
  }

  const downloadAsText = () => {
    const stats = calculateStats()
    const textContent = `
# ${studyPlan.title}

## Study Plan Overview
- Duration: ${stats.totalWeeks} weeks
- Estimated Hours: ${stats.estimatedHours} hours
- Difficulty: ${stats.difficulty}

## Weekly Breakdown
${studyPlan.weeks.map((week, index) => `
### Week ${index + 1}: ${week.title || `Week ${index + 1}`}

**Tasks:**
${week.tasks ? week.tasks.map((task: string) => `- ${task}`).join('\n') : '- No tasks specified'}

**Objectives:**
${week.objectives ? week.objectives.map((obj: string) => `- ${obj}`).join('\n') : '- No objectives specified'}

**Resources:**
${week.resources ? week.resources.map((res: string) => `- ${res}`).join('\n') : '- No resources specified'}
`).join('')}

## Mind Map (Text Version)
${textMindMap || 'No mind map generated yet'}

---
Exported from AI Learning Hub on ${new Date().toLocaleDateString()}
`
    
    const textBlob = new Blob([textContent], { type: 'text/plain' })
    const url = URL.createObjectURL(textBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${studyPlan.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_readable.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadDialog(false)
  }

  // Copy text to clipboard with proper error handling
  const copyTextToClipboard = async () => {
    if (!textMindMap) {
      console.warn('No text mindmap to copy')
      toast.error('No text mindmap to copy')
      return
    }

    setIsCopying(true)
    
    try {
      // Modern browsers support
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textMindMap)
        console.log('✅ Text copied to clipboard successfully')
        toast.success('Text mindmap copied to clipboard!')
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = textMindMap
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        textArea.style.pointerEvents = 'none'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (successful) {
          console.log('✅ Text copied to clipboard successfully (fallback)')
          toast.success('Text mindmap copied to clipboard!')
        } else {
          throw new Error('Copy command failed')
        }
      }
    } catch (error) {
      console.error('❌ Failed to copy text to clipboard:', error)
      toast.error('Failed to copy text. Please try selecting and copying manually.')
    } finally {
      setIsCopying(false)
    }
  }

  const stats = calculateStats()

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{studyPlan.title}</h1>
                <p className="text-sm text-gray-600 mt-1">Enhanced Learning Visualization</p>
              </div>
            </CardTitle>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (activeView === 'interactive') {
                    generateInteractiveMindMap(true)
                  } else if (activeView === 'text') {
                    generateTextMindMap(true)
                  }
                }}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {(mindMapData || textMindMap) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{stats.estimatedHours} hours</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{stats.totalWeeks} weeks</span>
            </div>
            <Badge variant={
              stats.difficulty === 'Beginner' ? 'secondary' :
              stats.difficulty === 'Intermediate' ? 'default' : 'destructive'
            }>
              {stats.difficulty}
            </Badge>
            {cacheStatus && (
              <Badge variant="outline" className="text-xs">
                {cacheStatus.cached ? '💾 Cached' : '✨ Generated'}
                {cacheStatus.generatedAt && (
                  <span className="ml-1">
                    {new Date(cacheStatus.generatedAt).toLocaleDateString()}
                  </span>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="interactive" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Interactive Map
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Text Visualization
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Learning Path
          </TabsTrigger>
        </TabsList>

        {/* Interactive Mind Map */}
        <TabsContent value="interactive" className="mt-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading mind map...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Alert>
              <AlertDescription>
                {error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-4"
                  onClick={() => generateInteractiveMindMap(false)}
                >
                  Generate Mind Map
                </Button>
              </AlertDescription>
            </Alert>
          ) : mindMapData ? (
            <InteractiveMindMap studyPlan={{...studyPlan, id: studyPlanId || undefined}} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Brain className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No Mind Map Generated</h3>
                <p className="text-gray-600 mb-6">
                  Generate an interactive mind map to visualize your learning journey
                </p>
                <Button 
                  onClick={() => generateInteractiveMindMap(false)}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Interactive Mind Map
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Text Mind Map */}
        <TabsContent value="text" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                ASCII Learning Path
                {textMindMap && (
                  <Badge variant="secondary" className="ml-2">
                    Generated {new Date().toLocaleDateString()}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating text visualization...</p>
                </div>
              ) : error ? (
                <Alert>
                  <AlertDescription>
                    {error}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-4"
                      onClick={() => generateTextMindMap(true)}
                    >
                      Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : textMindMap ? (
                <div className="relative">
                  <pre className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre-wrap border max-h-[600px] overflow-y-auto">
                    {textMindMap}
                  </pre>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyTextToClipboard}
                      disabled={isCopying}
                      className="bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {isCopying ? 'Copying...' : 'Copy Text'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Map className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Text Mind Map Available</h3>
                  <p className="text-gray-600 mb-6">
                    Generate a beautiful ASCII mind map to visualize your study plan
                  </p>
                  <Button 
                    variant="default" 
                    onClick={() => generateTextMindMap(false)}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Text Mind Map
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Path Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4">
            {studyPlan.weeks.map((week, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {index + 1}
                        </div>
                        <h3 className="text-lg font-semibold">{week.title || `Week ${index + 1}`}</h3>
                        <Badge variant={
                          index < 2 ? 'secondary' : index < 4 ? 'default' : 'destructive'
                        }>
                          {index < 2 ? 'Easy' : index < 4 ? 'Medium' : 'Hard'}
                        </Badge>
                      </div>
                      
                      {week.description && (
                        <p className="text-gray-600 mb-3">{week.description}</p>
                      )}

                      {week.tasks && Array.isArray(week.tasks) && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Learning Objectives
                          </h4>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {week.tasks.slice(0, 3).map((task: string, taskIndex: number) => (
                              <li key={taskIndex} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {Math.max(3 + index, 8)} hours
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <TrendingUp className="h-3 w-3" />
                        Level {Math.min(Math.floor(index / 2) + 1, 4)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Learning Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalWeeks}</div>
              <div className="text-sm text-blue-800">Total Weeks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.estimatedHours}h</div>
              <div className="text-sm text-green-800">Study Time</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{studyPlan.weeks.length * 3}</div>
              <div className="text-sm text-purple-800">Learning Goals</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Format Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="">
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Choose Download Format
            </DialogTitle>
            <DialogDescription className="">
              Select the format you&apos;d like to download your study plan and mind map in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={downloadAsJSON}
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-4 border-2 hover:border-blue-300"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">JSON Format</div>
                  <div className="text-sm text-muted-foreground">Complete data export with mind map</div>
                </div>
              </Button>
              
              <Button
                onClick={downloadAsText}
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-4 border-2 hover:border-green-300"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Text Format</div>
                  <div className="text-sm text-muted-foreground">Human-readable study plan</div>
                </div>
              </Button>
            </div>
          </div>
          
          <DialogFooter className="">
            <Button variant="ghost" onClick={() => setShowDownloadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="">
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Mind Map
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete this mind map? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 mb-1">What will be deleted:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Generated mind map visualization</li>
                    <li>• Interactive mind map data</li>
                    <li>• Cached mind map content</li>
                    <li>• All associated progress data</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <strong>Note:</strong> You can regenerate the mind map anytime after deletion, but any previous customizations or progress will be lost.
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => deleteMindMap(true)}
              disabled={isDeleting}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Delete & Regenerate
                </>
              )}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMindMap(false)}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Only
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnhancedStudyPlanViewer
