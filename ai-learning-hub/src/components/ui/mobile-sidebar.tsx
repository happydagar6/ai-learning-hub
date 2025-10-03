'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  X, 
  Home, 
  BookOpen, 
  Brain,
  FlaskConical,
  MessageSquare,
  Upload,
  Bell,
  ChevronRight,
  Zap
} from 'lucide-react'
import { Badge } from './badge'
import { Button } from './button'
import { UserButton } from '@clerk/nextjs'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  onRouteChange: () => void
}

const navigationItems = [
  {
    category: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Upload', href: '/dashboard/upload', icon: Upload },
      { name: 'Study Plans', href: '/dashboard/study-plan', icon: BookOpen },
    ]
  },
  {
    category: 'Learning Tools',
    items: [
      { name: 'Flashcards', href: '/dashboard/flashcards', icon: FlaskConical },
      { name: 'Q&A Chat', href: '/dashboard/qa', icon: MessageSquare },
      { name: 'Immersive Mode', href: '/dashboard/immersive', icon: Zap, badge: 'New' },
    ]
  },
  {
    category: 'Progress',
    items: [
      { name: 'Reminders', href: '/dashboard/reminders', icon: Bell },
    ]
  }
]

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ 
  isOpen, 
  onClose, 
  onRouteChange 
}) => {
  const pathname = usePathname()

  const handleLinkClick = () => {
    onRouteChange()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 border-r border-blue-200/50 dark:border-blue-800/50 shadow-xl transform transition-all duration-300 ease-in-out lg:hidden ${
        isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-blue-200/50 dark:border-blue-800/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
        }`} style={{ transitionDelay: '100ms' }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Learning Hub</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-blue-100/50 dark:hover:bg-blue-900/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Section */}
        <div className={`p-4 border-b border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/50 dark:to-purple-900/50 transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
        }`} style={{ transitionDelay: '150ms' }}>
          <div className="flex items-center space-x-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">Welcome back!</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">Ready to learn?</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          {navigationItems.map((category, categoryIndex) => (
            <div key={category.category} className={`mb-6 transform transition-all duration-300 ease-out ${
              isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
            }`} style={{ transitionDelay: `${categoryIndex * 100 + 200}ms` }}>
              <h3 className="px-4 mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {category.category}
              </h3>
              <nav className="space-y-1 px-2">
                {category.items.map((item, itemIndex) => {
                  const IconComponent = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 transform ${
                        isOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                          : 'text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 hover:scale-102'
                      }`}
                      style={{ transitionDelay: `${categoryIndex * 100 + itemIndex * 50 + 300}ms` }}
                    >
                      <IconComponent className={`mr-3 h-5 w-5 transition-all duration-200 ${
                        isActive ? 'text-white' : 'text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 group-hover:scale-110'
                      }`} />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <Badge className={`ml-2 text-xs ${
                          isActive 
                            ? 'bg-white/20 text-white border-white/30' 
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm'
                        }`}>
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className={`ml-2 h-4 w-4 transition-all duration-200 ${
                        isActive ? 'text-white' : 'text-blue-400 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1'
                      }`} />
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/50 dark:to-purple-950/50 transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
        }`} style={{ transitionDelay: '600ms' }}>
          <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
            <p className="font-medium">AI Powered Learning Hub</p>
            <p className="text-blue-500 dark:text-blue-500">v1.0.0</p>
          </div>
        </div>
      </div>
    </>
  )
}