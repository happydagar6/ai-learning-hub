"use client"

import React, { useEffect, useCallback, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Moon, 
  Sun, 
  Eye, 
  Monitor,
  Clock,
  Settings,
  Lightbulb,
  Contrast
} from 'lucide-react'
import { useImmersive } from '@/contexts/ImmersiveContext'

interface EyeBreakTimer {
  isEnabled: boolean
  timeUntilBreak: number
  isBreakTime: boolean
  breakDuration: number
}

export function DarkStudyMode() {
  const { state, updateDarkSettings } = useImmersive()
  const { darkMode } = state.settings
  
  const [eyeBreakTimer, setEyeBreakTimer] = useState<EyeBreakTimer>({
    isEnabled: darkMode.eyeBreakReminders,
    timeUntilBreak: 20 * 60, // 20 minutes
    isBreakTime: false,
    breakDuration: 20 // 20 seconds
  })

  // Eye break timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (eyeBreakTimer.isEnabled && darkMode.isEnabled) {
      interval = setInterval(() => {
        setEyeBreakTimer(prev => {
          if (prev.isBreakTime) {
            if (prev.breakDuration > 0) {
              return { ...prev, breakDuration: prev.breakDuration - 1 }
            } else {
              return {
                ...prev,
                isBreakTime: false,
                timeUntilBreak: 20 * 60,
                breakDuration: 20
              }
            }
          } else {
            if (prev.timeUntilBreak > 0) {
              return { ...prev, timeUntilBreak: prev.timeUntilBreak - 1 }
            } else {
              // Show eye break notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Eye Break Time!', {
                  body: 'Look at something 20 feet away for 20 seconds',
                  icon: '/favicon.ico'
                })
              }
              return { ...prev, isBreakTime: true }
            }
          }
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [eyeBreakTimer.isEnabled, darkMode.isEnabled])

  // Apply dark mode styles to document
  useEffect(() => {
    if (darkMode.isEnabled) {
      document.documentElement.classList.add('dark')
      document.body.style.filter = `brightness(${darkMode.brightness}%) contrast(${darkMode.contrast}%)`
      
      if (darkMode.blueLight) {
        document.body.style.filter += ' sepia(10%) saturate(50%)'
      }
    } else {
      document.documentElement.classList.remove('dark')
      document.body.style.filter = ''
    }

    return () => {
      // Cleanup on unmount
      document.documentElement.classList.remove('dark')
      document.body.style.filter = ''
    }
  }, [darkMode.isEnabled, darkMode.brightness, darkMode.contrast, darkMode.blueLight])

  // Memoized handlers
  const handleToggleDarkMode = useCallback(() => {
    updateDarkSettings({ isEnabled: !darkMode.isEnabled })
  }, [darkMode.isEnabled, updateDarkSettings])

  const handleBrightnessChange = useCallback((brightness: number[]) => {
    updateDarkSettings({ brightness: brightness[0] })
  }, [updateDarkSettings])

  const handleContrastChange = useCallback((contrast: number[]) => {
    updateDarkSettings({ contrast: contrast[0] })
  }, [updateDarkSettings])

  const handleBlueLightToggle = useCallback(() => {
    updateDarkSettings({ blueLight: !darkMode.blueLight })
  }, [darkMode.blueLight, updateDarkSettings])

  const handleEyeBreakToggle = useCallback(() => {
    const newValue = !darkMode.eyeBreakReminders
    updateDarkSettings({ eyeBreakReminders: newValue })
    setEyeBreakTimer(prev => ({ ...prev, isEnabled: newValue }))
  }, [darkMode.eyeBreakReminders, updateDarkSettings])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const dismissEyeBreak = useCallback(() => {
    setEyeBreakTimer(prev => ({
      ...prev,
      isBreakTime: false,
      timeUntilBreak: 20 * 60,
      breakDuration: 20
    }))
  }, [])

  return (
    <div className="space-y-6">
      {/* Dark Mode Toggle */}
      <Card className={darkMode.isEnabled ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Dark Study Mode
                {darkMode.isEnabled && (
                  <Badge variant="default" className="ml-2">Active</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Reduce eye strain during extended study sessions
              </CardDescription>
            </div>
            <Switch
              checked={darkMode.isEnabled}
              onCheckedChange={handleToggleDarkMode}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Eye Break Reminder */}
      {darkMode.isEnabled && eyeBreakTimer.isBreakTime && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <Eye className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">Eye Break Time!</div>
              <div className="text-sm">
                Look at something 20 feet away for {eyeBreakTimer.breakDuration} seconds
              </div>
            </div>
            <Button onClick={dismissEyeBreak} size="sm" variant="outline">
              Done
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Display Settings */}
      {darkMode.isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Display Settings
            </CardTitle>
            <CardDescription>
              Customize your display for comfortable reading
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Brightness</label>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <span className="text-sm">{darkMode.brightness}%</span>
                </div>
              </div>
              <Slider
                value={[darkMode.brightness]}
                onValueChange={handleBrightnessChange}
                min={20}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="text-xs text-gray-500">
                Lower brightness reduces eye strain in dark environments
              </div>
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Contrast</label>
                <div className="flex items-center gap-2">
                  <Contrast className="h-4 w-4" />
                  <span className="text-sm">{darkMode.contrast}%</span>
                </div>
              </div>
              <Slider
                value={[darkMode.contrast]}
                onValueChange={handleContrastChange}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
              <div className="text-xs text-gray-500">
                Adjust contrast for better text readability
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blue Light Filter */}
      {darkMode.isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Blue Light Filter
            </CardTitle>
            <CardDescription>
              Reduce blue light emission for better sleep
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Blue Light Filter</div>
                <div className="text-sm text-gray-500">
                  Warmer colors reduce eye strain and improve sleep quality
                </div>
              </div>
              <Switch
                checked={darkMode.blueLight}
                onCheckedChange={handleBlueLightToggle}
              />
            </div>
            
            {darkMode.blueLight && (
              <Alert className="mt-4">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  Blue light filter is active. Colors may appear warmer than usual.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Eye Break Reminders */}
      {darkMode.isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Eye Break Reminders
            </CardTitle>
            <CardDescription>
              Follow the 20-20-20 rule for healthy eyes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Eye Break Reminders</div>
                <div className="text-sm text-gray-500">
                  Reminds you to take breaks every 20 minutes
                </div>
              </div>
              <Switch
                checked={darkMode.eyeBreakReminders}
                onCheckedChange={handleEyeBreakToggle}
              />
            </div>

            {darkMode.eyeBreakReminders && !eyeBreakTimer.isBreakTime && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Next eye break in:</div>
                    <div className="text-2xl font-mono font-bold text-blue-600">
                      {formatTime(eyeBreakTimer.timeUntilBreak)}
                    </div>
                  </div>
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            )}

            {darkMode.eyeBreakReminders && (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <strong>20-20-20 Rule:</strong> Every 20 minutes, look at something 20 feet away for 20 seconds.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {darkMode.isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Study Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>Position your screen 20-24 inches from your eyes</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>Keep the top of your screen at or below eye level</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>Ensure adequate ambient lighting to reduce contrast</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>Blink frequently to keep your eyes moist</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>Use artificial tears if your eyes feel dry</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
