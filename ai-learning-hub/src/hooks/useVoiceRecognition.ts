"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
}

interface VoiceRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
}

interface VoiceRecognitionState {
  isSupported: boolean
  isListening: boolean
  transcript: string
  confidence: number
  error: string | null
}

interface VoiceRecognitionControls {
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export type UseVoiceRecognitionReturn = VoiceRecognitionState & VoiceRecognitionControls

export const useVoiceRecognition = (
  options: VoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn => {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true
  } = options

  const [state, setState] = useState<VoiceRecognitionState>({
    isSupported: false,
    isListening: false,
    transcript: '',
    confidence: 0,
    error: null
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'Speech recognition not supported in this browser'
      }))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    // Event handlers
    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }))
    }

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }))
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence

        if (event.results[i].isFinal) {
          finalTranscript += transcript
          setState(prev => ({ 
            ...prev, 
            transcript: finalTranscript.trim(),
            confidence: confidence || 0
          }))
        } else {
          interimTranscript += transcript
          if (interimResults) {
            setState(prev => ({ 
              ...prev, 
              transcript: interimTranscript.trim(),
              confidence: confidence || 0
            }))
          }
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'An error occurred during speech recognition'
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech was detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'Audio capture failed. Please check your microphone.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone permissions.'
          break
        case 'network':
          errorMessage = 'Network error occurred. Please check your connection.'
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available.'
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}`
      }

      setState(prev => ({ 
        ...prev, 
        isListening: false, 
        error: errorMessage 
      }))
    }

    recognitionRef.current = recognition
    setState(prev => ({ ...prev, isSupported: true }))

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [language, continuous, interimResults])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || state.isListening) return

    try {
      setState(prev => ({ ...prev, transcript: '', error: null }))
      recognitionRef.current.start()

      // Auto-stop after 15 seconds to prevent infinite listening (reduced from 30)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        stopListening()
        setState(prev => ({ 
          ...prev, 
          error: 'Voice input timeout - please try again' 
        }))
      }, 15000)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start speech recognition' 
      }))
    }
  }, [state.isListening])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.stop()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to stop speech recognition' 
      }))
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', confidence: 0, error: null }))
  }, [])

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript
  }
}

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}
