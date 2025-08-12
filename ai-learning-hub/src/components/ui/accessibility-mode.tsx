"use client"

import React, { useEffect, useCallback, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Accessibility, 
  Mic, 
  Volume2,
  Eye,
  Type,
  MousePointer,
  Settings,
  Zap,
  Info
} from 'lucide-react'
import { useImmersive } from '@/contexts/ImmersiveContext'

// Voice commands for navigation
const voiceCommands = [
  'go to dashboard',
  'go to upload',
  'go to study plan',
  'go to flashcards',
  'go to immersive',
  'scroll up',
  'scroll down',
  'click button',
  'read page',
  'help'
]

interface VoiceRecognition {
  isListening: boolean
  isSupported: boolean
  lastCommand: string | null
  confidence: number
}

export function AccessibilityMode() {
  const { state, updateAccessibilitySettings } = useImmersive()
  const { accessibility } = state.settings
  
  const [voiceState, setVoiceState] = useState<VoiceRecognition>({
    isListening: false,
    isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    lastCommand: null,
    confidence: 0
  })

  const [speechSynthesis, setSpeechSynthesis] = useState({
    isReading: false,
    voices: [] as SpeechSynthesisVoice[]
  })

  // Initialize speech synthesis voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        setSpeechSynthesis(prev => ({
          ...prev,
          voices: window.speechSynthesis.getVoices()
        }))
      }

      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
  }, [])

  // Apply accessibility settings
  useEffect(() => {
    const root = document.documentElement

    // High contrast mode
    if (accessibility.highContrast) {
      root.style.setProperty('--color-background', '#000000')
      root.style.setProperty('--color-foreground', '#ffffff')
      root.style.setProperty('--color-primary', '#ffff00')
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
      // Reset to default colors
      root.style.removeProperty('--color-background')
      root.style.removeProperty('--color-foreground')
      root.style.removeProperty('--color-primary')
    }

    // Font size
    const fontSizeMap = {
      normal: '16px',
      large: '20px',
      'extra-large': '24px'
    }
    root.style.fontSize = fontSizeMap[accessibility.fontSize as 'normal' | 'large' | 'extra-large']

    // Font family
    const fontFamilyMap = {
      default: 'Inter, system-ui, sans-serif',
      dyslexia: '"OpenDyslexic", "Comic Sans MS", cursive',
      mono: '"Fira Code", "Courier New", monospace'
    }
    document.body.style.fontFamily = fontFamilyMap[accessibility.fontFamily as 'default' | 'dyslexia' | 'mono']

    // Reduce motion
    if (accessibility.reduceMotion) {
      root.style.setProperty('--motion-duration', '0.01ms')
      root.classList.add('reduce-motion')
    } else {
      root.style.removeProperty('--motion-duration')
      root.classList.remove('reduce-motion')
    }

    return () => {
      // Cleanup
      root.classList.remove('high-contrast', 'reduce-motion')
      root.style.fontSize = ''
      document.body.style.fontFamily = ''
    }
  }, [accessibility])

  // Voice recognition setup
  useEffect(() => {
    let recognition: any = null

    if (accessibility.voiceNavigation && voiceState.isSupported) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      recognition = new SpeechRecognition()
      
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setVoiceState(prev => ({ ...prev, isListening: true }))
      }

      recognition.onend = () => {
        setVoiceState(prev => ({ ...prev, isListening: false }))
        // Auto-restart if voice navigation is still enabled
        if (accessibility.voiceNavigation) {
          setTimeout(() => recognition?.start(), 1000)
        }
      }

      recognition.onresult = (event: any) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim()
        const confidence = event.results[event.results.length - 1][0].confidence

        setVoiceState(prev => ({
          ...prev,
          lastCommand: command,
          confidence
        }))

        handleVoiceCommand(command)
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setVoiceState(prev => ({ ...prev, isListening: false }))
      }

      recognition.start()
    }

    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
  }, [accessibility.voiceNavigation, voiceState.isSupported])

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    const router = (window as any).next?.router

    switch (command) {
      case 'go to dashboard':
        router?.push('/dashboard')
        speak('Navigating to dashboard')
        break
      case 'go to upload':
        router?.push('/dashboard/upload')
        speak('Navigating to upload')
        break
      case 'go to study plan':
        router?.push('/dashboard/study-plan')
        speak('Navigating to study plan')
        break
      case 'go to flashcards':
        router?.push('/dashboard/flashcards')
        speak('Navigating to flashcards')
        break
      case 'go to immersive':
        router?.push('/dashboard/immersive')
        speak('Navigating to immersive mode')
        break
      case 'scroll up':
        window.scrollBy(0, -200)
        speak('Scrolling up')
        break
      case 'scroll down':
        window.scrollBy(0, 200)
        speak('Scrolling down')
        break
      case 'read page':
        readPageContent()
        break
      case 'help':
        speak('Available commands: ' + voiceCommands.join(', '))
        break
      default:
        if (command.includes('click')) {
          // Try to find and click buttons with matching text
          const buttons = document.querySelectorAll('button')
          const target = Array.from(buttons).find(btn => 
            btn.textContent?.toLowerCase().includes(command.replace('click ', ''))
          )
          if (target) {
            (target as HTMLElement).click()
            speak('Button clicked')
          }
        }
    }
  }, [])

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window && accessibility.screenReader) {
      window.speechSynthesis.cancel() // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      utterance.volume = 0.8
      
      // Use a preferred voice if available
      const preferredVoice = speechSynthesis.voices.find(voice => 
        voice.lang.startsWith('en') && voice.localService
      )
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      window.speechSynthesis.speak(utterance)
    }
  }, [accessibility.screenReader, speechSynthesis.voices])

  // Read page content
  const readPageContent = useCallback(() => {
    const mainContent = document.querySelector('main')
    const headings = mainContent?.querySelectorAll('h1, h2, h3')
    const paragraphs = mainContent?.querySelectorAll('p')
    
    let content = 'Page content: '
    
    headings?.forEach(heading => {
      content += heading.textContent + '. '
    })
    
    paragraphs?.forEach((paragraph, index) => {
      if (index < 3) { // Limit to first 3 paragraphs
        content += paragraph.textContent + '. '
      }
    })

    speak(content)
  }, [speak])

  // Memoized handlers
  const handleVoiceToggle = useCallback(() => {
    updateAccessibilitySettings({ voiceNavigation: !accessibility.voiceNavigation })
  }, [accessibility.voiceNavigation, updateAccessibilitySettings])

  const handleHighContrastToggle = useCallback(() => {
    updateAccessibilitySettings({ highContrast: !accessibility.highContrast })
  }, [accessibility.highContrast, updateAccessibilitySettings])

  const handleFontSizeChange = useCallback((fontSize: 'normal' | 'large' | 'extra-large') => {
    updateAccessibilitySettings({ fontSize })
  }, [updateAccessibilitySettings])

  const handleFontFamilyChange = useCallback((fontFamily: 'default' | 'dyslexia' | 'mono') => {
    updateAccessibilitySettings({ fontFamily })
  }, [updateAccessibilitySettings])

  const handleReduceMotionToggle = useCallback(() => {
    updateAccessibilitySettings({ reduceMotion: !accessibility.reduceMotion })
  }, [accessibility.reduceMotion, updateAccessibilitySettings])

  const handleScreenReaderToggle = useCallback(() => {
    updateAccessibilitySettings({ screenReader: !accessibility.screenReader })
  }, [accessibility.screenReader, updateAccessibilitySettings])

  return (
    <div className="space-y-6">
      {/* Accessibility Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility Suite
            <Badge variant="secondary">Universal Access</Badge>
          </CardTitle>
          <CardDescription>
            Customize the interface for your specific needs and preferences
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Voice Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Navigation
                {accessibility.voiceNavigation && voiceState.isListening && (
                  <Badge variant="default" className="ml-2 animate-pulse">Listening</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Navigate the interface using voice commands
              </CardDescription>
            </div>
            <Switch
              checked={accessibility.voiceNavigation}
              onCheckedChange={handleVoiceToggle}
              disabled={!voiceState.isSupported}
            />
          </div>
        </CardHeader>
        
        {accessibility.voiceNavigation && (
          <CardContent className="space-y-4">
            {!voiceState.isSupported && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Voice navigation is not supported in your browser. Please use Chrome, Edge, or Safari.
                </AlertDescription>
              </Alert>
            )}

            {voiceState.lastCommand && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-sm font-medium">Last Command:</div>
                <div className="text-lg">&ldquo;{voiceState.lastCommand}&rdquo;</div>
                <div className="text-xs text-gray-500">
                  Confidence: {Math.round(voiceState.confidence * 100)}%
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">Available Commands:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {voiceCommands.map((command, index) => (
                  <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    &ldquo;{command}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Screen Reader */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Screen Reader
              </CardTitle>
              <CardDescription>
                Text-to-speech for page content and navigation
              </CardDescription>
            </div>
            <Switch
              checked={accessibility.screenReader}
              onCheckedChange={handleScreenReaderToggle}
            />
          </div>
        </CardHeader>
        
        {accessibility.screenReader && (
          <CardContent>
            <div className="space-y-4">
              <Button onClick={readPageContent} className="w-full">
                <Volume2 className="h-4 w-4 mr-2" />
                Read Page Content
              </Button>
              
              <Alert>
                <Volume2 className="h-4 w-4" />
                <AlertDescription>
                  Screen reader is active. Page content and navigation will be announced.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visual Settings
          </CardTitle>
          <CardDescription>
            Adjust visual elements for better readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">High Contrast Mode</div>
              <div className="text-sm text-gray-500">
                Enhanced contrast for better visibility
              </div>
            </div>
            <Switch
              checked={accessibility.highContrast}
              onCheckedChange={handleHighContrastToggle}
            />
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Size</label>
            <Select value={accessibility.fontSize} onValueChange={handleFontSizeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="normal" className="cursor-pointer">Normal (16px)</SelectItem>
                <SelectItem value="large" className="cursor-pointer">Large (20px)</SelectItem>
                <SelectItem value="extra-large" className="cursor-pointer">Extra Large (24px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Family</label>
            <Select value={accessibility.fontFamily} onValueChange={handleFontFamilyChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="default" className="cursor-pointer">Default (Inter)</SelectItem>
                <SelectItem value="dyslexia" className="cursor-pointer">Dyslexia-Friendly (OpenDyslexic)</SelectItem>
                <SelectItem value="mono" className="cursor-pointer">Monospace (Fira Code)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Reduce Motion</div>
              <div className="text-sm text-gray-500">
                Minimize animations and transitions
              </div>
            </div>
            <Switch
              checked={accessibility.reduceMotion}
              onCheckedChange={handleReduceMotionToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Navigation Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Keyboard Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Tab</kbd>
                <span>Navigate forward</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Shift + Tab</kbd>
                <span>Navigate backward</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd>
                <span>Activate button/link</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Space</kbd>
                <span>Toggle checkbox/button</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd>
                <span>Close dialog/menu</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Arrow Keys</kbd>
                <span>Navigate lists/menus</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
