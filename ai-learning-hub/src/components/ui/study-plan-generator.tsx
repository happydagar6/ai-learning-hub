"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Brain,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  Users,
  Map,
  CheckCircle,
  Circle,
  Target,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface StudyPlanGeneratorProps {
  userId: string
}

interface Course {
  id: number
  name: string
  created_at: string
}

interface StudyPlanWeek {
  week: number
  title: string
  tasks: string[]
  objectives?: string[]
  resources?: string[]
}

interface StudyPlanContent {
  title: string
  description?: string
  weeks: StudyPlanWeek[]
  totalWeeks: number
  estimatedHoursPerWeek?: number
}

interface StudyPlan {
  id: number
  title: string
  content: StudyPlanContent
  weeks: number
  custom_prompt?: string
  created_at: string
  updated_at: string
  courses: {
    id: number
    name: string
  }
}

const StudyPlanGenerator: React.FC<StudyPlanGeneratorProps> = ({ userId }) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [syllabus, setSyllabus] = useState<string>("")
  const [weeks, setWeeks] = useState<string>("")
  const [customPrompt, setCustomPrompt] = useState<string>("")
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([])
  const [generating, setGenerating] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>("")
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info")
  const [planToDelete, setPlanToDelete] = useState<number | null>(null)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [planToDownload, setPlanToDownload] = useState<StudyPlan | null>(null)

  useEffect(() => {
    fetchCourses()
    fetchStudyPlans()
  }, [])

  const showMessage = (msg: string, type: "success" | "error" | "info" = "info") => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/courses', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch courses')
      }

      setCourses(result.courses || [])
    } catch (error) {
      console.error("Unexpected error fetching courses:", error)
      showMessage("Unexpected error loading courses", "error")
    } finally {
      setLoading(false)
    }
  }

  const fetchStudyPlans = async () => {
    try {
      const response = await fetch("/api/generate-study-plan", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch study plans")
      }

      setStudyPlans(result.data || [])
    } catch (error) {
      console.error("Error fetching study plans:", error)
      showMessage("Failed to load study plans", "error")
    }
  }

  const generateStudyPlan = async () => {
    if (!selectedCourse || !syllabus.trim()) {
      showMessage("Please select a course and provide syllabus information", "error")
      return
    }

    if (!weeks) {
      showMessage("Please select study duration", "error")
      return
    }

    setGenerating(true)
    setMessage("")

    try {
      const response = await fetch("/api/generate-study-plan", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          syllabus: syllabus.trim(),
          weeks: Number.parseInt(weeks),
          customPrompt: customPrompt.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Check if it's a specific error code
        if (result.code === "NO_COURSES") {
          throw new Error("NO_COURSES:" + (result.message || "No courses found"))
        }
        throw new Error(result.error || "Failed to generate study plan")
      }

      showMessage("Study plan generated successfully!", "success")
      setSyllabus("")
      setCustomPrompt("")
      await fetchStudyPlans()
    } catch (error) {
      console.error("Study plan generation error:", error)
      if (error instanceof Error) {
        if (error.message.startsWith("NO_COURSES:")) {
          const message = error.message.replace("NO_COURSES:", "")
          showMessage(message, "error")
        } else if (error.message.includes("rate limit") || error.message.includes("quota")) {
          showMessage("AI service is temporarily busy. Please try again in a few minutes.", "error")
        } else if (error.message.includes("Course not found")) {
          showMessage("The selected course could not be found. Please try selecting a different course.", "error")
        } else {
          showMessage(`Error: ${error.message}`, "error")
        }
      } else {
        showMessage("An unexpected error occurred. Please try again.", "error")
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleDeletePlan = (planId: number) => {
    setPlanToDelete(planId)
  }
  const confirmDeletePlan = async () => {
    if (planToDelete === null) return
    try {
      const response = await fetch(`/api/generate-study-plan?id=${planToDelete}`, {
        method: "DELETE",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete study plan")
      }
      toast.success('Study plan deleted!')
      await fetchStudyPlans()
    } catch (error) {
      toast.error('Failed to delete study plan')
    } finally {
      setPlanToDelete(null)
    }
  }

  const downloadStudyPlan = (plan: StudyPlan) => {
    setPlanToDownload(plan)
    setShowDownloadDialog(true)
  }

  const downloadAsJSON = () => {
    if (!planToDownload) return
    
    const exportData = {
      studyPlan: {
        id: planToDownload.id,
        title: planToDownload.title,
        weeks: planToDownload.weeks,
        course: planToDownload.courses?.name,
        content: planToDownload.content,
        created_at: planToDownload.created_at
      },
      exportedAt: new Date().toISOString(),
      exportedBy: 'AI Learning Hub'
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${planToDownload.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowDownloadDialog(false)
    setPlanToDownload(null)
  }

  const downloadAsText = () => {
    if (!planToDownload) return

    const content = `# ${planToDownload.title}

**Course:** ${planToDownload.courses.name}
**Duration:** ${planToDownload.weeks} weeks
**Created:** ${new Date(planToDownload.created_at).toLocaleDateString()}

${planToDownload.content.description ? `**Description:** ${planToDownload.content.description}\n` : ""}
${planToDownload.content.estimatedHoursPerWeek ? `**Estimated Hours per Week:** ${planToDownload.content.estimatedHoursPerWeek}\n` : ""}

## Study Plan

${planToDownload.content.weeks
  .map(
    (week) => `
### Week ${week.week}: ${week.title}

**Tasks:**
${week.tasks.map((task) => `- ${task}`).join("\n")}

${
  week.objectives && week.objectives.length > 0
    ? `**Learning Objectives:**
${week.objectives.map((obj) => `- ${obj}`).join("\n")}`
    : ""
}

${
  week.resources && week.resources.length > 0
    ? `**Resources:**
${week.resources.map((resource) => `- ${resource}`).join("\n")}`
    : ""
}
`,
  )
  .join("\n")}

---
Generated on ${new Date(planToDownload.created_at).toLocaleString()}
`

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${planToDownload.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_study_plan.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowDownloadDialog(false)
    setPlanToDownload(null)
  }

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto p-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-8 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full shadow-lg animate-pulse-glow">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            AI Study Plan Generator
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Transform your course syllabus into a personalized, step-by-step study plan powered by AI. Get organized, stay
          on track, and achieve your learning goals with intelligent scheduling and progress tracking.
        </p>
      </div>

      {/* Study Plans Overview - Show if plans exist */}
      {studyPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-in-left">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200/50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{studyPlans.length}</div>
              <div className="text-sm text-muted-foreground">Study Plans Created</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200/50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{studyPlans.reduce((acc, plan) => acc + plan.weeks, 0)}</div>
              <div className="text-sm text-muted-foreground">Total Weeks Planned</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200/50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{courses.length}</div>
              <div className="text-sm text-muted-foreground">Courses Available</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generator Card */}
      <Card className="border shadow-xl bg-card hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] animate-bounce-in">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg animate-pulse">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Create Your Study Plan</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Fill in the details below and let AI create your personalized study schedule
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2 transition-colors hover:text-blue-600">
                  <BookOpen className="h-4 w-4" />
                  Select Course
                </Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    fetchCourses()
                    showMessage("Refreshing courses...", "info")
                  }}
                  disabled={loading}
                  className="h-8 px-3"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={loading}>
                <SelectTrigger className="w-full h-12 border-2 border-border hover:border-blue-300 focus:border-blue-500 transition-all duration-200 hover:shadow-md bg-background">
                  <SelectValue placeholder={loading ? "Loading courses..." : "Choose a course"} />
                </SelectTrigger>
                <SelectContent className="w-full max-h-60 bg-card border border-border shadow-lg">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <SelectItem className="" key={course.id} value={course.id.toString()}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                          {course.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem className="" value="no-courses" disabled>
                      {loading ? "Loading..." : "No courses - create one in Upload page"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2 transition-colors hover:text-blue-600">
                <Clock className="h-4 w-4" />
                Study Duration
              </Label>
              <Select value={weeks} onValueChange={setWeeks}>
                <SelectTrigger className="w-full h-12 border-2 border-border hover:border-blue-300 focus:border-blue-500 transition-all duration-200 hover:shadow-md bg-background">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="w-full bg-card border border-border shadow-lg">
                  <SelectItem className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" value="4">4 Weeks (1 Month)</SelectItem>
                  <SelectItem className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" value="8">8 Weeks (2 Months)</SelectItem>
                  <SelectItem className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" value="12">12 Weeks (3 Months)</SelectItem>
                  <SelectItem className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer" value="16">16 Weeks (4 Months)</SelectItem>
                  <SelectItem className="" value="20">20 Weeks (5 Months)</SelectItem>
                  <SelectItem className="" value="24">24 Weeks (6 Months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2 transition-colors hover:text-blue-600">
              <BookOpen className="h-4 w-4" />
              Course Syllabus & Learning Objectives
            </Label>
            <Textarea
              placeholder="Paste your course syllabus, topics, learning objectives, or any specific requirements here. Include key concepts, assignments, and assessment methods. The more detailed you are, the better your personalized study plan will be!"
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              className="w-full min-h-[180px] border-2 border-border hover:border-blue-300 focus:border-blue-500 transition-all duration-200 resize-y bg-background hover:shadow-md"
            />
            <div className="text-xs flex items-center justify-between transition-colors">
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>Course details help create better plans</span>
              </div>
              <span className={`font-medium transition-colors ${
                syllabus.length > 1800 ? "text-orange-500 animate-pulse" : 
                syllabus.length > 1500 ? "text-yellow-500" : 
                "text-muted-foreground"
              }`}>
                {syllabus.length}/2000
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2 transition-colors hover:text-blue-600">
              <Users className="h-4 w-4" />
              Custom Requirements (Optional)
            </Label>
            <Textarea
              placeholder="Add any specific requirements, learning preferences, or constraints. For example: 'Focus on practical exercises', 'Include weekly quizzes', 'Emphasize group projects', etc."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full min-h-[100px] border-2 border-border hover:border-blue-300 focus:border-blue-500 transition-all duration-200 resize-y bg-background hover:shadow-md"
            />
          </div>

          {/* Form Validation Feedback */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {selectedCourse ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-sm ${selectedCourse ? 'text-green-600' : 'text-muted-foreground'}`}>
                Course selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {syllabus.trim() ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-sm ${syllabus.trim() ? 'text-green-600' : 'text-muted-foreground'}`}>
                Syllabus provided
              </span>
            </div>
            <div className="flex items-center gap-2">
              {weeks ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-sm ${weeks ? 'text-green-600' : 'text-muted-foreground'}`}>
                Duration selected
              </span>
            </div>
          </div>

          <Button
            onClick={generateStudyPlan}
            disabled={generating || !selectedCourse || !syllabus.trim() || !weeks}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            {generating ? (
              <div className="flex items-center justify-center gap-3 relative z-10">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating Your Study Plan...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 relative z-10">
                <Sparkles className="h-5 w-5 animate-bounce" />
                <span>Generate AI Study Plan</span>
              </div>
            )}
          </Button>

          {message && (
            <Alert
              className={`border-2 ${
                messageType === "success"
                  ? "border-green-200 bg-green-50"
                  : messageType === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-blue-200 bg-blue-50"
              }`}
              variant="default"
            >
              <div className="flex items-center gap-2">
                {messageType === "success" && <AlertCircle className="w-4 h-4 text-green-600" />}
                {messageType === "error" && <AlertCircle className="w-4 h-4 text-red-600" />}
                {messageType === "info" && <AlertCircle className="w-4 h-4 text-blue-600" />}
                <AlertDescription
                  className={
                    messageType === "success"
                      ? "text-green-700"
                      : messageType === "error"
                        ? "text-red-700"
                        : "text-blue-700"
                  }
                >
                  {message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Study Plans List */}
      <Card className="border shadow-xl bg-card hover:shadow-2xl transition-all duration-300">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg animate-pulse">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Your Study Plans</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  All your AI-generated study schedules in one place
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={fetchStudyPlans} className="flex items-center gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {studyPlans.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center hover:scale-110 transition-transform duration-300">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Study Plans Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create your first AI-powered study plan by filling out the form above. Get personalized learning
                schedules tailored to your course and timeline.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {studyPlans.map((plan) => (
                <StudyPlanCard
                  key={plan.id}
                  plan={plan}
                  onDelete={() => handleDeletePlan(plan.id)}
                  onDownload={() => downloadStudyPlan(plan)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog
        open={planToDelete !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setPlanToDelete(null)
        }}
      >
        <AlertDialogContent className="">
          <AlertDialogHeader className="">
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Study Plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {planToDelete && (() => {
                const planToDeleteObj = studyPlans.find(p => p.id === planToDelete)
                return planToDeleteObj ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="font-semibold text-red-800 dark:text-red-200 mb-1">
                        Study Plan: &quot;{planToDeleteObj.title}&quot;
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        Course: {planToDeleteObj.courses?.name} • {planToDeleteObj.weeks} weeks
                      </div>
                    </div>
                    
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1 flex items-center gap-2">
                        <Map className="h-4 w-4" />
                        Associated Mind Map
                      </div>
                      <div className="text-sm text-amber-700 dark:text-amber-300">
                        Any mind map generated for this study plan will also be permanently deleted.
                      </div>
                    </div>
                    
                    <div className="text-muted-foreground text-sm font-medium">
                      ⚠️ This action cannot be undone. All data will be permanently removed.
                    </div>
                  </div>
                ) : (
                  <div>Are you sure you want to delete this study plan? This action cannot be undone.</div>
                )
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={undefined}>
            <AlertDialogCancel onClick={() => setPlanToDelete(null)} className={undefined}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePlan} 
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Download Format Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="">
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Choose Download Format
            </DialogTitle>
            <DialogDescription className="">
              Select the format you&apos;d like to download your study plan in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={downloadAsJSON}
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-4 border-2 hover:border-blue-300"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">JSON Format</div>
                  <div className="text-sm text-muted-foreground">Complete data export</div>
                </div>
              </Button>
              
              <Button
                onClick={downloadAsText}
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-4 border-2 hover:border-green-300"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Text Format</div>
                  <div className="text-sm text-muted-foreground">Human-readable study plan</div>
                </div>
              </Button>
            </div>
          </div>
          
          <DialogFooter className="">
            <Button variant="ghost" onClick={() => setShowDownloadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudyPlanCard({
  plan,
  onDelete,
  onDownload,
}: {
  plan: StudyPlan
  onDelete: () => void
  onDownload: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([])
  const [currentWeek, setCurrentWeek] = useState(1)

  // Mock progress tracking - in a real app, this would come from a database
  const toggleWeekCompletion = (weekNumber: number) => {
    setCompletedWeeks(prev => 
      prev.includes(weekNumber) 
        ? prev.filter(w => w !== weekNumber)
        : [...prev, weekNumber]
    )
  }

  const getProgressPercentage = () => {
    return Math.round((completedWeeks.length / plan.weeks) * 100)
  }

  return (
    <Card className="border-2 border-border hover:border-blue-300 transition-all duration-300 hover:shadow-xl group bg-card hover:scale-[1.01]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl font-bold text-foreground group-hover:text-blue-600 transition-colors">
                {plan.title}
              </CardTitle>
              <Badge variant="secondary" className="text-xs hover:scale-105 transition-transform">
                {plan.weeks} weeks
              </Badge>
              <div className="flex items-center gap-2 ml-auto">
                <div className="text-xs text-muted-foreground">{getProgressPercentage()}% complete</div>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500 ease-out"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            </div>
            <CardDescription className="text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {plan.courses?.name}
              <span className="text-muted-foreground/50">•</span>
              <Clock className="h-4 w-4" />
              Created {new Date(plan.created_at).toLocaleDateString()}
            </CardDescription>
            {plan.content.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{plan.content.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="border-2 border-border hover:border-green-300 hover:bg-green-500/10 transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="border-2 border-border hover:border-red-300 hover:bg-red-500/10 transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="border-2 border-border hover:border-blue-300 hover:bg-blue-500/10 transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 transition-transform duration-200" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    <span>View Plan</span>
                  </>
                )}
              </div>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/dashboard/mindmap?studyPlanId=${plan.id}`}
              className="border-2 border-border hover:border-blue-300 hover:bg-blue-500/10 transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <Map className="h-4 w-4" />
              📊 View Mind Map
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 animate-fade-in">
          <div className="space-y-6">
            {plan.content.estimatedHoursPerWeek && (
              <div className="flex items-center gap-2 text-sm text-foreground bg-blue-500/10 p-3 rounded-lg border border-blue-200/50 hover:bg-blue-500/20 transition-colors">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Estimated {plan.content.estimatedHoursPerWeek} hours per week</span>
              </div>
            )}
            {plan.content.weeks?.map((week, index) => (
              <div key={index} className="relative group hover:scale-[1.02] transition-transform duration-200">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full group-hover:w-2 transition-all duration-300"></div>
                <div className="ml-6 p-4 bg-gradient-to-r from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 rounded-lg border border-border transition-all duration-300 hover:shadow-md">
                  <h4 className="font-bold text-lg text-foreground flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full hover:scale-110 transition-transform duration-200">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <span>
                        Week {week.week}: {week.title}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleWeekCompletion(week.week)}
                      className="flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: completedWeeks.includes(week.week) ? '#10b981' : 'transparent',
                        borderColor: completedWeeks.includes(week.week) ? '#10b981' : 'hsl(var(--border))',
                        color: completedWeeks.includes(week.week) ? 'white' : 'hsl(var(--muted-foreground))'
                      }}
                    >
                      {completedWeeks.includes(week.week) ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Completed</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4" />
                          <span className="text-xs font-medium">Mark Complete</span>
                        </>
                      )}
                    </button>
                  </h4>

                  {week.tasks && week.tasks.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        Tasks:
                      </h5>
                      <ul className="space-y-2">
                        {week.tasks.map((task, taskIndex) => (
                          <li
                            key={taskIndex}
                            className="flex items-start gap-3 text-muted-foreground hover:text-foreground transition-colors group/task"
                          >
                            <div className="p-1 bg-green-500/20 rounded-full mt-0.5 group-hover/task:bg-green-500/30 transition-colors">
                              <AlertCircle className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-sm leading-relaxed">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {week.objectives && week.objectives.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        Learning Objectives:
                      </h5>
                      <ul className="space-y-1">
                        {week.objectives.map((objective, objIndex) => (
                          <li key={objIndex} className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group/objective">
                            <BookOpen className="h-3 w-3 text-blue-500 mt-0.5 group-hover/objective:scale-110 transition-transform" />
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {week.resources && week.resources.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        Resources:
                      </h5>
                      <ul className="space-y-1">
                        {week.resources.map((resource, resIndex) => (
                          <li key={resIndex} className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group/resource">
                            <BookOpen className="h-3 w-3 text-purple-500 mt-0.5 group-hover/resource:scale-110 transition-transform" />
                            <span>{resource}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default StudyPlanGenerator