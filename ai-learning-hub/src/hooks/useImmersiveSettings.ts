"use client"

import { useState, useEffect, useCallback } from 'react'
import { ImmersiveSettings } from '@/contexts/ImmersiveContext'

interface UseImmersiveSettingsReturn {
  settings: ImmersiveSettings | null
  isLoading: boolean
  error: string | null
  updateSettings: (newSettings: Partial<ImmersiveSettings>) => Promise<void>
  resetSettings: () => Promise<void>
}

export function useImmersiveSettings(): UseImmersiveSettingsReturn {
  const [settings, setSettings] = useState<ImmersiveSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Default settings
  const defaultSettings: ImmersiveSettings = {
    focusMode: {
      isEnabled: false,
      ambientSound: 'none',
      soundVolume: 50,
      pomodoroEnabled: false,
      workDuration: 25,
      breakDuration: 5,
      distractionsBlocked: false
    },
    darkMode: {
      isEnabled: false,
      brightness: 80,
      contrast: 100,
      blueLight: true,
      eyeBreakReminders: true
    },
    accessibility: {
      voiceNavigation: false,
      highContrast: false,
      fontSize: 'normal',
      fontFamily: 'default',
      reduceMotion: false,
      screenReader: false
    }
  }

  // Load settings from localStorage
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 300))

      const saved = localStorage.getItem('immersive-settings')
      if (saved) {
        const parsedSettings = JSON.parse(saved)
        // Merge with defaults to ensure all properties exist
        const mergedSettings = {
          ...defaultSettings,
          ...parsedSettings,
          focusMode: { ...defaultSettings.focusMode, ...parsedSettings.focusMode },
          darkMode: { ...defaultSettings.darkMode, ...parsedSettings.darkMode },
          accessibility: { ...defaultSettings.accessibility, ...parsedSettings.accessibility }
        }
        setSettings(mergedSettings)
      } else {
        setSettings(defaultSettings)
      }
    } catch (err) {
      setError('Failed to load immersive settings')
      setSettings(defaultSettings)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = useCallback(async (newSettings: ImmersiveSettings) => {
    try {
      setError(null)
      
      // Validate settings before saving
      if (!newSettings) {
        throw new Error('Invalid settings provided')
      }

      localStorage.setItem('immersive-settings', JSON.stringify(newSettings))
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (err) {
      setError('Failed to save immersive settings')
      throw err
    }
  }, [])

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<ImmersiveSettings>) => {
    if (!settings) return

    try {
      setError(null)
      
      const updatedSettings = {
        ...settings,
        ...newSettings,
        // Deep merge for nested objects
        focusMode: { ...settings.focusMode, ...newSettings.focusMode },
        darkMode: { ...settings.darkMode, ...newSettings.darkMode },
        accessibility: { ...settings.accessibility, ...newSettings.accessibility }
      }

      setSettings(updatedSettings)
      await saveSettings(updatedSettings)
      
    } catch (err) {
      setError('Failed to update settings')
    }
  }, [settings, saveSettings])

  // Reset settings to defaults
  const resetSettings = useCallback(async () => {
    try {
      setError(null)
      setSettings(defaultSettings)
      await saveSettings(defaultSettings)
    } catch (err) {
      setError('Failed to reset settings')
    }
  }, [saveSettings])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings
  }
}
