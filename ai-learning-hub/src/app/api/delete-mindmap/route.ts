import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

export const DELETE = requireAuth(async (request: NextRequest, user: any) => {
  try {
    // Check if Supabase credentials are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        error: "Server configuration error: Missing Supabase credentials",
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const studyPlanId = searchParams.get('studyPlanId');

    if (!studyPlanId) {
      return NextResponse.json({
        error: "Study plan ID is required",
      }, { status: 400 });
    }

    console.log(`🗑️ Deleting mindmap for study plan: ${studyPlanId}`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if mindmap exists
    const { data: existingMindmap, error: checkError } = await supabase
      .from("mind_maps")
      .select("id, study_plan_id")
      .eq("study_plan_id", studyPlanId)
      .eq("user_id", user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        // No mindmap found
        return NextResponse.json({
          success: true,
          message: "No mindmap found for this study plan",
          deleted: false
        });
      }
      
      console.error("❌ Error checking mindmap existence:", checkError);
      return NextResponse.json({
        error: "Failed to check mindmap existence",
        details: checkError.message
      }, { status: 500 });
    }

    // Delete the mindmap from database
    const { error: deleteError } = await supabase
      .from("mind_maps")
      .delete()
      .eq("study_plan_id", studyPlanId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("❌ Error deleting mindmap from database:", deleteError);
      return NextResponse.json({
        error: "Failed to delete mindmap from database",
        details: deleteError.message
      }, { status: 500 });
    }

    console.log(`✅ Successfully deleted mindmap for study plan: ${studyPlanId}`);

    return NextResponse.json({
      success: true,
      message: "Mindmap deleted successfully",
      deleted: true,
      studyPlanId: studyPlanId
    });

  } catch (error) {
    console.error("❌ Mindmap deletion error:", error);
    return NextResponse.json({
      error: "Failed to delete mindmap",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
})

// Also support POST method with body for more complex deletion scenarios
export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    const { studyPlanId, forceDelete = false } = body;

    if (!studyPlanId) {
      return NextResponse.json({
        error: "Study plan ID is required",
      }, { status: 400 });
    }

    console.log(`🗑️ Deleting mindmap for study plan: ${studyPlanId} (force: ${forceDelete})`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (forceDelete) {
      // Force delete without checking existence
      const { error: deleteError } = await supabase
        .from("mind_maps")
        .delete()
        .eq("study_plan_id", studyPlanId)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("❌ Error force deleting mindmap:", deleteError);
        return NextResponse.json({
          error: "Failed to force delete mindmap",
          details: deleteError.message
        }, { status: 500 });
      }

      console.log(`✅ Force deleted mindmap for study plan: ${studyPlanId}`);
      return NextResponse.json({
        success: true,
        message: "Mindmap force deleted successfully",
        deleted: true,
        studyPlanId: studyPlanId
      });
    }

    // Regular deletion with existence check
    const { data: existingMindmap, error: checkError } = await supabase
      .from("mind_maps")
      .select("id, study_plan_id, created_at")
      .eq("study_plan_id", studyPlanId)
      .eq("user_id", user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          message: "No mindmap found for this study plan",
          deleted: false
        });
      }
      
      return NextResponse.json({
        error: "Failed to check mindmap existence",
        details: checkError.message
      }, { status: 500 });
    }

    // Delete the mindmap
    const { error: deleteError } = await supabase
      .from("mind_maps")
      .delete()
      .eq("id", existingMindmap.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("❌ Error deleting mindmap:", deleteError);
      return NextResponse.json({
        error: "Failed to delete mindmap",
        details: deleteError.message
      }, { status: 500 });
    }

    console.log(`✅ Successfully deleted mindmap (ID: ${existingMindmap.id}) for study plan: ${studyPlanId}`);

    return NextResponse.json({
      success: true,
      message: "Mindmap deleted successfully",
      deleted: true,
      studyPlanId: studyPlanId,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Mindmap deletion error:", error);
    return NextResponse.json({
      error: "Failed to delete mindmap",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
})
