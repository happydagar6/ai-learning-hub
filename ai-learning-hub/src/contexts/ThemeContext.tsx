"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isLoading: boolean
  error: string | null
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'ai-learning-hub-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get system theme preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch (error) {
      console.warn('Failed to detect system theme:', error)
      return 'light'
    }
  }, [])

  // Apply theme to document
  const applyTheme = useCallback((newTheme: 'light' | 'dark') => {
    try {
      const root = document.documentElement
      const body = document.body

      // Remove existing theme classes
      root.classList.remove('light', 'dark')
      body.classList.remove('light', 'dark')

      // Add new theme class
      root.classList.add(newTheme)
      body.classList.add(newTheme)

      // Update effective theme
      setEffectiveTheme(newTheme)

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content', 
          newTheme === 'dark' ? '#0f172a' : '#ffffff'
        )
      } else {
        // Create meta theme-color if it doesn't exist
        const meta = document.createElement('meta')
        meta.name = 'theme-color'
        meta.content = newTheme === 'dark' ? '#0f172a' : '#ffffff'
        document.head.appendChild(meta)
      }
    } catch (error) {
      console.error('Failed to apply theme:', error)
      setError('Failed to apply theme')
    }
  }, [])

  // Set theme with persistence
  const setTheme = useCallback((newTheme: Theme) => {
    try {
      setError(null)
      setThemeState(newTheme)

      // Save to localStorage
      if (newTheme === 'system') {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, newTheme)
      }

      // Apply effective theme
      const effective = newTheme === 'system' ? getSystemTheme() : newTheme
      applyTheme(effective)
    } catch (error) {
      console.error('Failed to set theme:', error)
      setError('Failed to save theme preference')
    }
  }, [getSystemTheme, applyTheme])

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    const newTheme = effectiveTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [effectiveTheme, setTheme])

  // Load saved theme on mount
  useEffect(() => {
    try {
      setIsLoading(true)
      
      // Get saved theme or default to system
      const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null
      const initialTheme = savedTheme || 'system'
      
      setThemeState(initialTheme)
      
      // Apply effective theme
      const effective = initialTheme === 'system' ? getSystemTheme() : initialTheme
      applyTheme(effective)
      
    } catch (error) {
      console.error('Failed to load theme:', error)
      setError('Failed to load theme preference')
      // Fallback to light theme
      applyTheme('light')
    } finally {
      setIsLoading(false)
    }
  }, [getSystemTheme, applyTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      const systemTheme = e.matches ? 'dark' : 'light'
      applyTheme(systemTheme)
    }

    try {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } catch (error) {
      console.warn('Failed to listen for system theme changes:', error)
    }
  }, [theme, applyTheme])

  // Handle page visibility changes to sync theme
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && theme === 'system') {
        const systemTheme = getSystemTheme()
        if (systemTheme !== effectiveTheme) {
          applyTheme(systemTheme)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [theme, effectiveTheme, getSystemTheme, applyTheme])

  const contextValue: ThemeContextType = {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    isLoading,
    error
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme utility hook for components
export function useThemeClass() {
  const { effectiveTheme } = useTheme()
  return effectiveTheme === 'dark' ? 'dark' : 'light'
}
