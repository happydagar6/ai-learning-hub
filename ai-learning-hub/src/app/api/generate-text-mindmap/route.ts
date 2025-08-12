import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

// Initialize OpenAI with OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Validate environment variables
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY environment variable is not set!")
}

function generateFallbackMindMap(title: string, weeks: any[]): string {
  const centerTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;
  const titleLength = Math.max(centerTitle.length + 4, 40);
  
  let mindMap = `╭${'─'.repeat(titleLength)}╮\n`;
  mindMap += `│${' '.repeat(Math.floor((titleLength - centerTitle.length) / 2))}${centerTitle}${' '.repeat(Math.ceil((titleLength - centerTitle.length) / 2))}│\n`;
  mindMap += `╰${'─'.repeat(titleLength)}╯\n`;
  mindMap += `${' '.repeat(Math.floor(titleLength / 2))}│\n`;

  weeks.forEach((week, index) => {
    const weekNum = index + 1;
    const isLast = index === weeks.length - 1;
    const weekTitle = week.title || `Week ${weekNum}`;
    const tasks = week.tasks && Array.isArray(week.tasks) ? week.tasks.slice(0, 3) : [`Study ${weekTitle}`];
    
    // Beautiful difficulty indicators
    let difficultyBadge = '🟢 BASIC';
    let difficultyEmoji = '📚';
    if (weekNum > Math.ceil(weeks.length * 0.75)) {
      difficultyBadge = '🔴 EXPERT';
      difficultyEmoji = '🔥';
    } else if (weekNum > Math.ceil(weeks.length * 0.5)) {
      difficultyBadge = '🟡 ADVANCED';
      difficultyEmoji = '⚡';
    } else if (weekNum > Math.ceil(weeks.length * 0.25)) {
      difficultyBadge = '🟠 INTERMEDIATE';
      difficultyEmoji = '🧠';
    }
    
    // Main week branch with enhanced styling
    const mainConnector = isLast ? '╰─' : '├─';
    const weekDisplay = `Week ${weekNum.toString().padStart(2, '0')}: ${weekTitle}`;
    
    mindMap += `${mainConnector}●═══> ${difficultyEmoji} ${weekDisplay}\n`;
    mindMap += `${isLast ? ' ' : '│'}     ╭─ ${difficultyBadge}\n`;
    
    // Add beautified tasks as sub-nodes
    tasks.forEach((task: any, taskIndex: number) => {
      const isLastTask = taskIndex === tasks.length - 1;
      const baseConnector = isLast ? ' ' : '│';
      const taskConnector = isLastTask ? '╰──' : '├──';
      const taskEmojis = ['📝', '�', '🎯', '�', '⚡', '�', '🧪', '�'];
      const taskEmoji = taskEmojis[taskIndex % taskEmojis.length];
      
      mindMap += `${baseConnector}     ${taskConnector} ${taskEmoji} ${task}\n`;
    });
    
    if (!isLast) {
      mindMap += `│\n`;
    }
  });

  // Enhanced footer with styling
  mindMap += `\n`;
  mindMap += `╭──────────────────────────────────────╮\n`;
  mindMap += `│  🎯 LEARNING OBJECTIVES SUMMARY      │\n`;
  mindMap += `├──────────────────────────────────────┤\n`;
  mindMap += `│  📊 Total Duration: ${weeks.length.toString().padStart(2)} weeks         │\n`;
  mindMap += `│  🚀 Progressive Difficulty Curve     │\n`;
  mindMap += `│  🏆 Master Every Concept Step-by-Step│\n`;
  mindMap += `╰──────────────────────────────────────╯`;

  return mindMap;
}

function generateInteractiveMindMapData(title: string, weeks: any[]) {
  const difficultyLevels = ['easy', 'medium', 'hard'];
  const learningTypes = ['foundation', 'building', 'application', 'mastery'];
  const estimatedHours = [3, 4, 5, 6, 7, 8, 9, 10];

  return {
    title,
    totalWeeks: weeks.length,
    estimatedTotalHours: weeks.length * 5,
    nodes: weeks.map((week, index) => ({
      id: `week-${index}`,
      title: week.title || `Week ${index + 1}`,
      description: week.description || `Learning objectives for week ${index + 1}`,
      difficulty: difficultyLevels[Math.min(Math.floor(index / 2), 2)],
      learningType: learningTypes[index % 4],
      estimatedHours: estimatedHours[Math.min(index, 7)],
      tasks: week.tasks || [
        `Complete ${week.title || 'weekly objectives'}`,
        'Review and practice concepts',
        'Take assessments'
      ],
      prerequisites: index > 0 ? [`week-${index - 1}`] : [],
      outcomes: [
        'Enhanced understanding',
        'Practical application skills',
        'Progress milestone achieved'
      ],
      resources: [
        'Study materials',
        'Practice exercises',
        'Assessment tools'
      ]
    })),
    connections: weeks.map((_, index) => ({
      from: `week-${index}`,
      to: index < weeks.length - 1 ? `week-${index + 1}` : null,
      type: 'progression'
    })).filter(conn => conn.to !== null)
  };
}

export const POST = requireAuth(async (request: NextRequest, user: any) => {
  try {
    const { title, weeks, studyPlanId } = await request.json();

    if (!title || !weeks) {
      return NextResponse.json(
        { 
          success: false,
          error: "Title and weeks are required" 
        },
        { status: 400 }
      );
    }

    console.log("Generating text mind map for:", title);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check for existing cached mindmap if studyPlanId is provided
    if (studyPlanId) {
      console.log("🔍 Checking for cached mind map for study plan:", studyPlanId);
      
      const { data: cachedMindMap, error: cacheError } = await supabase
        .from("mind_maps")
        .select("*")
        .eq("study_plan_id", studyPlanId)
        .eq("user_id", user.id)
        .single();

      if (cachedMindMap && !cacheError) {
        console.log("✅ Found cached mind map, returning from database");
        return NextResponse.json({
          success: true,
          data: {
            mindMapText: cachedMindMap.text_content,
            interactiveData: cachedMindMap.interactive_data,
            model: "cached",
            cached: true,
            generatedAt: cachedMindMap.created_at
          }
        });
      }
    }

    const prompt = `Create a beautiful, professional ASCII text mindmap for: "${title}"

Weekly Structure:
${weeks.map((week: any, index: number) => {
  const weekNum = index + 1;
  const weekTitle = week.title || `Week ${weekNum}`;
  const tasks = week.tasks && Array.isArray(week.tasks) ? week.tasks.slice(0, 3) : [`Study ${weekTitle}`];
  return `Week ${weekNum}: ${weekTitle} - ${tasks.join(', ')}`;
}).join('\n')}

Create a stunning ASCII mindmap with these requirements:
- Use beautiful rounded box characters: ╭─╮ ╰─╯ │ ├── ╰──
- Progressive difficulty indicators: 🟢 BASIC → 🟠 INTERMEDIATE → 🟡 ADVANCED → 🔴 EXPERT
- Rich emoji variety: 📚 💻 🎯 🔬 ⚡ 🎨 🧪 🚀 📝 🧠 🔥
- Centered title in a beautiful box
- Clear visual hierarchy with proper spacing
- Include all ${weeks.length} weeks with enhanced styling

Format example:
╭─────────────────────────────────────╮
│        ${title}                      │
╰─────────────────────────────────────╯
                    │
├─●═══> 📚 Week 01: Fundamentals
│      ╭─ 🟢 BASIC
│      ├── � Learn core concepts
│      ├── 💻 Practice exercises  
│      ╰── 🎯 Review and reinforce
│
├─●═══> 🧠 Week 02: Intermediate Topics
│      ╭─ 🟠 INTERMEDIATE
│      ├── � Deep dive into advanced concepts
│      ├── ⚡ Hands-on projects
│      ╰── � Creative applications
│
╰─●═══> 🔥 Week 03: Expert Mastery
       ╭─ � EXPERT
       ├── 🧪 Complex implementations
       ├── 🚀 Final capstone project
       ╰── ✅ Comprehensive assessment

╭──────────────────────────────────────╮
│  🎯 LEARNING OBJECTIVES SUMMARY      │
├──────────────────────────────────────┤
│  📊 Total Duration: ${weeks.length.toString().padStart(2)} weeks         │
│  🚀 Progressive Difficulty Curve     │
│  🏆 Master Every Concept Step-by-Step│
╰──────────────────────────────────────╯

Generate the COMPLETE beautiful mindmap for all ${weeks.length} weeks with enhanced visual styling and proper formatting.`;

    console.log("Generated improved prompt for AI");

    let mindMapText: string = "";

    // List of models to try in order of preference - using only reliable free models
    const modelsToTry = [
      "deepseek/deepseek-chat-v3-0324:free", 
      "google/gemini-2.0-flash-exp:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "deepseek/deepseek-r1:free",
      "google/gemma-2-9b-it:free",
    ];

    // Try each model with timeout
    for (const model of modelsToTry) {
      try {
        console.log(`Trying model: ${model}`);
        
        const completion = await Promise.race([
          openai.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: "You are a master ASCII artist specializing in beautiful, professional text mindmaps. Create stunning visual hierarchies using rounded box characters (╭─╮ ╰─╯), elegant connectors (●═══>), and rich emoji combinations. Always generate complete mindmaps with progressive difficulty indicators (🟢🟠🟡🔴), centered titles in boxes, and comprehensive styling. Make every mindmap a visual masterpiece while maintaining perfect readability."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 1900,
            temperature: 0.3,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model timeout')), 60000)
          )
        ]) as any;

        if (completion && completion.choices && completion.choices[0] && completion.choices[0].message) {
          mindMapText = completion.choices[0].message.content || "";
          
          if (mindMapText.trim()) {
            console.log(`✅ Generated mind map with model: ${model}`);
            
            // Generate interactive mindmap data
            const interactiveData = generateInteractiveMindMapData(title, weeks);
            
            // Save to database if studyPlanId is provided
            if (studyPlanId) {
              try {
                const mindmapData = {
                  study_plan_id: studyPlanId,
                  user_id: user.id,
                  text_content: mindMapText,
                  interactive_data: interactiveData,
                  updated_at: new Date().toISOString()
                };

                const { error: saveError } = await supabase
                  .from("mind_maps")
                  .upsert(mindmapData, { 
                    onConflict: 'study_plan_id',
                    ignoreDuplicates: false 
                  });

                if (saveError) {
                  console.warn("Failed to save mindmap to database:", saveError);
                } else {
                  console.log("✅ Mindmap saved to database successfully");
                }
              } catch (dbError) {
                console.warn("Database save error:", dbError);
              }
            }
            
            return NextResponse.json({ 
              success: true,
              data: {
                mindMapText,
                interactiveData,
                model,
                cached: false,
                generatedAt: new Date().toISOString()
              }
            });
          }
        }
      } catch (error: any) {
        console.log(`❌ Model ${model} failed:`, error.message);
        if (error.message === 'Model timeout') {
          console.log(`⏰ ${model} timed out after 60 seconds`);
        }
        continue;
      }
    }

    // If all models fail, generate a fallback mind map
    console.log("All AI models failed, generating fallback mind map");
    const fallbackMindMap = generateFallbackMindMap(title, weeks);
    const interactiveData = generateInteractiveMindMapData(title, weeks);
    
    // Save fallback to database if studyPlanId is provided
    if (studyPlanId) {
      try {
        const mindmapData = {
          study_plan_id: studyPlanId,
          user_id: user.id,
          text_content: fallbackMindMap,
          interactive_data: interactiveData,
          updated_at: new Date().toISOString()
        };

        const { error: saveError } = await supabase
          .from("mind_maps")
          .upsert(mindmapData, { 
            onConflict: 'study_plan_id',
            ignoreDuplicates: false 
          });

        if (saveError) {
          console.warn("Failed to save fallback mindmap to database:", saveError);
        } else {
          console.log("✅ Fallback mindmap saved to database successfully");
        }
      } catch (dbError) {
        console.warn("Database save error for fallback:", dbError);
      }
    }
    
    return NextResponse.json({ 
      success: true,
      data: {
        mindMapText: fallbackMindMap,
        interactiveData,
        model: "fallback",
        cached: false,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error generating mind map:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to generate mind map" 
      },
      { status: 500 }
    );
  }
})
