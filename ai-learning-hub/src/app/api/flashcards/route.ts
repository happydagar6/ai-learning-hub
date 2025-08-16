import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import OpenAI from "openai"
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from "@/lib/auth"

// Create service role client for admin operations (same as documents API)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Validate environment variables
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY environment variable is not set!")
}

interface GenerateFlashcardsRequest {
  documentId: number
  count?: number
  difficulty?: "easy" | "medium" | "hard" | "mixed"
  questionTypes?: ("open" | "multiple_choice" | "fill_blank")[]
  focusAreas?: string[]
}

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const body: GenerateFlashcardsRequest = await request.json()
    const {
      documentId,
      count = 15,
      difficulty = "mixed",
      questionTypes = ["open", "multiple_choice"],
      focusAreas = [],
    } = body

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Add logging for documentId
    console.log("[Flashcard Generation] Requested documentId:", documentId, typeof documentId)

    console.log("🃏 Generating flashcards:", { documentId, count, difficulty, questionTypes })

    // First get user's courses (same pattern as documents API)
    const { data: userCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', user.id)

    if (coursesError) {
      console.error('❌ Error fetching user courses:', coursesError)
      return NextResponse.json({ error: 'Failed to fetch user courses' }, { status: 500 })
    }

    const courseIds = userCourses.map(course => course.id)
    console.log('[Flashcard Generation] User course IDs:', courseIds)

    if (courseIds.length === 0) {
      console.log('[Flashcard Generation] No courses found for user')
      return NextResponse.json({ error: 'No courses found for user' }, { status: 404 })
    }

    // Get document information for the authenticated user
    // Try multiple approaches to find the document
    let document = null
    let docError = null

    console.log("[Flashcard Generation] Searching for document with ID:", documentId)

    // First try with id field (most likely scenario)
    const { data: doc1, error: err1 } = await supabase
      .from("documents")
      .select(`
        id, 
        name, 
        processed, 
        documentId,
        course_id
      `)
      .eq("id", documentId)
      .in('course_id', courseIds)
      .single()

    if (!err1 && doc1) {
      document = doc1
      console.log("[Flashcard Generation] Found document by id")
    } else {
      console.log("[Flashcard Generation] Not found by id, trying documentId field...")
      
      // Try with documentId field
      const { data: doc2, error: err2 } = await supabase
        .from("documents")
        .select(`
          id, 
          name, 
          processed, 
          documentId,
          course_id
        `)
        .eq("documentId", documentId)
        .in('course_id', courseIds)
        .single()
      
      if (!err2 && doc2) {
        document = doc2
        console.log("[Flashcard Generation] Found document by documentId")
      } else {
        console.log("[Flashcard Generation] Not found by documentId, trying name field...")
        
        // Try with name field (filename)
        const { data: doc3, error: err3 } = await supabase
          .from("documents")
          .select(`
            id, 
            name, 
            processed, 
            documentId,
            course_id
          `)
          .eq("name", documentId)
          .in('course_id', courseIds)
          .single()
        
        if (!err3 && doc3) {
          document = doc3
          console.log("[Flashcard Generation] Found document by name")
        } else {
          docError = err3 || err2 || err1
          console.log("[Flashcard Generation] Document not found with any method:", { 
            searchTerm: documentId, 
            errors: [err1?.message, err2?.message, err3?.message] 
          })
        }
      }
    }

    console.log("[Flashcard Generation] Document lookup result:", { document, docError })

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (!document.processed) {
      return NextResponse.json({ error: "Document is still being processed" }, { status: 400 })
    }

  // Always use the string documentId from the found document for Qdrant lookup
  const documentContent = await getDocumentContent(document.documentId)

    if (!documentContent) {
      return NextResponse.json({ error: "Could not retrieve document content" }, { status: 500 })
    }

    // Generate flashcards using AI
    const flashcards = await generateFlashcardsWithAI(documentContent, count, difficulty, questionTypes, focusAreas)

    // Create flashcard set with user_id
    const { data: flashcardSet, error: setError } = await supabase
      .from("flashcard_sets")
      .insert([
        {
          name: `${document.name} - Flashcards`,
          description: `Generated flashcards from ${document.name}`,
          documentId: document.documentId,
          user_id: user.id,
          settings: {
            count,
            difficulty,
            questionTypes,
            focusAreas,
          },
        },
      ])
      .select()
      .single()

    if (setError) {
      console.error("Error creating flashcard set:", setError)
      return NextResponse.json({ error: "Failed to create flashcard set" }, { status: 500 })
    }

    // Save flashcards to database
    const flashcardsToInsert = flashcards.map((card) => ({
      documentId: document.documentId,
      user_id: user.id,
      question: card.question,
      answer: card.answer,
      difficulty: card.difficulty,
      question_type: card.question_type,
      options: card.options || null,
      tags: card.tags || null,
    }))

    const { data: savedFlashcards, error: flashcardError } = await supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select()

    if (flashcardError) {
      console.error("Error saving flashcards:", flashcardError)
      return NextResponse.json({ error: "Failed to save flashcards" }, { status: 500 })
    }

    // Link flashcards to set
    const setCardLinks = savedFlashcards.map((card, index) => ({
      set_id: flashcardSet.id,
      flashcard_id: card.id,
      position: index,
    }))

    await supabase.from("flashcard_set_cards").insert(setCardLinks)

    console.log(`✅ Generated ${savedFlashcards.length} flashcards`)

    return NextResponse.json({
      success: true,
      flashcardSet: {
        ...flashcardSet,
        flashcards: savedFlashcards,
      },
      count: savedFlashcards.length,
    })
  } catch (error) {
    console.error("❌ Flashcard generation error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
})

export const GET = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const setId = searchParams.get("setId")
    const documentId = searchParams.get("documentId")

    let query = supabase
      .from("flashcard_sets")
      .select(`
        id,
        name,
        description,
        documentId,
        settings,
        created_at,
        updated_at,
        documents!inner (
          id,
          name,
          user_id
        ),
        flashcard_set_cards (
          flashcard_id,
          position,
          flashcards (
            id,
            question,
            answer,
            difficulty,
            question_type,
            options,
            tags,
            created_at
          )
        )
      `)
      .eq("documents.user_id", user.id) // Filter by user through documents relationship
      .order("created_at", { ascending: false })

    if (setId) {
      query = query.eq("id", setId)
    }

    if (documentId) {
      query = query.eq("documentId", documentId)
    }

    const { data: flashcardSets, error } = await query

    if (error) {
      console.error("Error fetching flashcard sets:", error)
      // Only return 500 for real server errors, not for empty results
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    // Transform the data structure
    const transformedSets =
      flashcardSets?.map((set) => ({
        ...set,
        flashcards:
          set.flashcard_set_cards
            ?.sort((a, b) => a.position - b.position)
            .map((link) => link.flashcards)
            .filter(Boolean) || [],
      })) || []

    return NextResponse.json({
      success: true,
      data: transformedSets,
    })
  } catch (error) {
    console.error("❌ Error fetching flashcards:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const DELETE = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const flashcardId = searchParams.get("flashcardId")
    const setId = searchParams.get("setId")

    if (flashcardId) {
      const { error } = await supabase.from("flashcards").delete().eq("id", flashcardId)

      if (error) {
        throw new Error(`Failed to delete flashcard: ${error.message}`)
      }

      return NextResponse.json({ success: true, message: "Flashcard deleted" })
    }

    if (setId) {
      const { error } = await supabase.from("flashcard_sets").delete().eq("id", setId)

      if (error) {
        throw new Error(`Failed to delete flashcard set: ${error.message}`)
      }

      return NextResponse.json({ success: true, message: "Flashcard set deleted" })
    }

    return NextResponse.json({ error: "Flashcard ID or Set ID is required" }, { status: 400 })
  } catch (error) {
    console.error("❌ Delete error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
})

async function getDocumentContent(documentId: number | string): Promise<string | null> {
  try {
    // Fetch document content from the vector store via the backend server
    // This assumes the server exposes an endpoint to get all chunks for a document
  const response = await fetch(`${process.env.DOCUMENT_SERVER_URL}/document-content?documentId=${documentId}`)
    if (!response.ok) {
      throw new Error("Failed to fetch document content from server")
    }
    const data = await response.json()
    if (!data || !data.content) {
      return null
    }
    return data.content
  } catch (error) {
    console.error("Error getting document content:", error)
    return null
  }
}

async function generateFlashcardsWithAI(
  content: string,
  count: number,
  difficulty: string,
  questionTypes: string[],
  focusAreas: string[],
): Promise<any[]> {
  const difficultyInstructions = {
    easy: "Create simple, straightforward questions focusing on basic facts and definitions.",
    medium: "Create moderately challenging questions that require understanding and application.",
    hard: "Create complex questions that require analysis, synthesis, and critical thinking.",
    mixed: "Create a mix of easy, medium, and hard questions.",
  }

  const typeInstructions = questionTypes
    .map((type) => {
      switch (type) {
        case "multiple_choice":
          return "Include multiple choice questions with 4 options each."
        case "fill_blank":
          return "Include fill-in-the-blank questions."
        case "open":
          return "Include open-ended questions."
        default:
          return ""
      }
    })
    .join(" ")

  const focusInstruction = focusAreas.length > 0 ? `Focus particularly on these areas: ${focusAreas.join(", ")}.` : ""

  const prompt = `Create exactly ${count} educational flashcards from the following content.

${difficultyInstructions[difficulty as keyof typeof difficultyInstructions]}
${typeInstructions}
${focusInstruction}

Content: ${content.substring(0, 2000)}

Please respond with a valid JSON array of flashcards in this exact format:
[
  {
    "question": "Clear, specific question",
    "answer": "Comprehensive but concise answer",
    "difficulty": "easy|medium|hard",
    "question_type": "open|multiple_choice|fill_blank",
    "options": ["option1", "option2", "option3", "option4"],
    "tags": ["tag1", "tag2"]
  }
]

Requirements:
- For multiple choice questions, include exactly 4 options with the correct answer being one of them
- For fill-in-the-blank questions, use underscores (_____) to indicate blanks
- Include relevant tags for categorization
- Ensure questions are clear and answers are accurate
- Make sure the JSON is valid and properly formatted`

  // List of free models to try (avoiding Microsoft and Meta as requested)
  const models = [
    "qwen/qwen-2.5-72b-instruct:free",
    "google/gemini-2.0-flash-exp:free", 
    "huggingface/qwen2.5-72b-instruct:free",
    "liquid/lfm-40b:free"
  ]

  let lastError = null

  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    console.log(`🤖 Attempting flashcard generation with model: ${model}`)
    
    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert educator creating study flashcards. Always respond with valid JSON only, no additional text and generate flashcards from the processed pdf document.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 3500,
      })

      const content_ = completion.choices[0]?.message?.content
      if (!content_) {
        throw new Error("No content returned from AI")
      }

      // Clean and parse JSON
      const cleanedContent = content_.trim().replace(/```json\n?|\n?```/g, "")
      const flashcards = JSON.parse(cleanedContent)

      if (!Array.isArray(flashcards)) {
        throw new Error("AI response is not an array")
      }

      console.log(`✅ Successfully generated flashcards with model: ${model}`)
      return flashcards.slice(0, count) // Ensure we don't exceed requested count
      
    } catch (error) {
      console.error(`❌ Model ${model} failed:`, error)
      lastError = error
      
      // If this is a rate limit error (429) or the last model, continue to next model
      if (i < models.length - 1) {
        console.log(`🔄 Trying next model...`)
        continue
      }
    }
  }

  // If all models failed, throw the last error
  console.error("❌ All models failed for flashcard generation")
  throw new Error(`Failed to generate flashcards: ${lastError instanceof Error ? lastError.message : "Unknown error"}`)
}
