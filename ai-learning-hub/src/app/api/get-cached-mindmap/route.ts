import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    const { studyPlanId } = body;

    if (!studyPlanId) {
      return NextResponse.json({
        error: "Study plan ID is required",
      }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("🔍 Looking for cached mind map for study plan:", studyPlanId);

    // Check for cached mind map
    const { data: cachedMindMap, error: cacheError } = await supabase
      .from("mind_maps")
      .select("*")
      .eq("study_plan_id", studyPlanId)
      .eq("user_id", user.id)
      .single();

    if (cacheError || !cachedMindMap) {
      console.log("ℹ️ No cached mind map found for study plan:", studyPlanId);
      return NextResponse.json({
        success: false,
        message: "No cached mind map found"
      });
    }

    console.log("✅ Found cached mind map for study plan:", studyPlanId);

    return NextResponse.json({
      success: true,
      data: {
        mindMapText: cachedMindMap.text_content,
        interactiveData: cachedMindMap.interactive_data,
        generatedAt: cachedMindMap.created_at,
        updatedAt: cachedMindMap.updated_at
      }
    });

  } catch (error) {
    console.error("❌ Error fetching cached mind map:", error);
    return NextResponse.json({
      error: "Failed to fetch cached mind map",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
})
