'use client'

import React from 'react'
import { useIsMobile } from '@/hooks/useMobileGestures'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  className?: string
  mobileClassName?: string
  desktopClassName?: string
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = '',
  mobileClassName = '',
  desktopClassName = ''
}) => {
  const isMobile = useIsMobile()
  
  const appliedClassName = `${className} ${isMobile ? mobileClassName : desktopClassName}`
  
  return (
    <div className={appliedClassName}>
      {children}
    </div>
  )
}

interface ResponsiveContainerProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  size = 'lg',
  className = ''
}) => {
  const containerClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md', 
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full'
  }
  
  return (
    <div className={`container mx-auto px-4 sm:px-6 lg:px-8 ${containerClasses[size]} ${className}`}>
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  className?: string
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className = ''
}) => {
  const gridClasses = [
    `grid gap-${gap}`,
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  ].filter(Boolean).join(' ')
  
  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

interface ResponsiveStackProps {
  children: React.ReactNode
  direction?: 'column' | 'row'
  mobileDirection?: 'column' | 'row'
  spacing?: number
  className?: string
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = 'column',
  mobileDirection = 'column',
  spacing = 4,
  className = ''
}) => {
  const stackClasses = [
    'flex',
    `gap-${spacing}`,
    direction === 'column' ? 'flex-col' : 'flex-row',
    mobileDirection === 'column' ? 'flex-col md:flex-row' : 'flex-row md:flex-col',
    className
  ].filter(Boolean).join(' ')
  
  return (
    <div className={stackClasses}>
      {children}
    </div>
  )
}