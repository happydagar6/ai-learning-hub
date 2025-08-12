"use client"

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { useTheme } from './ThemeContext'

// Types
export interface ImmersiveSettings {
  focusMode: {
    isEnabled: boolean
    ambientSound: string
    soundVolume: number
    pomodoroEnabled: boolean
    workDuration: number
    breakDuration: number
    distractionsBlocked: boolean
  }
  darkMode: {
    isEnabled: boolean
    brightness: number
    contrast: number
    blueLight: boolean
    eyeBreakReminders: boolean
  }
  accessibility: {
    voiceNavigation: boolean
    highContrast: boolean
    fontSize: 'normal' | 'large' | 'extra-large'
    fontFamily: 'default' | 'dyslexia' | 'mono'
    reduceMotion: boolean
    screenReader: boolean
  }
}

interface ImmersiveState {
  settings: ImmersiveSettings
  isLoading: boolean
  error: string | null
  activeMode: 'focus' | 'dark' | 'accessibility' | null
}

type ImmersiveAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: Partial<ImmersiveSettings> }
  | { type: 'SET_ACTIVE_MODE'; payload: ImmersiveState['activeMode'] }
  | { type: 'UPDATE_FOCUS_SETTINGS'; payload: Partial<ImmersiveSettings['focusMode']> }
  | { type: 'UPDATE_DARK_SETTINGS'; payload: Partial<ImmersiveSettings['darkMode']> }
  | { type: 'UPDATE_ACCESSIBILITY_SETTINGS'; payload: Partial<ImmersiveSettings['accessibility']> }

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

const initialState: ImmersiveState = {
  settings: defaultSettings,
  isLoading: false,
  error: null,
  activeMode: null
}

// Reducer
function immersiveReducer(state: ImmersiveState, action: ImmersiveAction): ImmersiveState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_SETTINGS':
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload }
      }
    
    case 'SET_ACTIVE_MODE':
      return { ...state, activeMode: action.payload }
    
    case 'UPDATE_FOCUS_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          focusMode: { ...state.settings.focusMode, ...action.payload }
        }
      }
    
    case 'UPDATE_DARK_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          darkMode: { ...state.settings.darkMode, ...action.payload }
        }
      }
    
    case 'UPDATE_ACCESSIBILITY_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          accessibility: { ...state.settings.accessibility, ...action.payload }
        }
      }
    
    default:
      return state
  }
}

// Context
interface ImmersiveContextType {
  state: ImmersiveState
  updateFocusSettings: (settings: Partial<ImmersiveSettings['focusMode']>) => void
  updateDarkSettings: (settings: Partial<ImmersiveSettings['darkMode']>) => void
  updateAccessibilitySettings: (settings: Partial<ImmersiveSettings['accessibility']>) => void
  setActiveMode: (mode: ImmersiveState['activeMode']) => void
  saveSettings: () => Promise<void>
  loadSettings: () => Promise<void>
}

const ImmersiveContext = createContext<ImmersiveContextType | undefined>(undefined)

// Provider
export function ImmersiveProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(immersiveReducer, initialState)
  const { setTheme, effectiveTheme } = useTheme()

  // Memoized action creators to prevent re-renders
  const updateFocusSettings = useCallback((settings: Partial<ImmersiveSettings['focusMode']>) => {
    dispatch({ type: 'UPDATE_FOCUS_SETTINGS', payload: settings })
  }, [])

  const updateDarkSettings = useCallback((settings: Partial<ImmersiveSettings['darkMode']>) => {
    dispatch({ type: 'UPDATE_DARK_SETTINGS', payload: settings })
    
    // Sync with global theme when dark mode is toggled
    if (settings.isEnabled !== undefined) {
      setTheme(settings.isEnabled ? 'dark' : 'light')
    }
  }, [setTheme])

  const updateAccessibilitySettings = useCallback((settings: Partial<ImmersiveSettings['accessibility']>) => {
    dispatch({ type: 'UPDATE_ACCESSIBILITY_SETTINGS', payload: settings })
  }, [])

  const setActiveMode = useCallback((mode: ImmersiveState['activeMode']) => {
    dispatch({ type: 'SET_ACTIVE_MODE', payload: mode })
  }, [])

  // Sync immersive dark mode with global theme
  useEffect(() => {
    if (state.settings.darkMode.isEnabled !== (effectiveTheme === 'dark')) {
      dispatch({ 
        type: 'UPDATE_DARK_SETTINGS', 
        payload: { isEnabled: effectiveTheme === 'dark' }
      })
    }
  }, [effectiveTheme, state.settings.darkMode.isEnabled])

  // Save settings to localStorage with error handling
  const saveSettings = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      
      localStorage.setItem('immersive-settings', JSON.stringify(state.settings))
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save settings' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.settings])

  // Load settings from localStorage with error handling
  const loadSettings = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })
      
      // Try to load from localStorage
      const saved = localStorage.getItem('immersive-settings')
      const accessibilitySettings = localStorage.getItem('accessibility-settings')
      
      if (saved) {
        const parsedSettings = JSON.parse(saved)
        dispatch({ type: 'SET_SETTINGS', payload: parsedSettings })
      } else if (accessibilitySettings) {
        // Fallback to accessibility-specific settings if immersive settings don't exist
        const parsedAccessibility = JSON.parse(accessibilitySettings)
        dispatch({ type: 'UPDATE_ACCESSIBILITY_SETTINGS', payload: parsedAccessibility })
      }
      
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!state.isLoading) {
        saveSettings()
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [state.settings, state.isLoading, saveSettings])

  const contextValue: ImmersiveContextType = {
    state,
    updateFocusSettings,
    updateDarkSettings,
    updateAccessibilitySettings,
    setActiveMode,
    saveSettings,
    loadSettings
  }

  return (
    <ImmersiveContext.Provider value={contextValue}>
      {children}
    </ImmersiveContext.Provider>
  )
}

// Hook
export function useImmersive() {
  const context = useContext(ImmersiveContext)
  if (context === undefined) {
    throw new Error('useImmersive must be used within an ImmersiveProvider')
  }
  return context
}
