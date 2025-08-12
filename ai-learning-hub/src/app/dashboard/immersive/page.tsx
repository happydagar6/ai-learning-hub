"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Focus, 
  Moon, 
  Accessibility,
  Timer,
  Volume2,
  Eye,
  Type,
  Settings
} from 'lucide-react'
import { FocusMode } from '@/components/ui/focus-mode'
import { DarkStudyMode } from '@/components/ui/dark-study-mode'
import { AccessibilityMode } from '@/components/ui/accessibility-mode'
import { useImmersiveSettings } from '@/hooks/useImmersiveSettings'

const ImmersiveLearningPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<string>("focus")
  const { settings, isLoading, error } = useImmersiveSettings()

  const handleModeChange = useCallback((mode: string) => {
    setActiveMode(mode)
  }, [])

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Failed to load immersive learning modes. Please try again.</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Immersive Learning Modes
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Create the perfect learning environment tailored to your needs and preferences
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Focus className="h-3 w-3" />
              Focus Enhancement
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Moon className="h-3 w-3" />
              Eye Protection
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Accessibility className="h-3 w-3" />
              Universal Access
            </Badge>
          </div>
        </div>

        {/* Mode Selection Tabs */}
        <Tabs value={activeMode} onValueChange={handleModeChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="focus" className="flex items-center gap-2">
              <Focus className="h-4 w-4" />
              Focus Mode
            </TabsTrigger>
            <TabsTrigger value="dark" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Dark Study
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Accessibility className="h-4 w-4" />
              Accessibility
            </TabsTrigger>
          </TabsList>

          <TabsContent value="focus" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <FocusMode />
            )}
          </TabsContent>

          <TabsContent value="dark" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DarkStudyMode />
            )}
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AccessibilityMode />
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                <Timer className="h-5 w-5" />
                <span className="text-sm">Timer</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                <Volume2 className="h-5 w-5" />
                <span className="text-sm">Sounds</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                <Eye className="h-5 w-5" />
                <span className="text-sm">Display</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                <Type className="h-5 w-5" />
                <span className="text-sm">Font</span>
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

export default ImmersiveLearningPage
