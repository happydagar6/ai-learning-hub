"use client"

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useVoiceRecognition } from './useVoiceRecognition'

interface VoiceNavigationOptions {
  enabled?: boolean
  commands?: Record<string, string>
}

const DEFAULT_COMMANDS = {
  // Navigation commands
  'go to dashboard': '/dashboard',
  'go to upload': '/dashboard/upload',
  'go to study plan': '/dashboard/study-plan',
  'go to flash cards': '/dashboard/flashcards',
  'go to questions': '/dashboard/qa',
  'go to mind map': '/dashboard/mindmap',
  'go home': '/',
  
  // Action commands
  'scroll up': 'SCROLL_UP',
  'scroll down': 'SCROLL_DOWN',
  'go back': 'BACK',
  'refresh page': 'REFRESH',
  'help': 'HELP'
}

export const useVoiceNavigation = (options: VoiceNavigationOptions = {}) => {
  const { enabled = false, commands = DEFAULT_COMMANDS } = options
  const router = useRouter()
  
  const voiceRecognition = useVoiceRecognition({
    language: 'en-US',
    continuous: true,
    interimResults: false
  })

  const executeCommand = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim()
    
    // Check for exact matches first
    const action = commands[normalizedCommand as keyof typeof commands]
    if (action) {
      if (action.startsWith('/')) {
        // Navigation command
        router.push(action)
        return true
      } else {
        // Action command
        switch (action) {
          case 'SCROLL_UP':
            window.scrollBy({ top: -300, behavior: 'smooth' })
            return true
          case 'SCROLL_DOWN':
            window.scrollBy({ top: 300, behavior: 'smooth' })
            return true
          case 'BACK':
            router.back()
            return true
          case 'REFRESH':
            window.location.reload()
            return true
          case 'HELP':
            alert(`Available voice commands:\n${Object.keys(commands).join('\n')}`)
            return true
        }
      }
    }
    
    // Check for partial matches
    for (const [cmd, actionValue] of Object.entries(commands)) {
      if (normalizedCommand.includes(cmd.toLowerCase())) {
        if (actionValue.startsWith('/')) {
          router.push(actionValue)
          return true
        }
      }
    }
    
    return false
  }, [commands, router])

  // Listen for voice commands when enabled
  useEffect(() => {
    if (!enabled || !voiceRecognition.isSupported) return

    if (voiceRecognition.transcript && !voiceRecognition.isListening) {
      const commandExecuted = executeCommand(voiceRecognition.transcript)
      
      if (commandExecuted) {
        voiceRecognition.resetTranscript()
        // Brief pause before starting to listen again
        setTimeout(() => {
          voiceRecognition.startListening()
        }, 1000)
      } else {
        // Command not recognized, restart listening after a short delay
        setTimeout(() => {
          voiceRecognition.resetTranscript()
          voiceRecognition.startListening()
        }, 2000)
      }
    }
  }, [voiceRecognition.transcript, voiceRecognition.isListening, enabled, executeCommand, voiceRecognition])

  const startListening = useCallback(() => {
    if (voiceRecognition.isSupported && !voiceRecognition.isListening) {
      voiceRecognition.startListening()
    }
  }, [voiceRecognition])

  const stopListening = useCallback(() => {
    if (voiceRecognition.isListening) {
      voiceRecognition.stopListening()
    }
  }, [voiceRecognition])

  return {
    isSupported: voiceRecognition.isSupported,
    isListening: voiceRecognition.isListening,
    currentCommand: voiceRecognition.transcript,
    error: voiceRecognition.error,
    availableCommands: Object.keys(commands),
    startListening,
    stopListening,
    executeCommand
  }
}
