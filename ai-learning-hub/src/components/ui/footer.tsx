"use client"

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  Brain, 
  Upload, 
  MessageSquare, 
  CreditCard, 
  Github, 
  Twitter, 
  Mail,
  Heart,
  ArrowUp,
  Sparkles,
  Accessibility,
  FileText,
  Shield,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FooterLinkProps {
  href: string
  children: React.ReactNode
  isExternal?: boolean
  isPlaceholder?: boolean
}

const FooterLink = ({ href, children, isExternal = false, isPlaceholder = false }: FooterLinkProps) => {
  if (isPlaceholder) {
    return (
      <button
        className={cn(
          "text-muted-foreground hover:text-foreground transition-colors duration-200",
          "hover:underline underline-offset-4",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm",
          "cursor-pointer text-left"
        )}
        onClick={(e) => {
          e.preventDefault()
          // Placeholder link - no action needed
        }}
        title={`${children}`}
      >
        {children}
      </button>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-foreground transition-colors duration-200",
        "hover:underline underline-offset-4",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
      )}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      {children}
    </Link>
  )
}

interface SocialLinkProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const SocialLink = ({ href, icon: Icon, label }: SocialLinkProps) => (
  <Link
    href={href}
    className={cn(
      "group p-2 rounded-lg bg-background border hover:border-primary/50",
      "transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    )}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
  >
    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
  </Link>
)

const ScrollToTop = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={scrollToTop}
      className={cn(
        "group hover:bg-primary hover:text-primary-foreground",
        "transition-all duration-200 hover:-translate-y-0.5"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
    </Button>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  const navigationLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Sparkles },
    { href: '/dashboard/upload', label: 'Upload', icon: Upload },
    { href: '/dashboard/study-plan', label: 'Study Plan', icon: Brain },
    { href: '/dashboard/immersive', label: 'Immersive Mode', icon: Accessibility },
    { href: '/dashboard/qa', label: 'Q&A Assistant', icon: MessageSquare },
    { href: '/dashboard/flashcards', label: 'Flashcards', icon: CreditCard },
  ]

  const companyLinks = [
    { href: '/about', label: 'About Us', isPlaceholder: true },
    { href: '/contact', label: 'Contact', isPlaceholder: true },
    { href: '/careers', label: 'Careers', isPlaceholder: true },
    { href: '/blog', label: 'Blog', isPlaceholder: true },
  ]

  const supportLinks = [
    { href: '/help', label: 'Help Center', isPlaceholder: true },
    { href: '/docs', label: 'Documentation', isPlaceholder: true },
    { href: '/api', label: 'API Reference', isPlaceholder: true },
    { href: '/community', label: 'Community', isPlaceholder: true },
  ]

  const legalLinks = [
    { href: '/privacy', label: 'Privacy Policy', isPlaceholder: true },
    { href: '/terms', label: 'Terms of Service', isPlaceholder: true },
    { href: '/cookies', label: 'Cookie Policy', isPlaceholder: true },
    { href: '/security', label: 'Security', isPlaceholder: true },
  ]

  const socialLinks = [
    { href: 'https://github.com', icon: Github, label: 'GitHub' },
    { href: 'https://twitter.com', icon: Twitter, label: 'Twitter' },
    { href: 'mailto:contact@ailearninghub.com', icon: Mail, label: 'Email' },
  ]

  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">AI Learning Hub</h3>
                <p className="text-sm text-muted-foreground">Powered by Intelligence</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Revolutionizing education with AI-powered learning tools. Create personalized study plans, 
              generate flashcards, and enhance your learning experience with intelligent assistance.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <SocialLink key={social.href} {...social} />
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Features
            </h4>
            <ul className="space-y-2">
              {navigationLinks.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.href} className="flex items-center gap-2">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Company
            </h4>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} isPlaceholder={link.isPlaceholder}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Support & Legal
            </h4>
            <ul className="space-y-2">
              {supportLinks.concat(legalLinks).map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} isPlaceholder={link.isPlaceholder}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-muted-foreground">
              <p>© {currentYear} AI Learning Hub. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <FooterLink href="/privacy" isPlaceholder={true}>Privacy</FooterLink>
                <span className="text-border">•</span>
                <FooterLink href="/terms" isPlaceholder={true}>Terms</FooterLink>
                <span className="text-border">•</span>
                <FooterLink href="/cookies" isPlaceholder={true}>Cookies</FooterLink>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Made with <Heart className="h-3 w-3 text-red-500 animate-pulse" fill="currentColor" /> for learners
              </p>
              <ScrollToTop />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
