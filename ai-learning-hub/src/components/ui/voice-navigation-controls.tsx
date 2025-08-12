"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, MicOff, MessageSquare, HelpCircle, Navigation } from 'lucide-react'
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation'

interface VoiceNavigationControlsProps {
  className?: string
}

export const VoiceNavigationControls: React.FC<VoiceNavigationControlsProps> = ({
  className = ''
}) => {
  const [isEnabled, setIsEnabled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  
  const voiceNav = useVoiceNavigation({ enabled: isEnabled })

  const handleToggle = () => {
    if (isEnabled) {
      voiceNav.stopListening()
      setIsEnabled(false)
    } else {
      setIsEnabled(true)
      voiceNav.startListening()
    }
  }

  if (!voiceNav.isSupported) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Control */}
      <div className="flex items-center gap-2">
        <Button
          variant={isEnabled ? "destructive" : "outline"}
          size="sm"
          onClick={handleToggle}
          className={`transition-all duration-200 ${
            voiceNav.isListening ? 'animate-pulse' : ''
          }`}
        >
          <Navigation className="h-4 w-4 mr-2" />
          {isEnabled ? (
            <>
              <MicOff className="h-4 w-4 mr-1" />
              Stop Voice Nav
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-1" />
              Voice Navigation
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(!showHelp)}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        {isEnabled && voiceNav.isListening && (
          <Badge variant="secondary" className="text-xs animate-pulse">
            🎙️ Listening for commands...
          </Badge>
        )}
      </div>

      {/* Current Command Display */}
      {voiceNav.currentCommand && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
          <strong>Command:</strong> {voiceNav.currentCommand}
        </div>
      )}

      {/* Error Display */}
      {voiceNav.error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
          {voiceNav.error}
        </div>
      )}

      {/* Help Panel */}
      {showHelp && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Voice Commands
            </CardTitle>
            <CardDescription className="text-xs">
              Say these commands to navigate
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 text-xs">
              <div>
                <strong>Navigation:</strong>
                <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                  <li>• &quot;Go to dashboard&quot;</li>
                  <li>• &quot;Go to upload&quot;</li>
                  <li>• &quot;Go to study plan&quot;</li>
                  <li>• &quot;Go to flashcards&quot;</li>
                  <li>• &quot;Go to questions&quot;</li>
                  <li>• &quot;Go to mind map&quot;</li>
                </ul>
              </div>
              <div>
                <strong>Actions:</strong>
                <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                  <li>• &quot;Scroll up&quot;</li>
                  <li>• &quot;Scroll down&quot;</li>
                  <li>• &quot;Go back&quot;</li>
                  <li>• &quot;Refresh page&quot;</li>
                  <li>• &quot;Help&quot;</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
