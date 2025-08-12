"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { UseVoiceRecognitionReturn } from '@/hooks/useVoiceRecognition'

interface VoiceControlsProps {
  voiceRecognition: UseVoiceRecognitionReturn
  onTranscriptReady?: (transcript: string) => void
  isDisabled?: boolean
  showTranscript?: boolean
  className?: string
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  voiceRecognition,
  onTranscriptReady,
  isDisabled = false,
  showTranscript = true,
  className = ''
}) => {
  const {
    isSupported,
    isListening,
    transcript,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = voiceRecognition

  React.useEffect(() => {
    if (transcript && !isListening && onTranscriptReady) {
      onTranscriptReady(transcript)
      // Reset transcript after processing to prevent re-triggering
      setTimeout(() => {
        resetTranscript()
      }, 100)
    }
  }, [transcript, isListening, onTranscriptReady, resetTranscript])

  // Stop listening when disabled
  React.useEffect(() => {
    if (isDisabled && isListening) {
      stopListening()
    }
  }, [isDisabled, isListening, stopListening])

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button variant="outline" size="sm" disabled>
          <VolumeX className="h-4 w-4" />
          <span className="sr-only">Voice not supported</span>
        </Button>
        <Badge variant="destructive" className="text-xs">
          Voice not supported
        </Badge>
      </div>
    )
  }

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          variant={isListening ? "destructive" : "outline"}
          size="sm"
          onClick={handleToggleListening}
          disabled={isDisabled}
          className={`transition-all duration-200 ${
            isListening ? 'animate-pulse' : ''
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4" />
              <span className="sr-only">Stop listening</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              <span className="sr-only">Start voice input</span>
            </>
          )}
        </Button>

        {isListening && (
          <Badge variant="secondary" className="text-xs animate-pulse">
            🎙️ Listening...
          </Badge>
        )}

        {transcript && !isListening && confidence > 0 && (
          <Badge variant="outline" className="text-xs">
            {Math.round(confidence * 100)}% confident
          </Badge>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
          {error}
        </div>
      )}

      {showTranscript && transcript && (
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded border">
          <strong>Voice Input:</strong> {transcript}
        </div>
      )}
    </div>
  )
}
