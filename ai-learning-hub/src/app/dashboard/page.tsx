"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Brain, CreditCard, MessageSquare, Upload, Bell } from 'lucide-react'
import DashboardOverview from '@/components/ui/dashboard-overview'
import { WelcomeCard } from '@/components/ui/welcome-card'

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const features: Feature[] = [
  {
    title: "Upload Documents",
    description: "Upload and process your study materials",
    icon: Upload,
    href: "/dashboard/upload",
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    title: "Study Plan",
    description: "Generate personalized study plans",
    icon: Brain,
    href: "/dashboard/study-plan",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    title: "Q&A Interface",
    description: "Ask questions about your materials",
    icon: MessageSquare,
    href: "/dashboard/qa",
    color: "bg-purple-500 hover:bg-purple-600"
  },
  {
    title: "Flashcards",
    description: "Generate and study flashcards",
    icon: CreditCard,
    href: "/dashboard/flashcards",
    color: "bg-orange-500 hover:bg-orange-600"
  },
  {
    title: "Smart Reminders",
    description: "Never miss a study session",
    icon: Bell,
    href: "/dashboard/reminders",
    color: "bg-pink-500 hover:bg-pink-600"
  }
];

const Dashboard = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [hasDocuments, setHasDocuments] = useState<boolean | null>(null);

  // Check if user has uploaded documents
  useEffect(() => {
    const checkDocuments = async () => {
      try {
        console.log('🔍 Checking documents for user:', user?.id);
        const response = await fetch('/api/documents', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('📄 Documents API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📄 Documents data:', data);
          setHasDocuments(data.documents && data.documents.length > 0);
        } else {
          console.error('❌ Failed to fetch documents:', response.status, response.statusText);
          setHasDocuments(false);
        }
      } catch (error) {
        console.error('❌ Error checking documents:', error);
        setHasDocuments(false);
      }
    };

    // Only make the API call when authentication is fully loaded and user exists
    if (isLoaded && user) {
      console.log('✅ Authentication loaded, checking documents...');
      checkDocuments();
    } else if (isLoaded && !user) {
      console.log('❌ No user found after authentication loaded');
      setHasDocuments(false);
    }
  }, [user, isLoaded]);

  // Prevent automatic scrolling on page load/refresh
  useEffect(() => {
    // Scroll to top on component mount to prevent auto-scroll issues
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);

  // Show loading state while authentication is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to access your dashboard.</p>
          <button 
            onClick={() => router.push('/sign-in')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Show welcome card for new users */}
      {hasDocuments === false && (
        <div className="mb-8">
          <WelcomeCard onGetStarted={() => router.push('/dashboard/upload')} />
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          {hasDocuments === false ? 'Let\'s Get Started!' : 'Welcome to Your Learning Hub'}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {hasDocuments === false 
            ? 'Upload your first document to unlock the full power of AI-driven learning'
            : 'Track your progress and choose from our AI-powered learning tools to enhance your study experience'
          }
        </p>
      </div>

      {/* Only show dashboard overview if user has documents */}
      {hasDocuments !== false && <DashboardOverview />}

      <div className="text-center mb-8 mt-12">
        <h3 className="text-xl font-semibold text-foreground mb-4">Learning Tools</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer border"
            onClick={() => router.push(feature.href)}
          >
            <div className="p-6">
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default Dashboard 