"use client"

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Brain, Github, Twitter, Mail, Heart, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CompactFooterProps {
  className?: string
}

export function CompactFooter({ className }: CompactFooterProps) {
  const currentYear = new Date().getFullYear()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className={cn("bg-background border-t mt-auto relative z-0 py-2", className)}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Brand & Copyright */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-primary rounded">
                <Brain className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">AI Learning Hub</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {currentYear}
            </p>
          </div>

          {/* Minimal Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="h-6 w-6 p-0 hover:bg-accent"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
