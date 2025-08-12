"use client"

import { useTheme } from '@/contexts/ThemeContext'
import { useMemo } from 'react'

export function useThemeAwareStyles() {
  const { effectiveTheme } = useTheme()
  
  return useMemo(() => ({
    // Background gradients
    heroGradient: effectiveTheme === 'dark' 
      ? 'bg-gradient-to-br from-slate-900 to-slate-800'
      : 'bg-gradient-to-br from-blue-50 to-indigo-100',
    
    // Card styles
    cardBase: effectiveTheme === 'dark'
      ? 'bg-slate-800 border-slate-700 text-slate-100'
      : 'bg-white border-gray-200 text-gray-900',
    
    // Text colors
    primaryText: effectiveTheme === 'dark' ? 'text-slate-100' : 'text-gray-900',
    secondaryText: effectiveTheme === 'dark' ? 'text-slate-300' : 'text-gray-600',
    mutedText: effectiveTheme === 'dark' ? 'text-slate-400' : 'text-gray-500',
    
    // Interactive elements
    hoverCard: effectiveTheme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-50',
    button: effectiveTheme === 'dark'
      ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600'
      : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
    
    // Status colors (theme-aware)
    success: effectiveTheme === 'dark' ? 'text-green-400' : 'text-green-600',
    warning: effectiveTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600',
    error: effectiveTheme === 'dark' ? 'text-red-400' : 'text-red-600',
    info: effectiveTheme === 'dark' ? 'text-blue-400' : 'text-blue-600',
    
    // Theme indicator
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light'
  }), [effectiveTheme])
}

// Utility function for conditional classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Hook for theme-aware class building
export function useThemeClass() {
  const { effectiveTheme } = useTheme()
  
  return (lightClass: string, darkClass: string, isDark?: boolean) => {
    const useDark = isDark !== undefined ? isDark : effectiveTheme === 'dark'
    return useDark ? darkClass : lightClass
  }
}

// Legacy function for backward compatibility (deprecated)
export function themeClass(lightClass: string, darkClass: string, isDark?: boolean) {
  // This function should not be used in components - use useThemeClass hook instead
  return isDark ? darkClass : lightClass
}
