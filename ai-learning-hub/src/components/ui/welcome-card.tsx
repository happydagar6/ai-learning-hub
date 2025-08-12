"use client"

import React from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Upload, 
  Brain, 
  MessageSquare, 
  CreditCard,
  Accessibility,
  Crown
} from 'lucide-react'

interface WelcomeCardProps {
  onGetStarted: () => void
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ onGetStarted }) => {
  const { user } = useUser()

  const features = [
    {
      icon: Upload,
      title: "Upload Documents",
      description: "AI-powered document processing"
    },
    {
      icon: Brain,
      title: "Study Plans",
      description: "Personalized learning paths"
    },
    {
      icon: MessageSquare,
      title: "Q&A Assistant",
      description: "Chat with your documents"
    },
    {
      icon: CreditCard,
      title: "Flashcards",
      description: "Smart flashcard generation"
    },
    {
      icon: Accessibility,
      title: "Accessibility",
      description: "Voice navigation & more"
    }
  ]

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="h-6 w-6 text-yellow-500" />
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Welcome!
          </Badge>
        </div>
        <CardTitle className="text-2xl">
          Welcome to AI Learning Hub, {user?.firstName || 'there'}! 🎉
        </CardTitle>
        <CardDescription className="text-lg">
          Your intelligent learning companion is ready to transform your study experience
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border">
              <feature.icon className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-sm">{feature.title}</div>
                <div className="text-xs text-muted-foreground">{feature.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Ready to get started?</span>
          </div>
          
          <Button 
            onClick={onGetStarted}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-2"
          >
            Upload Your First Document
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Start by uploading a PDF or DOCX file to begin your AI-powered learning journey
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
