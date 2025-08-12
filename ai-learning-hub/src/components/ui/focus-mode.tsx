"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  Timer,
  Focus,
  Coffee,
  Shield,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useImmersive } from '@/contexts/ImmersiveContext'

interface PomodoroTimer {
  isRunning: boolean
  isBreak: boolean
  isLongBreak: boolean
  timeLeft: number
  workDuration: number
  breakDuration: number
  longBreakDuration: number
  completedSessions: number
  sessionsUntilLongBreak: number
}

interface SessionStats {
  todaySessions: number
  totalSessions: number
  totalFocusTime: number
  todayFocusTime: number
  streak: number
  lastSessionDate: string
}

const ambientSounds = [
  { value: 'none', label: 'No Sound', description: 'Complete silence' },
  { value: 'rain', label: 'Rain', description: 'Gentle rainfall' },
  { value: 'forest', label: 'Forest', description: 'Birds and nature' },
  { value: 'ocean', label: 'Ocean Waves', description: 'Calming waves' },
  { value: 'coffee-shop', label: 'Coffee Shop', description: 'Background chatter' },
  { value: 'white-noise', label: 'White Noise', description: 'Pure white noise' },
  { value: 'brown-noise', label: 'Brown Noise', description: 'Deep, warm noise' }
]

export function FocusMode() {
  const { state, updateFocusSettings } = useImmersive()
  const { focusMode } = state.settings
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  const [timer, setTimer] = useState<PomodoroTimer>({
    isRunning: false,
    isBreak: false,
    isLongBreak: false,
    timeLeft: focusMode.workDuration * 60,
    workDuration: focusMode.workDuration,
    breakDuration: focusMode.breakDuration,
    longBreakDuration: 15, // 15 minute long break
    completedSessions: 0,
    sessionsUntilLongBreak: 4 // Long break every 4 sessions
  })

  const [sessionStats, setSessionStats] = useState<SessionStats>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pomodoroStats')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return {
      todaySessions: 0,
      totalSessions: 0,
      totalFocusTime: 0,
      todayFocusTime: 0,
      streak: 0,
      lastSessionDate: new Date().toDateString()
    }
  })

  const [audioError, setAudioError] = useState<string | null>(null)

  // Enhanced notification function with sound and vibration
  const playNotificationSound = useCallback(() => {
    // Create notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Create a pleasant notification sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.type = 'sine'
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log('Notification sound failed:', error)
    }
  }, [])

  const triggerVibration = useCallback(() => {
    // Vibrate on mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]) // Pattern: vibrate, pause, vibrate, pause, vibrate
    }
  }, [])

  const updateSessionStats = useCallback((completedWorkSession: boolean) => {
    if (!completedWorkSession) return

    const today = new Date().toDateString()
    const workDuration = timer.workDuration

    setSessionStats(prev => {
      const isNewDay = prev.lastSessionDate !== today
      const newStats = {
        ...prev,
        totalSessions: prev.totalSessions + 1,
        totalFocusTime: prev.totalFocusTime + workDuration,
        todaySessions: isNewDay ? 1 : prev.todaySessions + 1,
        todayFocusTime: isNewDay ? workDuration : prev.todayFocusTime + workDuration,
        streak: isNewDay && prev.todaySessions === 0 ? 1 : prev.streak + 1,
        lastSessionDate: today
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('pomodoroStats', JSON.stringify(newStats))
      }

      return newStats
    })
  }, [timer.workDuration])

  // Enhanced timer effect with better session tracking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (timer.isRunning && timer.timeLeft > 0) {
      interval = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1
        }))
      }, 1000)
    } else if (timer.timeLeft === 0) {
      // Timer completed - handle session transitions
      const wasWorkSession = !timer.isBreak
      
      setTimer(prev => {
        const completedSessions = wasWorkSession ? prev.completedSessions + 1 : prev.completedSessions
        const shouldTakeLongBreak = completedSessions > 0 && completedSessions % prev.sessionsUntilLongBreak === 0
        
        let nextTimeLeft: number
        let nextIsBreak: boolean
        let nextIsLongBreak: boolean

        if (prev.isBreak) {
          // Break just ended, start work session
          nextTimeLeft = prev.workDuration * 60
          nextIsBreak = false
          nextIsLongBreak = false
        } else {
          // Work session just ended, start break
          nextIsBreak = true
          if (shouldTakeLongBreak) {
            nextTimeLeft = prev.longBreakDuration * 60
            nextIsLongBreak = true
          } else {
            nextTimeLeft = prev.breakDuration * 60
            nextIsLongBreak = false
          }
        }

        return {
          ...prev,
          isRunning: false,
          isBreak: nextIsBreak,
          isLongBreak: nextIsLongBreak,
          timeLeft: nextTimeLeft,
          completedSessions
        }
      })

      // Update session statistics
      updateSessionStats(wasWorkSession)

      // Enhanced notifications with sound and vibration
      playNotificationSound()
      triggerVibration()

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const isBreakStarting = !timer.isBreak
        const isLongBreak = timer.completedSessions > 0 && timer.completedSessions % timer.sessionsUntilLongBreak === 0
        
        let title: string
        let body: string
        
        if (isBreakStarting) {
          if (isLongBreak) {
            title = 'Long Break Time! 🎉'
            body = `Great job! You've completed ${timer.completedSessions} sessions. Take a longer break.`
          } else {
            title = 'Break Time! ☕'
            body = 'Take a short break and relax.'
          }
        } else {
          title = 'Time to Focus! 🎯'
          body = 'Break time is over. Let\'s get back to work!'
        }

        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        })
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timer.isRunning, timer.timeLeft, timer.isBreak, timer.completedSessions, timer.sessionsUntilLongBreak, playNotificationSound, triggerVibration, updateSessionStats])

  // Update timer when settings change
  useEffect(() => {
    setTimer(prev => ({
      ...prev,
      workDuration: focusMode.workDuration,
      breakDuration: focusMode.breakDuration,
      timeLeft: prev.isBreak ? focusMode.breakDuration * 60 : focusMode.workDuration * 60
    }))
  }, [focusMode.workDuration, focusMode.breakDuration])

  // Audio management
  useEffect(() => {
    // Cleanup previous audio
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch (error) {
        // Ignore errors from cleanup
        console.debug('Audio cleanup error (ignored):', error)
      }
      audioRef.current = null
    }

    if (focusMode.ambientSound !== 'none' && focusMode.isEnabled) {
      try {
        setAudioError(null)
        
        // Create audio context for generating ambient sounds
        const generateAmbientSound = () => {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          let oscillators: OscillatorNode[] = []
          let gainNode: GainNode | null = null
          let filterNode: BiquadFilterNode | null = null
          let isContextClosed = false

          const playAmbientSound = () => {
            // Stop any existing oscillators
            oscillators.forEach(osc => {
              try {
                osc.stop()
              } catch (e) {
                // Ignore if already stopped
              }
            })
            oscillators = []

            gainNode = audioContext.createGain()
            filterNode = audioContext.createBiquadFilter()
            
            // Set volume based on settings
            gainNode.gain.setValueAtTime(focusMode.soundVolume / 100 * 0.3, audioContext.currentTime)
            
            // Connect nodes
            gainNode.connect(filterNode)
            filterNode.connect(audioContext.destination)

            // Ensure gainNode is not null before using it
            if (!gainNode || !filterNode) return

            switch (focusMode.ambientSound) {
              case 'rain':
                // Generate rain-like sound using noise
                const bufferSize = audioContext.sampleRate * 2
                const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
                const output = noiseBuffer.getChannelData(0)
                for (let i = 0; i < bufferSize; i++) {
                  output[i] = Math.random() * 2 - 1
                }
                const noiseSource = audioContext.createBufferSource()
                noiseSource.buffer = noiseBuffer
                noiseSource.loop = true
                filterNode.type = 'lowpass'
                filterNode.frequency.setValueAtTime(800, audioContext.currentTime)
                noiseSource.connect(gainNode)
                noiseSource.start()
                break

              case 'ocean':
                // Generate ocean wave sounds
                const oceanOsc = audioContext.createOscillator()
                oscillators.push(oceanOsc)
                oceanOsc.type = 'sine'
                oceanOsc.frequency.setValueAtTime(0.5, audioContext.currentTime)
                filterNode.type = 'lowpass'
                filterNode.frequency.setValueAtTime(200, audioContext.currentTime)
                
                // Create LFO for wave-like modulation
                const lfo = audioContext.createOscillator()
                const lfoGain = audioContext.createGain()
                oscillators.push(lfo)
                lfo.frequency.setValueAtTime(0.1, audioContext.currentTime)
                lfoGain.gain.setValueAtTime(100, audioContext.currentTime)
                lfo.connect(lfoGain)
                lfoGain.connect(oceanOsc.frequency)
                
                oceanOsc.connect(gainNode)
                oceanOsc.start()
                lfo.start()
                break

              case 'white-noise':
                // Generate white noise
                const whiteNoiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate)
                const whiteNoiseOutput = whiteNoiseBuffer.getChannelData(0)
                for (let i = 0; i < whiteNoiseBuffer.length; i++) {
                  whiteNoiseOutput[i] = Math.random() * 2 - 1
                }
                const whiteNoiseSource = audioContext.createBufferSource()
                whiteNoiseSource.buffer = whiteNoiseBuffer
                whiteNoiseSource.loop = true
                whiteNoiseSource.connect(gainNode)
                whiteNoiseSource.start()
                break

              case 'brown-noise':
                // Generate brown noise
                const brownNoiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate)
                const brownNoiseOutput = brownNoiseBuffer.getChannelData(0)
                let lastOut = 0
                for (let i = 0; i < brownNoiseBuffer.length; i++) {
                  const white = Math.random() * 2 - 1
                  brownNoiseOutput[i] = (lastOut + (0.02 * white)) / 1.02
                  lastOut = brownNoiseOutput[i]
                  brownNoiseOutput[i] *= 3.5
                }
                const brownNoiseSource = audioContext.createBufferSource()
                brownNoiseSource.buffer = brownNoiseBuffer
                brownNoiseSource.loop = true
                filterNode.type = 'lowpass'
                filterNode.frequency.setValueAtTime(300, audioContext.currentTime)
                brownNoiseSource.connect(gainNode)
                brownNoiseSource.start()
                break

              case 'forest':
                // Generate forest-like sounds with multiple oscillators
                const frequencies = [200, 400, 800, 1200]
                frequencies.forEach((freq, index) => {
                  const osc = audioContext.createOscillator()
                  const oscGain = audioContext.createGain()
                  oscillators.push(osc)
                  osc.type = 'sine'
                  osc.frequency.setValueAtTime(freq + Math.random() * 100, audioContext.currentTime)
                  oscGain.gain.setValueAtTime(0.1 / frequencies.length, audioContext.currentTime)
                  
                  // Add random modulation
                  const modLfo = audioContext.createOscillator()
                  const modGain = audioContext.createGain()
                  oscillators.push(modLfo)
                  modLfo.frequency.setValueAtTime(Math.random() * 2, audioContext.currentTime)
                  modGain.gain.setValueAtTime(20, audioContext.currentTime)
                  modLfo.connect(modGain)
                  modGain.connect(osc.frequency)
                  
                  osc.connect(oscGain)
                  if (gainNode) oscGain.connect(gainNode)
                  osc.start()
                  modLfo.start()
                })
                break

              case 'coffee-shop':
                // Generate café ambience with multiple layers
                const cafeFreqs = [100, 250, 500, 1000, 2000]
                cafeFreqs.forEach(freq => {
                  const cafeOsc = audioContext.createOscillator()
                  const cafeGain = audioContext.createGain()
                  oscillators.push(cafeOsc)
                  cafeOsc.type = 'sawtooth'
                  cafeOsc.frequency.setValueAtTime(freq + Math.random() * 50, audioContext.currentTime)
                  cafeGain.gain.setValueAtTime(0.05 / cafeFreqs.length, audioContext.currentTime)
                  cafeOsc.connect(cafeGain)
                  if (gainNode) cafeGain.connect(gainNode)
                  cafeOsc.start()
                })
                break
            }
          }

          if (audioContext.state === 'suspended') {
            audioContext.resume().then(playAmbientSound)
          } else {
            playAmbientSound()
          }

          // Store reference for cleanup with proper error handling
          audioRef.current = {
            pause: () => {
              if (isContextClosed) return
              
              // Stop all oscillators
              oscillators.forEach(osc => {
                try {
                  osc.stop()
                } catch (e) {
                  // Ignore if already stopped
                }
              })
              
              // Close audio context safely
              if (audioContext.state !== 'closed') {
                audioContext.close().then(() => {
                  isContextClosed = true
                }).catch((e) => {
                  console.debug('AudioContext close error (ignored):', e)
                  isContextClosed = true
                })
              }
            }
          } as any
        }

        generateAmbientSound()
        console.log(`Playing ambient sound: ${focusMode.ambientSound} at volume ${focusMode.soundVolume}%`)
        
      } catch (error) {
        console.error('Audio error:', error)
        setAudioError('Failed to load ambient sound. Your browser may not support Web Audio API.')
      }
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause()
        } catch (error) {
          // Ignore cleanup errors
          console.debug('Cleanup error (ignored):', error)
        }
      }
    }
  }, [focusMode.ambientSound, focusMode.isEnabled, focusMode.soundVolume])

  // Memoized handlers to prevent re-renders
  const handleToggleFocus = useCallback(() => {
    updateFocusSettings({ isEnabled: !focusMode.isEnabled })
  }, [focusMode.isEnabled, updateFocusSettings])

  const handleSoundChange = useCallback((sound: string) => {
    updateFocusSettings({ ambientSound: sound })
  }, [updateFocusSettings])

  const handleVolumeChange = useCallback((volume: number[]) => {
    updateFocusSettings({ soundVolume: volume[0] })
  }, [updateFocusSettings])

  const handlePomodoroToggle = useCallback(() => {
    updateFocusSettings({ pomodoroEnabled: !focusMode.pomodoroEnabled })
  }, [focusMode.pomodoroEnabled, updateFocusSettings])

  const handleWorkDurationChange = useCallback((duration: number[]) => {
    updateFocusSettings({ workDuration: duration[0] })
  }, [updateFocusSettings])

  const handleBreakDurationChange = useCallback((duration: number[]) => {
    updateFocusSettings({ breakDuration: duration[0] })
  }, [updateFocusSettings])

  const handleDistractionsToggle = useCallback(() => {
    updateFocusSettings({ distractionsBlocked: !focusMode.distractionsBlocked })
  }, [focusMode.distractionsBlocked, updateFocusSettings])

  const toggleTimer = useCallback(() => {
    setTimer(prev => ({ ...prev, isRunning: !prev.isRunning }))
  }, [])

  const resetTimer = useCallback(() => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
      timeLeft: prev.isBreak ? prev.breakDuration * 60 : prev.workDuration * 60
    }))
  }, [])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Background tab handling - ensures timer continues when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof window === 'undefined') return

      if (document.hidden && timer.isRunning) {
        // Store timestamp when tab becomes hidden
        localStorage.setItem('timerHiddenAt', Date.now().toString())
        localStorage.setItem('timerStateWhenHidden', JSON.stringify({
          timeLeft: timer.timeLeft,
          isBreak: timer.isBreak,
          isLongBreak: timer.isLongBreak
        }))
      } else if (!document.hidden && timer.isRunning) {
        // Calculate elapsed time when tab becomes visible
        const hiddenAt = localStorage.getItem('timerHiddenAt')
        const savedState = localStorage.getItem('timerStateWhenHidden')
        
        if (hiddenAt && savedState) {
          const elapsed = Math.floor((Date.now() - parseInt(hiddenAt)) / 1000)
          const parsedState = JSON.parse(savedState)
          
          setTimer(prev => ({
            ...prev,
            timeLeft: Math.max(0, parsedState.timeLeft - elapsed)
          }))
          
          // Clean up stored data
          localStorage.removeItem('timerHiddenAt')
          localStorage.removeItem('timerStateWhenHidden')
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [timer.isRunning, timer.timeLeft, timer.isBreak, timer.isLongBreak])

  return (
    <div className="space-y-6">
      {/* Focus Mode Toggle */}
      <Card className={focusMode.isEnabled ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Focus className="h-5 w-5" />
                Focus Mode
                {focusMode.isEnabled && (
                  <Badge variant="default" className="ml-2">Active</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Create a distraction-free learning environment
              </CardDescription>
            </div>
            <Switch
              checked={focusMode.isEnabled}
              onCheckedChange={handleToggleFocus}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Pomodoro Timer */}
      {focusMode.isEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Pomodoro Timer
              </CardTitle>
              <Switch
                checked={focusMode.pomodoroEnabled}
                onCheckedChange={handlePomodoroToggle}
              />
            </div>
          </CardHeader>
          {focusMode.pomodoroEnabled && (
            <CardContent className="space-y-6">
              {/* Timer Display */}
              <div className="text-center space-y-4">
                <div className="text-6xl font-mono font-bold text-blue-600">
                  {formatTime(timer.timeLeft)}
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {timer.isBreak ? (
                    timer.isLongBreak ? (
                      <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        <Coffee className="h-3 w-3" />
                        Long Break Time
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Coffee className="h-3 w-3" />
                        Short Break
                      </Badge>
                    )
                  ) : (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Focus className="h-3 w-3" />
                      Focus Time
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Sessions: {timer.completedSessions}
                  </Badge>
                  {timer.completedSessions > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Next long break: {timer.sessionsUntilLongBreak - (timer.completedSessions % timer.sessionsUntilLongBreak)} sessions
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button onClick={toggleTimer} size="lg">
                  {timer.isRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
                <Button onClick={resetTimer} variant="outline" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Timer Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Work Duration</label>
                  <div className="px-3 py-2 border rounded">
                    <Slider
                      value={[focusMode.workDuration]}
                      onValueChange={handleWorkDurationChange}
                      min={5}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {focusMode.workDuration} minutes
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Short Break</label>
                  <div className="px-3 py-2 border rounded">
                    <Slider
                      value={[focusMode.breakDuration]}
                      onValueChange={handleBreakDurationChange}
                      min={1}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {focusMode.breakDuration} minutes
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Long Break</label>
                  <div className="px-3 py-2 border rounded">
                    <Slider
                      value={[timer.longBreakDuration]}
                      onValueChange={(value) => setTimer(prev => ({ ...prev, longBreakDuration: value[0] }))}
                      min={10}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {timer.longBreakDuration} minutes (every {timer.sessionsUntilLongBreak} sessions)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Ambient Sounds */}
      {focusMode.isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Ambient Sounds
            </CardTitle>
            <CardDescription>
              Background sounds to help you concentrate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {audioError && (
              <Alert>
                <AlertDescription>{audioError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Sound Type</label>
              <Select value={focusMode.ambientSound} onValueChange={handleSoundChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select ambient sound" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {ambientSounds.map((sound) => (
                    <SelectItem key={sound.value} value={sound.value} className="cursor-pointer">
                      <div>
                        <div className="font-medium">{sound.label}</div>
                        <div className="text-xs text-muted-foreground">{sound.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {focusMode.ambientSound !== 'none' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Volume</label>
                  <div className="flex items-center gap-2">
                    {focusMode.soundVolume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                    <span className="text-sm">{focusMode.soundVolume}%</span>
                  </div>
                </div>
                <Slider
                  value={[focusMode.soundVolume]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {focusMode.isEnabled && focusMode.pomodoroEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure how you&apos;ll be notified when sessions end
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Volume2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <strong>Enhanced notifications include:</strong>
                  <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                    <li>🔔 Browser notifications with custom messages</li>
                    <li>🔊 Audio notification sounds</li>
                    <li>📱 Mobile vibration (when supported)</li>
                    <li>🎯 Different alerts for work, short breaks, and long breaks</li>
                    <li>📊 Session completion tracking and statistics</li>
                  </ul>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Notifications work even when the browser tab is in the background.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            
            {Notification.permission === 'denied' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Notifications blocked:</strong> Please enable notifications in your browser settings to receive session alerts.
                </AlertDescription>
              </Alert>
            )}
            
            {Notification.permission === 'default' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Enable notifications:</strong> Click &quot;Allow&quot; when prompted to receive session completion alerts.
                </AlertDescription>
              </Alert>
            )}

            {Notification.permission === 'granted' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Notifications enabled:</strong> You&apos;ll receive alerts when sessions complete, including sound and vibration.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Distraction Blocking */}
      {focusMode.isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Distraction Blocking
            </CardTitle>
            <CardDescription>
              Block distracting websites and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Block Distractions</div>
                <div className="text-sm text-muted-foreground">
                  Hide social media and entertainment sites
                </div>
              </div>
              <Switch
                checked={focusMode.distractionsBlocked}
                onCheckedChange={handleDistractionsToggle}
              />
            </div>
            
            {focusMode.distractionsBlocked && (
              <Alert className="mt-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Distraction blocking is active. Some websites may be inaccessible during focus sessions.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
