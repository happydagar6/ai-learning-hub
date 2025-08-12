"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Upload, MessageSquare, CreditCard, ArrowRight, Loader2 } from 'lucide-react'
import { VoiceNavigationControls } from '@/components/ui/voice-navigation-controls'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const HomePage: React.FC = () => {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push('/dashboard');
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      {/* Theme Toggle in top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-6">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Powered Learning Hub
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your learning experience with AI-powered tools for document processing, 
            study planning, Q&A, and interactive flashcards.
          </p>
                    <div className="flex items-center gap-4 justify-center">
            {isSignedIn ? (
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button 
                    variant="outline" 
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignUpButton>
              </>
            )}
            <VoiceNavigationControls />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          <Card className="hover:shadow-lg transition-shadow bg-card border-border">
            <CardHeader>
              <Upload className="h-8 w-8 text-blue-600 mx-auto" />
              <CardTitle>Document Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload and process your course materials with AI-powered text extraction and analysis.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-card border-border">
            <CardHeader>
              <Brain className="h-8 w-8 text-green-600 mx-auto" />
              <CardTitle>Study Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate personalized study plans based on your course syllabus and learning goals.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-card border-border">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-purple-600 mx-auto" />
              <CardTitle>Smart Q&A</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ask questions about your course materials and get AI-powered answers with context.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-card border-border">
            <CardHeader>
              <CreditCard className="h-8 w-8 text-orange-600 mx-auto" />
              <CardTitle>Flashcards</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create interactive flashcards from your documents for effective memorization.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default HomePage
