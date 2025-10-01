import { useState, useEffect, useCallback } from 'react'
import { useSwipeGesture, useIsMobile } from './useMobileGestures'

export const useResponsiveNavigation = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const isMobile = useIsMobile()

  // Handle swipe gestures for mobile sidebar
  useSwipeGesture({
    threshold: 100,
    onSwipeRight: () => {
      if (isMobile && !isSidebarOpen) {
        setIsSidebarOpen(true)
      }
    },
    onSwipeLeft: () => {
      if (isMobile && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }
  })

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close sidebar when route changes (mobile)
  const handleRouteChange = useCallback(() => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }, [isMobile])

  // Close sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobile, isSidebarOpen])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  return {
    isSidebarOpen,
    isScrolled,
    isMobile,
    toggleSidebar,
    closeSidebar,
    handleRouteChange
  }
}