"use client"

import { useEffect } from 'react'
import { useImmersive } from '@/contexts/ImmersiveContext'

export function GlobalAccessibility() {
  const { state } = useImmersive()
  const { accessibility } = state.settings

  // Apply accessibility settings globally
  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    // High contrast mode
    if (accessibility.highContrast) {
      root.classList.add('high-contrast')
      root.style.setProperty('--color-background', '#000000')
      root.style.setProperty('--color-foreground', '#ffffff')
      root.style.setProperty('--color-primary', '#ffff00')
      root.style.setProperty('--color-secondary', '#ff00ff')
      root.style.setProperty('--color-accent', '#00ffff')
      root.style.setProperty('--color-muted', '#808080')
      root.style.setProperty('--color-border', '#ffffff')
      root.style.setProperty('--color-input', '#000000')
      root.style.setProperty('--color-card', '#1a1a1a')
    } else {
      root.classList.remove('high-contrast')
      // Remove high contrast custom properties to revert to theme defaults
      root.style.removeProperty('--color-background')
      root.style.removeProperty('--color-foreground')
      root.style.removeProperty('--color-primary')
      root.style.removeProperty('--color-secondary')
      root.style.removeProperty('--color-accent')
      root.style.removeProperty('--color-muted')
      root.style.removeProperty('--color-border')
      root.style.removeProperty('--color-input')
      root.style.removeProperty('--color-card')
    }

    // Font size - Apply to root element to affect all text
    const fontSizeMap = {
      normal: '16px',
      large: '20px',
      'extra-large': '24px'
    }
    root.style.fontSize = fontSizeMap[accessibility.fontSize as keyof typeof fontSizeMap]

    // Font family - Apply to body to affect all text
    const fontFamilyMap = {
      default: 'Inter, system-ui, sans-serif',
      dyslexia: '"OpenDyslexic", "Comic Sans MS", cursive',
      mono: '"Fira Code", "Courier New", monospace'
    }
    body.style.fontFamily = fontFamilyMap[accessibility.fontFamily as keyof typeof fontFamilyMap]

    // Reduce motion
    if (accessibility.reduceMotion) {
      root.classList.add('reduce-motion')
      root.style.setProperty('--motion-duration', '0.01ms')
      root.style.setProperty('--motion-scale', '1')
      // Disable all animations and transitions
      const style = document.createElement('style')
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `
      style.id = 'accessibility-reduce-motion'
      document.head.appendChild(style)
    } else {
      root.classList.remove('reduce-motion')
      root.style.removeProperty('--motion-duration')
      root.style.removeProperty('--motion-scale')
      // Remove the reduce motion styles
      const existingStyle = document.getElementById('accessibility-reduce-motion')
      if (existingStyle) {
        existingStyle.remove()
      }
    }

    // Add accessibility classes for CSS targeting
    root.classList.toggle('accessibility-large-font', accessibility.fontSize === 'large')
    root.classList.toggle('accessibility-extra-large-font', accessibility.fontSize === 'extra-large')
    root.classList.toggle('accessibility-dyslexia-font', accessibility.fontFamily === 'dyslexia')
    root.classList.toggle('accessibility-mono-font', accessibility.fontFamily === 'mono')
    root.classList.toggle('accessibility-screen-reader', accessibility.screenReader)

    // Enhanced focus visibility for keyboard navigation
    if (accessibility.highContrast || accessibility.screenReader) {
      const style = document.createElement('style')
      style.textContent = `
        *:focus,
        *:focus-visible {
          outline: 3px solid #ffff00 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 5px rgba(255, 255, 0, 0.3) !important;
        }
        
        button:focus,
        a:focus,
        input:focus,
        select:focus,
        textarea:focus {
          background-color: #ffff00 !important;
          color: #000000 !important;
        }
      `
      style.id = 'accessibility-focus-enhancement'
      document.head.appendChild(style)
    } else {
      const existingStyle = document.getElementById('accessibility-focus-enhancement')
      if (existingStyle) {
        existingStyle.remove()
      }
    }

    // Store settings in localStorage for persistence
    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(accessibility))
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error)
    }

    // Cleanup function
    return () => {
      // Clean up custom styles and classes when component unmounts
      root.classList.remove('high-contrast', 'reduce-motion', 'accessibility-large-font', 'accessibility-extra-large-font', 'accessibility-dyslexia-font', 'accessibility-mono-font', 'accessibility-screen-reader')
      
      // Remove custom styles
      const reduceMotionStyle = document.getElementById('accessibility-reduce-motion')
      const focusStyle = document.getElementById('accessibility-focus-enhancement')
      if (reduceMotionStyle) reduceMotionStyle.remove()
      if (focusStyle) focusStyle.remove()
    }
  }, [accessibility])

  // This component doesn't render anything - it's just for side effects
  return null
}
