"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme, effectiveTheme, isLoading } = useTheme()

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  const getIcon = () => {
    if (isLoading) {
      return <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    }
    
    switch (effectiveTheme) {
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'light':
        return <Sun className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getThemeLabel = (themeValue: Theme) => {
    switch (themeValue) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
      default:
        return 'System'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 px-0"
          disabled={isLoading}
          aria-label={`Current theme: ${getThemeLabel(theme)}`}
        >
          {getIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => handleThemeChange('light')}
          className={`cursor-pointer ${theme === 'light' ? 'bg-accent' : ''}`}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange('dark')}
          className={`cursor-pointer ${theme === 'dark' ? 'bg-accent' : ''}`}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange('system')}
          className={`cursor-pointer ${theme === 'system' ? 'bg-accent' : ''}`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple toggle button (for mobile or minimal UI)
export function SimpleThemeToggle() {
  const { toggleTheme, effectiveTheme, isLoading } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      disabled={isLoading}
      className="h-9 w-9 px-0"
      aria-label={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} theme`}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : effectiveTheme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  )
}
