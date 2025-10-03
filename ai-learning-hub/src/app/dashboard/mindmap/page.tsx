"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { 
  ArrowLeft, 
  Brain,
  Sparkles,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EnhancedStudyPlanViewer from "@/components/ui/enhanced-study-plan-viewer";

export default function EnhancedMindMapPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const studyPlanId = searchParams.get("studyPlanId");

  const [studyPlanData, setStudyPlanData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  const fetchStudyPlan = useCallback(async () => {
    try {
      if (!studyPlanId) {
        throw new Error("Study plan ID is required");
      }

      if (!user) {
        throw new Error("User authentication required");
      }

      // Fetch study plan via API endpoint (uses service role client)
      const response = await fetch(`/api/study-plans?id=${studyPlanId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to fetch study plan`);
      }

      if (!result.success || !result.data) {
        throw new Error("Study plan not found in API response");
      }

      const studyPlan = result.data;

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      // Parse the content and set study plan data
      const parsedContent = typeof studyPlan.content === 'string' 
        ? JSON.parse(studyPlan.content) 
        : studyPlan.content;

      setStudyPlanData({
        title: studyPlan.title,
        weeks: parsedContent.weeks || []
      });

      setError(null);

    } catch (error) {
      console.error("❌ Error fetching study plan:", error);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  }, [studyPlanId]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (studyPlanId) {
      fetchStudyPlan();
    } else {
      setError("No study plan ID provided");
      setLoading(false);
    }

    // Cleanup function to mark component as unmounted
    return () => {
      isMountedRef.current = false;
    };
  }, [studyPlanId, fetchStudyPlan]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Loading Enhanced Mind Map</h2>
              <p className="text-gray-600">
                Preparing your interactive learning visualization...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/study-plan')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Enhanced Mind Map</h1>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!studyPlanData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Study plan data not available</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full max-w-full overflow-x-auto">
      <div className="max-w-full w-full mx-auto p-2 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6 w-full">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/study-plan')}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Study Plans
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Enhanced Mind Map</h1>
          </div>
        </div>
        {/* Enhanced Study Plan Viewer */}
        <div className="w-full max-w-full overflow-x-auto">
          <EnhancedStudyPlanViewer 
            studyPlan={studyPlanData} 
            studyPlanId={studyPlanId} 
          />
        </div>
      </div>
    </div>
  );
}