import { useCallback, useEffect, useRef, useState } from 'react'

interface SwipeGestureOptions {
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export const useSwipeGesture = (options: SwipeGestureOptions) => {
  const [isTouch, setIsTouch] = useState(false)
  const startXRef = useRef<number>(0)
  const startYRef = useRef<number>(0)
  const { threshold = 50 } = options

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setIsTouch(true)
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isTouch) return
    
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - startXRef.current
    const deltaY = endY - startYRef.current

    // Determine if horizontal or vertical swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          options.onSwipeRight?.()
        } else {
          options.onSwipeLeft?.()
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          options.onSwipeDown?.()
        } else {
          options.onSwipeUp?.()
        }
      }
    }
    
    setIsTouch(false)
  }, [isTouch, threshold, options])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isTouch) return
    // Prevent default to avoid page scrolling during swipe
    e.preventDefault()
  }, [isTouch])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [handleTouchStart, handleTouchEnd, handleTouchMove])

  return { isTouch }
}

// Mobile detection hook
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Touch-friendly focus management
export const useFocusManagement = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  useEffect(() => {
    const handleKeyDown = () => setIsKeyboardUser(true)
    const handleMouseDown = () => setIsKeyboardUser(false)
    const handleTouchStart = () => setIsKeyboardUser(false)

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('touchstart', handleTouchStart)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  return { isKeyboardUser }
}