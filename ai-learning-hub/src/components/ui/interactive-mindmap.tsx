"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  CheckCircle, 
  Circle, 
  Clock, 
  Target, 
  ArrowRight, 
  BookOpen, 
  Save, 
  CloudDownload, 
  Maximize2,
  X,
  TrendingUp,
  Zap,
  Trophy,
  Eye
} from 'lucide-react'

interface MindMapNode {
  id: string
  title: string
  level: number
  difficulty: 'easy' | 'medium' | 'hard'
  estimated_time: string
  tasks: string[]
  completed: boolean
  icon: any
  color: string
  position: { x: number; y: number }
  connections: string[]
}

interface InteractiveMindMapProps {
  studyPlan: {
    id?: string
    title: string
    weeks: any[]
  }
  mindMapData?: any
}

// Helper function to get background class - moved before component
const getBackgroundClass = (colorClass: string) => {
  const classMap: Record<string, string> = {
    'from-green-400 to-green-600': 'bg-gradient-to-br from-green-400 to-green-600',
    'from-yellow-400 to-orange-500': 'bg-gradient-to-br from-yellow-400 to-orange-500',
    'from-red-400 to-pink-500': 'bg-gradient-to-br from-red-400 to-pink-500',
    'from-purple-400 to-blue-500': 'bg-gradient-to-br from-purple-400 to-blue-500',
    'from-blue-400 to-indigo-500': 'bg-gradient-to-br from-blue-400 to-indigo-500',
    'from-teal-400 to-cyan-500': 'bg-gradient-to-br from-teal-400 to-cyan-500',
    'from-pink-400 to-rose-500': 'bg-gradient-to-br from-pink-400 to-rose-500',
    'from-indigo-400 to-purple-500': 'bg-gradient-to-br from-indigo-400 to-purple-500'
  }
  return classMap[colorClass] || 'bg-gradient-to-br from-gray-400 to-gray-600'
}

const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({ studyPlan, mindMapData }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Color scheme for different levels
  const colorSchemes = {
    easy: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
    medium: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
    hard: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' }
  }

  // Icons for different types of content
  const iconMap = useMemo(() => ({
    foundation: BookOpen,
    building: TrendingUp,
    application: Zap,
    mastery: Trophy,
    research: Eye,
    practice: Target
  }), [])

  // FIXED: Generate mind map nodes - REMOVED completedNodes dependency to prevent circular dependency
  const generateNodes = useCallback((): MindMapNode[] => {
    
    // Check if we have mindMapData with nodes
    if (mindMapData && mindMapData.nodes && Array.isArray(mindMapData.nodes)) {
      const nodes: MindMapNode[] = []
      
      // Add central node
      nodes.push({
        id: 'central',
        title: mindMapData.title || studyPlan.title,
        level: 0,
        difficulty: 'medium',
        estimated_time: `${mindMapData.totalWeeks || studyPlan.weeks.length} weeks`,
        tasks: ['Complete learning journey'],
        completed: false, // Always start as false, let useEffect handle completion state
        icon: Brain,
        color: 'from-purple-400 to-blue-500',
        position: { x: 400, y: 300 },
        connections: []
      })
      
      // FIXED: Filter out any existing 'central' nodes to prevent duplicates
      const filteredNodes = mindMapData.nodes.filter((node: any) => node.id !== 'central')
      
      // Add generated nodes with proper structure and positioning
      filteredNodes.forEach((node: any, index: number) => {
        // Ensure proper positioning - use provided position or calculate fallback
        let position = { x: 400, y: 300 }
        if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
          position = node.position
        } else {
          // Fallback: circular arrangement around center
          const angle = (index * 2 * Math.PI) / filteredNodes.length
          const radius = 200
          position = {
            x: 400 + radius * Math.cos(angle),
            y: 300 + radius * Math.sin(angle)
          }
        }
        
        const nodeId = node.id || `node-${index}`
        nodes.push({
          id: nodeId,
          title: node.title || node.name || `Node ${index + 1}`,
          level: node.level || 1,
          difficulty: node.difficulty || 'medium',
          estimated_time: node.estimated_time || (node.estimatedHours ? `${node.estimatedHours} hours` : '4-6 hours'),
          tasks: node.tasks || node.objectives || ['Complete objectives'],
          completed: false, // Always start as false, let useEffect handle completion state
          icon: iconMap[node.learningType as keyof typeof iconMap] || iconMap.foundation,
          color: node.difficulty === 'easy' ? 'from-green-400 to-green-600' :
                 node.difficulty === 'medium' ? 'from-yellow-400 to-orange-500' :
                 'from-red-400 to-pink-500',
          position,
          connections: node.connections || ['central']
        })
      })
      
      return nodes
    }
    
    const nodes: MindMapNode[] = []
    
    // Central node
    nodes.push({
      id: 'central',
      title: studyPlan.title,
      level: 0,
      difficulty: 'medium',
      estimated_time: `${studyPlan.weeks.length} weeks`,
      tasks: ['Complete learning journey'],
      completed: false, // Always start as false, let useEffect handle completion state
      icon: Brain,
      color: 'from-purple-400 to-blue-500',
      position: { x: 400, y: 300 },
      connections: []
    })

    // Generate nodes for each week
    studyPlan.weeks.forEach((week, index) => {
      const angle = (index * 2 * Math.PI) / studyPlan.weeks.length
      const radius = 200
      const x = 400 + radius * Math.cos(angle)
      const y = 300 + radius * Math.sin(angle)

      const difficulty = index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard'
      const nodeType = index % 4 === 0 ? 'foundation' : 
                      index % 4 === 1 ? 'building' : 
                      index % 4 === 2 ? 'application' : 'mastery'

      nodes.push({
        id: `week-${index}`,
        title: week.title || `Week ${index + 1}`,
        level: 1,
        difficulty,
        estimated_time: week.estimated_time || '4-6 hours',
        tasks: week.tasks || ['Complete weekly objectives'],
        completed: false, // Always start as false, let useEffect handle completion state
        icon: iconMap[nodeType],
        color: difficulty === 'easy' ? 'from-green-400 to-green-600' :
               difficulty === 'medium' ? 'from-yellow-400 to-orange-500' :
               'from-red-400 to-pink-500',
        position: { x, y },
        connections: ['central']
      })
    })

    return nodes
  }, [mindMapData, studyPlan, iconMap]) // REMOVED completedNodes dependency - THIS FIXES THE CIRCULAR DEPENDENCY!

  const [nodes, setNodes] = useState<MindMapNode[]>([])

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    // Set initial value
    handleResize()
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Regenerate nodes when mindMapData or studyPlan changes (NOT when completedNodes changes)
  useEffect(() => {
    const newNodes = generateNodes()
    setNodes(newNodes)
  }, [generateNodes])

  // FIXED: This useEffect handles ONLY completion state synchronization
  useEffect(() => {
    setNodes(prev => prev.map(node => ({
      ...node,
      completed: completedNodes.has(node.id)
    })))
  }, [completedNodes])

  // FIXED: Simplified toggleNodeCompletion - only manages completedNodes state
  const toggleNodeCompletion = useCallback((nodeId: string) => {
    
    setCompletedNodes(prev => {
      const newCompleted = new Set(prev)
      const wasCompleted = newCompleted.has(nodeId)
      
      if (wasCompleted) {
        newCompleted.delete(nodeId)
      } else {
        newCompleted.add(nodeId)
      }
      
      return newCompleted
    })
  }, [])

  const calculateProgress = useCallback(() => {
    const totalNodes = nodes.filter(n => n.id !== 'central').length
    const completedCount = completedNodes.size
    return totalNodes > 0 ? (completedCount / totalNodes) * 100 : 0
  }, [nodes, completedNodes])

  // Save interactive mindmap data to Supabase
  const saveInteractiveMindMap = useCallback(async () => {
    if (!studyPlan.id) {
      console.error('No study plan ID available for saving')
      return
    }

    setIsSaving(true)
    
    try {
      // Prepare nodes data without icon components (they can't be serialized)
      const serializableNodes = nodes.map(node => ({
        ...node,
        icon: undefined // Remove icon component as it can't be serialized
      }))

      const interactiveData = {
        nodes: serializableNodes,
        zoom,
        lastUpdated: new Date().toISOString()
      }

      const nodeStates: Record<string, { completed: boolean; completedAt: string }> = {}
      completedNodes.forEach(nodeId => {
        nodeStates[nodeId] = { completed: true, completedAt: new Date().toISOString() }
      })

      const userProgress = {
        totalNodes: nodes.filter(n => n.id !== 'central').length,
        completedNodes: completedNodes.size,
        progressPercentage: calculateProgress(),
        lastActivity: new Date().toISOString()
      }

      const response = await fetch('/api/save-interactive-mindmap', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyPlanId: studyPlan.id,
          interactiveData,
          nodeStates,
          userProgress
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setLastSaved(new Date().toLocaleTimeString())
      } else {
        console.error('❌ Failed to save interactive mindmap:', result.error)
      }
    } catch (error) {
      console.error('❌ Error saving interactive mindmap:', error)
    } finally {
      setIsSaving(false)
    }
  }, [studyPlan.id, nodes, zoom, completedNodes, calculateProgress])

  // FIXED: Load interactive mindmap data from Supabase - REMOVED nodes dependency
  const loadInteractiveMindMap = useCallback(async () => {
    if (!studyPlan.id) {
      console.error('No study plan ID available for loading')
      return
    }
  
    setIsLoading(true)
  
    try {
      const response = await fetch(`/api/load-interactive-mindmap?studyPlanId=${studyPlan.id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()
      
      if (result.success && result.data) {
        const { interactiveData, nodeStates, userProgress } = result.data
        
        // First, restore completed nodes state
        let restoredCompletedNodes = new Set<string>()
        if (nodeStates) {
          restoredCompletedNodes = new Set(Object.keys(nodeStates).filter(nodeId => nodeStates[nodeId]?.completed))
          setCompletedNodes(restoredCompletedNodes)
        }
        
        // Only restore zoom, let the completion state sync happen via useEffect
        if (interactiveData?.zoom) {
          setZoom(interactiveData.zoom)
        }

        // FIXED: Safe date handling with fallback
        let loadedTimeString = 'Unknown time'
        try {
          // Try multiple possible date fields and formats
          const possibleDates = [
            result.data.savedAt,
            result.data.lastUpdated,
            interactiveData?.lastUpdated,
            userProgress?.lastActivity
          ]
          
          for (const dateValue of possibleDates) {
            if (dateValue) {
              const date = new Date(dateValue)
              if (!isNaN(date.getTime())) {
                loadedTimeString = date.toLocaleTimeString()
                break
              }
            }
          }
          
          // If no valid date found, use current time
          if (loadedTimeString === 'Unknown time') {
            loadedTimeString = new Date().toLocaleTimeString()
          }
        } catch (dateError) {
          console.warn('Date parsing error:', dateError)
          loadedTimeString = new Date().toLocaleTimeString()
        }

        setLastSaved(`Loaded: ${loadedTimeString}`)
      } else if (result.success && !result.data) {
        setLastSaved('No saved data found')
      } else {
        console.error('❌ Failed to load interactive mindmap:', result.error)
        setLastSaved('Load failed')
      }
    } catch (error) {
      console.error('❌ Error loading interactive mindmap:', error)
      setLastSaved('Load error')
    } finally {
      setIsLoading(false)
    }
  }, [studyPlan.id, iconMap]) // REMOVED nodes dependency to prevent infinite loop

  // FIXED: Auto-save condition - allow saving even with 0 completed nodes
  useEffect(() => {
    if (studyPlan.id && completedNodes.size >= 0) {
      const saveTimeout = setTimeout(() => {
        saveInteractiveMindMap()
      }, 2000)
  
      return () => clearTimeout(saveTimeout)
    }
  }, [completedNodes, studyPlan.id, saveInteractiveMindMap])

  // FIXED: Load saved data on component mount - use a ref to track if already loaded
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (studyPlan.id && nodes.length > 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadInteractiveMindMap()
    }
  }, [studyPlan.id, nodes.length]) // REMOVED loadInteractiveMindMap from dependencies

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-950' : ''} w-full max-w-full overflow-x-auto`}>
      <Card className="w-full h-full bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
        <CardHeader className="border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              Interactive Mind Map
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveInteractiveMindMap}
                disabled={isSaving || !studyPlan.id}
                className="text-xs sm:text-sm"
              >
                <Save className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">{isSaving ? 'Saving...' : 'Save Progress'}</span>
                <span className="xs:hidden">{isSaving ? 'Save' : 'Save'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInteractiveMindMap}
                disabled={isLoading || !studyPlan.id}
                className="text-xs sm:text-sm"
              >
                <CloudDownload className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">{isLoading ? 'Loading...' : 'Load Saved'}</span>
                <span className="xs:hidden">{isLoading ? 'Load' : 'Load'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-xs sm:text-sm"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1 text-slate-700 dark:text-slate-300">
                <span>Learning Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
            <Badge variant="secondary">
              {completedNodes.size}/{nodes.length - 1} Completed
            </Badge>
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                {lastSaved}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 relative overflow-hidden">
          <div className="flex h-[320px] sm:h-[600px] w-full min-w-[320px] max-w-full overflow-hidden justify-center items-center relative">
            {/* Mind Map Canvas */}
            <div 
              ref={containerRef}
              className="flex-1 relative bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 overflow-hidden"
              style={{ 
                transform: `scale(${isMobile ? 0.55 : zoom})`, 
                transformOrigin: 'center center',
                minHeight: '600px',
                minWidth: '800px'
              }}
            >
              {/* Debug info */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded z-50">
                Nodes: {nodes.length} | Zoom: {Math.round(zoom * 100)}% | Mobile: {isMobile ? 'Yes' : 'No'}
              </div>

              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {nodes.map(node => 
                  (node.connections || []).map(connectionId => {
                    const connectedNode = nodes.find(n => n.id === connectionId)
                    if (!connectedNode || !node.position || !connectedNode.position) return null
                    
                    return (
                      <line
                        key={`${node.id}-${connectionId}`}
                        x1={node.position.x}
                        y1={node.position.y}
                        x2={connectedNode.position.x}
                        y2={connectedNode.position.y}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={node.completed && connectedNode.completed ? "0" : "5,5"}
                        className="transition-all duration-300 text-slate-300 dark:text-slate-600 hover:text-slate-400"
                      />
                    )
                  })
                )}
              </svg>

              {/* Mind Map Nodes */}
              {nodes.map((node) => {
                const IconComponent = node.icon
                const isSelected = selectedNode === node.id
                const isCompleted = node.completed

                return (
                  <div
                    key={node.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      isSelected ? 'z-30 scale-110' : 'z-20'
                    }`}
                    style={{
                      left: node.position.x,
                      top: node.position.y,
                    }}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  >
                    {/* Node Circle */}
                    <div
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full ${getBackgroundClass(node.color)} shadow-lg border-4 ${
                        isCompleted ? 'border-green-400' : 'border-white'
                      } flex items-center justify-center group hover:shadow-xl transition-all duration-300`}
                    >
                      <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      
                      {/* Completion Indicator */}
                      {isCompleted && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      {/* Difficulty Badge */}
                      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-full text-xs font-medium ${
                        colorSchemes[node.difficulty].bg
                      } ${colorSchemes[node.difficulty].text} ${colorSchemes[node.difficulty].border} border`}>
                        {node.difficulty}
                      </div>
                    </div>
                    
                    {/* Node Title */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
                      <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 max-w-24 sm:max-w-32 truncate">
                        {node.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {node.estimated_time}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Node Details Panel */}
            {selectedNodeData && (
              <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 shadow-lg overflow-y-auto z-40">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {selectedNodeData.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedNode(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedNodeData.estimated_time}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-slate-500" />
                      <Badge variant={selectedNodeData.difficulty === 'easy' ? 'default' : 
                                   selectedNodeData.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                        {selectedNodeData.difficulty}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Tasks:</h4>
                      <ul className="space-y-1">
                        {selectedNodeData.tasks.map((task, index) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <ArrowRight className="h-3 w-3 mt-0.5 text-slate-400 flex-shrink-0" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button
                      onClick={() => toggleNodeCompletion(selectedNodeData.id)}
                      className={`w-full ${
                        selectedNodeData.completed
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {selectedNodeData.completed ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Incomplete
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default InteractiveMindMap

