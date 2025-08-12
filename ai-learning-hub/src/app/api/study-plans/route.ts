import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from "@/lib/auth"

// Create service role client for admin operations (same as generate-study-plan API)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

export const GET = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const studyPlanId = searchParams.get('id')

    if (!studyPlanId) {
      return NextResponse.json({ error: "Study plan ID is required" }, { status: 400 })
    }

    console.log("🔍 Fetching study plan via API:", { studyPlanId, userId: user.id });

    // Fetch study plan from Supabase using service role
    const { data: studyPlans, error: studyPlanError } = await supabase
      .from("study_plans")
      .select("*")
      .eq("id", studyPlanId)
      .eq("user_id", user.id)
      .limit(1);

    console.log("🔍 API Query result - data:", studyPlans);
    console.log("🔍 API Query result - error:", studyPlanError);

    if (studyPlanError) {
      console.error("❌ Study plan fetch error:", studyPlanError);
      return NextResponse.json({ 
        error: "Failed to fetch study plan", 
        details: studyPlanError.message 
      }, { status: 500 })
    }

    if (!studyPlans || studyPlans.length === 0) {
      // Try to fetch all study plans for this user to debug
      const { data: allPlans, error: allPlansError } = await supabase
        .from("study_plans")
        .select("id, user_id, title, created_at")
        .eq("user_id", user.id);
        
      console.log("🔍 All study plans for user via API:", allPlans);
      console.log("🔍 All study plans error via API:", allPlansError);
      
      return NextResponse.json({ 
        error: "Study plan not found",
        allPlans: allPlans || [],
        requestedId: studyPlanId,
        userId: user.id
      }, { status: 404 })
    }

    const studyPlan = studyPlans[0];
    console.log("✅ Study plan fetched successfully via API:", studyPlan);

    return NextResponse.json({
      success: true,
      data: studyPlan
    })

  } catch (error) {
    console.error("❌ Study plan API error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
})
