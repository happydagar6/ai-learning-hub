import { useEffect, useState } from 'react'

// Breakpoint definitions matching Tailwind CSS
export const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

// Hook to get current screen size
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg')
  
  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth
      
      if (width < BREAKPOINTS.xs) return 'xs'
      if (width < BREAKPOINTS.sm) return 'xs'
      if (width < BREAKPOINTS.md) return 'sm'
      if (width < BREAKPOINTS.lg) return 'md'
      if (width < BREAKPOINTS.xl) return 'lg'
      if (width < BREAKPOINTS['2xl']) return 'xl'
      return '2xl'
    }
    
    const updateBreakpoint = () => {
      setBreakpoint(getBreakpoint())
    }
    
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])
  
  return breakpoint
}

// Hook to check if screen is smaller than a breakpoint
export const useMediaQuery = (breakpoint: Breakpoint) => {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const query = `(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`
    const media = window.matchMedia(query)
    
    const updateMatch = () => setMatches(media.matches)
    updateMatch()
    
    media.addEventListener('change', updateMatch)
    return () => media.removeEventListener('change', updateMatch)
  }, [breakpoint])
  
  return matches
}

// Responsive value hook - returns different values based on screen size
export const useResponsiveValue = <T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T => {
  const breakpoint = useBreakpoint()
  
  // Check from largest to smallest breakpoint
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  
  for (const bp of breakpointOrder) {
    if (BREAKPOINTS[bp] <= window.innerWidth && values[bp] !== undefined) {
      return values[bp] as T
    }
  }
  
  return defaultValue
}

// Touch device detection
export const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  
  useEffect(() => {
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0
    }
    
    setIsTouchDevice(checkTouchDevice())
  }, [])
  
  return isTouchDevice
}

// Device orientation hook
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  
  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }
    
    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)
    
    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])
  
  return orientation
}

// Utility function to generate responsive classes
export const generateResponsiveClasses = (
  property: string,
  values: Partial<Record<Breakpoint, string | number>>
): string => {
  const classes: string[] = []
  
  Object.entries(values).forEach(([bp, value]) => {
    const breakpoint = bp as Breakpoint
    const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`
    classes.push(`${prefix}${property}-${value}`)
  })
  
  return classes.join(' ')
}

// Common responsive patterns
export const RESPONSIVE_PATTERNS = {
  // Common grid patterns
  grid: {
    autoFit: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    cards: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    sidebar: 'grid grid-cols-1 lg:grid-cols-4 gap-6',
    split: 'grid grid-cols-1 md:grid-cols-2'
  },
  
  // Common flex patterns
  flex: {
    stack: 'flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4',
    center: 'flex flex-col items-center justify-center',
    between: 'flex flex-col sm:flex-row sm:items-center sm:justify-between',
    wrap: 'flex flex-wrap gap-4'
  },
  
  // Common spacing patterns
  spacing: {
    section: 'py-8 md:py-12 lg:py-16',
    container: 'px-4 sm:px-6 lg:px-8',
    content: 'space-y-6 md:space-y-8 lg:space-y-12'
  },
  
  // Common text patterns
  text: {
    responsive: 'text-sm sm:text-base lg:text-lg',
    heading: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    subheading: 'text-lg sm:text-xl md:text-2xl'
  }
} as const

// Helper to get responsive padding/margin
export const getResponsiveSpacing = (
  property: 'p' | 'm' | 'px' | 'py' | 'mx' | 'my',
  values: Partial<Record<Breakpoint, number>>
): string => {
  return generateResponsiveClasses(property, values)
}

// Helper to get responsive width/height
export const getResponsiveDimensions = (
  property: 'w' | 'h' | 'min-w' | 'min-h' | 'max-w' | 'max-h',
  values: Partial<Record<Breakpoint, string | number>>
): string => {
  return generateResponsiveClasses(property, values)
}