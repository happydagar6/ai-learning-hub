import { NextResponse } from "next/server"

export async function GET() {
  try {
    const now = new Date()
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
    
    // Calculate time until next midnight UTC
    const nextMidnightUTC = new Date(utcNow)
    nextMidnightUTC.setUTCHours(24, 0, 0, 0) // Next midnight UTC
    
    const timeUntilReset = nextMidnightUTC.getTime() - utcNow.getTime()
    const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60))
    const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    
    const freeModels = [
      "deepseek/deepseek-r1-0528:free",
      "tngtech/deepseek-r1t-chimera:free", 
      "deepseek/deepseek-r1-0528-qwen3-8b:free",
      "qwen/qwen3-coder:free",
      "google/gemma-3-27b-it:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "microsoft/phi-3-mini-128k-instruct:free",
      "huggingfaceh4/zephyr-7b-beta:free",
      "openchat/openchat-7b:free",
      "mistralai/mistral-7b-instruct:free"
    ]

    return NextResponse.json({
      success: true,
      data: {
        currentTimeUTC: utcNow.toISOString(),
        nextResetTimeUTC: nextMidnightUTC.toISOString(),
        hoursUntilReset,
        minutesUntilReset,
        resetMessage: `Rate limits typically reset at midnight UTC (in ${hoursUntilReset}h ${minutesUntilReset}m)`,
        availableModels: freeModels,
        fallbackEnabled: true,
        note: "If all AI models hit rate limits, the system will generate a basic study plan automatically."
      }
    })
  } catch (error) {
    console.error("❌ Model status error:", error)
    return NextResponse.json(
      { 
        error: "Failed to get model status", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    )
  }
}
