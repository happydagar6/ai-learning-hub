"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

interface TextToSpeechOptions {
  voice?: SpeechSynthesisVoice | null
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
}

interface TextToSpeechState {
  isSupported: boolean
  isSpeaking: boolean
  isPaused: boolean
  voices: SpeechSynthesisVoice[]
  error: string | null
}

interface TextToSpeechControls {
  speak: (text: string, options?: TextToSpeechOptions) => void
  stop: () => void
  pause: () => void
  resume: () => void
  cancel: () => void
}

export type UseTextToSpeechReturn = TextToSpeechState & TextToSpeechControls

export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [state, setState] = useState<TextToSpeechState>({
    isSupported: false,
    isSpeaking: false,
    isPaused: false,
    voices: [],
    error: null
  })

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'Text-to-speech not supported in this browser'
      }))
      return
    }

    setState(prev => ({ ...prev, isSupported: true }))

    // Load voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setState(prev => ({ ...prev, voices }))
    }

    // Some browsers load voices asynchronously
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const speak = useCallback((text: string, options: TextToSpeechOptions = {}) => {
    if (!window.speechSynthesis || !text.trim()) return

    // Cancel any existing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Apply options
    if (options.voice) utterance.voice = options.voice
    if (options.rate) utterance.rate = options.rate
    if (options.pitch) utterance.pitch = options.pitch
    if (options.volume) utterance.volume = options.volume
    if (options.lang) utterance.lang = options.lang

    // Event handlers
    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, isPaused: false, error: null }))
    }

    utterance.onend = () => {
      utteranceRef.current = null // Clear reference when finished
      setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }))
    }

    utterance.onpause = () => {
      setState(prev => ({ ...prev, isPaused: true }))
    }

    utterance.onresume = () => {
      setState(prev => ({ ...prev, isPaused: false }))
    }

    utterance.onerror = (event) => {
      utteranceRef.current = null // Clear reference on error
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        isPaused: false,
        error: `Speech synthesis error: ${event.error}`
      }))
    }

    // Handle interruption/cancellation
    utterance.onboundary = () => {
      // Check if speech was cancelled while speaking
      if (!window.speechSynthesis.speaking) {
        utteranceRef.current = null
        setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }))
      }
    }

    utteranceRef.current = utterance
    
    try {
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start text-to-speech'
      }))
    }
  }, [])

  const stop = useCallback(() => {
    if (!window.speechSynthesis) return
    
    console.log("🛑 Stopping speech synthesis...")
    
    // Cancel all speech
    window.speechSynthesis.cancel()
    
    // Clear the utterance reference
    utteranceRef.current = null
    
    // Force update the state immediately
    setState(prev => ({ 
      ...prev, 
      isSpeaking: false, 
      isPaused: false 
    }))
    
    console.log("✅ Speech stopped and state updated")
  }, [])

  const pause = useCallback(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.pause()
  }, [])

  const resume = useCallback(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.resume()
  }, [])

  const cancel = useCallback(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null // Clear the reference
    setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }))
  }, [])

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    cancel
  }
}
