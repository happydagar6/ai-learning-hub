"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Target, 
  BookOpen, 
  Lightbulb, 
  Trophy, 
  Clock,
  CheckCircle,
  Circle,
  ArrowRight,
  Zap,
  Star,
  Users,
  TrendingUp,
  Eye,
  Download,
  Maximize2,
  Save,
  CloudDownload
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
}

const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({ studyPlan }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Color scheme for different levels
  const colorSchemes = {
    easy: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
    medium: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
    hard: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' }
  }

  // Icons for different types of content
  const iconMap = {
    foundation: BookOpen,
    building: TrendingUp,
    application: Zap,
    mastery: Trophy,
    research: Eye,
    practice: Target
  }

  // Generate mind map nodes from study plan
  const generateNodes = (): MindMapNode[] => {
    const nodes: MindMapNode[] = []
    
    // Central node
    nodes.push({
      id: 'central',
      title: studyPlan.title,
      level: 0,
      difficulty: 'medium',
      estimated_time: `${studyPlan.weeks.length} weeks`,
      tasks: ['Complete learning journey'],
      completed: false,
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
        completed: completedNodes.has(`week-${index}`),
        icon: iconMap[nodeType],
        color: difficulty === 'easy' ? 'from-green-400 to-green-600' :
               difficulty === 'medium' ? 'from-yellow-400 to-orange-500' :
               'from-red-400 to-pink-500',
        position: { x, y },
        connections: ['central']
      })
    })

    return nodes
  }

  const [nodes, setNodes] = useState<MindMapNode[]>(generateNodes())

  const toggleNodeCompletion = (nodeId: string) => {
    const newCompleted = new Set(completedNodes)
    if (newCompleted.has(nodeId)) {
      newCompleted.delete(nodeId)
    } else {
      newCompleted.add(nodeId)
    }
    setCompletedNodes(newCompleted)
    
    // Update nodes
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, completed: !node.completed } : node
    ))
  }

  const calculateProgress = () => {
    const totalNodes = nodes.filter(n => n.id !== 'central').length
    const completedCount = completedNodes.size
    return totalNodes > 0 ? (completedCount / totalNodes) * 100 : 0
  }

  // Save interactive mindmap data to Supabase
  const saveInteractiveMindMap = async () => {
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
        console.log('✅ Interactive mindmap saved successfully')
      } else {
        console.error('❌ Failed to save interactive mindmap:', result.error)
      }
    } catch (error) {
      console.error('❌ Error saving interactive mindmap:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Load interactive mindmap data from Supabase
  const loadInteractiveMindMap = async () => {
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
        
        // Restore interactive data
        if (interactiveData?.nodes) {
          // Fix icon components when loading from database
          const restoredNodes = interactiveData.nodes.map((node: any) => {
            // Restore proper icon component based on node type
            let iconComponent
            if (node.id === 'central') {
              iconComponent = Brain
            } else {
              // Determine icon based on node index and type
              const weekIndex = parseInt(node.id.split('-')[1]) || 0
              const nodeType = weekIndex % 4 === 0 ? 'foundation' : 
                              weekIndex % 4 === 1 ? 'building' : 
                              weekIndex % 4 === 2 ? 'application' : 'mastery'
              iconComponent = iconMap[nodeType]
            }
            
            return {
              ...node,
              icon: iconComponent
            }
          })
          setNodes(restoredNodes)
        }
        if (interactiveData?.zoom) {
          setZoom(interactiveData.zoom)
        }

        // Restore completed nodes
        if (nodeStates) {
          const completed = new Set(Object.keys(nodeStates).filter(nodeId => nodeStates[nodeId]?.completed))
          setCompletedNodes(completed)
        }

        setLastSaved(`Loaded: ${new Date(result.data.savedAt).toLocaleTimeString()}`)
        console.log('✅ Interactive mindmap loaded successfully')
      } else if (result.success && !result.data) {
        console.log('No saved interactive mindmap data found')
      } else {
        console.error('❌ Failed to load interactive mindmap:', result.error)
      }
    } catch (error) {
      console.error('❌ Error loading interactive mindmap:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-save when important changes occur
  useEffect(() => {
    if (studyPlan.id && completedNodes.size > 0) {
      const saveTimeout = setTimeout(() => {
        saveInteractiveMindMap()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(saveTimeout)
    }
  }, [completedNodes, zoom])

  // Load saved data on component mount
  useEffect(() => {
    if (studyPlan.id) {
      loadInteractiveMindMap()
    }
  }, [studyPlan.id])

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-950' : ''}`}>
      <Card className="w-full h-full bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
        <CardHeader className="border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              Interactive Mind Map
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveInteractiveMindMap}
                disabled={isSaving || !studyPlan.id}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save Progress'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInteractiveMindMap}
                disabled={isLoading || !studyPlan.id}
              >
                <CloudDownload className="h-4 w-4 mr-1" />
                {isLoading ? 'Loading...' : 'Load Saved'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
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
          <div className="flex h-[600px]">
            {/* Mind Map Canvas */}
            <div 
              ref={containerRef}
              className="flex-1 relative bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 overflow-hidden"
              style={{ transform: `scale(${zoom})` }}
            >
              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {nodes.map(node => 
                  node.connections.map(connectionId => {
                    const connectedNode = nodes.find(n => n.id === connectionId)
                    if (!connectedNode) return null
                    
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
                        className="transition-all duration-300 text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500"
                      />
                    )
                  })
                )}
              </svg>

              {/* Mind Map Nodes */}
              {nodes.map(node => {
                const IconComponent = node.icon
                const isSelected = selectedNode === node.id
                const isCompleted = node.completed

                return (
                  <div
                    key={node.id}
                    className={`absolute cursor-pointer transition-all duration-300 transform hover:scale-110 hover:z-20 ${
                      isSelected ? 'scale-110 z-10' : ''
                    }`}
                    style={{
                      left: node.position.x - 50,
                      top: node.position.y - 50,
                    }}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  >
                    {/* Node Container */}
                    <div className={`
                      relative w-24 h-24 rounded-full shadow-lg border-4 transition-all duration-300 hover:shadow-2xl
                      ${isCompleted ? 'border-green-400 shadow-green-200 dark:shadow-green-900 hover:border-green-300' : 'border-white dark:border-slate-700 shadow-gray-200 dark:shadow-slate-800 hover:border-slate-100 dark:hover:border-slate-600'}
                      ${isSelected ? 'shadow-xl dark:shadow-2xl ring-4 ring-blue-300 dark:ring-blue-600' : ''}
                      ${!isCompleted && !isSelected ? 'animate-pulse' : ''}
                      bg-gradient-to-br ${node.color} hover:brightness-110
                    `}>
                      {/* Completion Indicator */}
                      {isCompleted && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}

                      {/* Node Content */}
                      <div className="flex flex-col items-center justify-center h-full text-white drop-shadow-sm">
                        <IconComponent className={`h-6 w-6 mb-1 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`} />
                        <span className="text-xs font-medium text-center px-1 leading-tight">
                          {node.id === 'central' ? 'START' : `W${node.id.split('-')[1]}`}
                        </span>
                      </div>

                      {/* Difficulty Indicator */}
                      {node.id !== 'central' && (
                        <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full
                          ${node.difficulty === 'easy' ? 'bg-green-400' : 
                            node.difficulty === 'medium' ? 'bg-yellow-400' : 'bg-red-400'}
                        `} />
                      )}
                    </div>

                    {/* Node Label */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
                      <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg shadow-md dark:shadow-slate-900 px-2 py-1 text-xs font-medium max-w-20 truncate hover:max-w-none hover:whitespace-nowrap hover:z-30 transition-all duration-200 hover:scale-105 hover:shadow-lg dark:hover:shadow-slate-800">
                        {node.title}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Floating Action Buttons */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <div className="text-xs text-center text-slate-500 dark:text-slate-400 mb-1">
                  Zoom: {Math.round(zoom * 100)}%
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-600 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                >
                  -
                </Button>
              </div>
            </div>

            {/* Side Panel */}
            {selectedNodeData && (
              <div className="w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedNodeData.title}</h3>
                  <Button
                    size="sm"
                    variant={selectedNodeData.completed ? "default" : "outline"}
                    onClick={() => toggleNodeCompletion(selectedNodeData.id)}
                  >
                    {selectedNodeData.completed ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Circle className="h-4 w-4 mr-1" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                </div>

                {/* Node Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{selectedNodeData.estimated_time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={
                      selectedNodeData.difficulty === 'easy' ? 'secondary' :
                      selectedNodeData.difficulty === 'medium' ? 'default' : 'destructive'
                    }>
                      {selectedNodeData.difficulty.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Tasks */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Target className="h-4 w-4" />
                      Learning Objectives
                    </h4>
                    <ul className="space-y-2">
                      {selectedNodeData.tasks.map((task, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <ArrowRight className="h-3 w-3 text-gray-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Learning
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
