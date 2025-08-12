"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CreditCard,
  Plus,
  Loader2,
  Settings,
  Trash2,
  Brain,
  Target,
  TrendingUp,
  FileText,
  Sparkles,
  CheckCircle,
  X,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react"
import { useFlashcardStore } from "@/lib/flashcard-store"
import { supabase } from "@/lib/supabase"
import FlashcardViewer from "./flashcard-viewer"
import SpacedRepetitionReview from "./spaced-repetition-review"
import dynamic from "next/dynamic"
import TagInput from "./TagInput"
import TagFilter from "./TagFilter"
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

type FlashcardGeneratorProps = {
  userId: string
}

interface Document {
  id: number
  name: string
  processed: boolean
  created_at: string
  documentId?: string // Add documentId field
}

const AnalyticsCharts = dynamic(() => import("./analytics-charts"), { ssr: false })

const FlashcardGenerator: React.FC<FlashcardGeneratorProps> = ({ userId }) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info")
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "generate"
  const [tags, setTags] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string[]>([])
  // Removed manual flashcard creation state
  const [setToDelete, setSetToDelete] = useState<number | null>(null)
  
  // Search and Pagination state
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage] = useState<number>(8) // 8 items per page for good UX
  const [sortBy, setSortBy] = useState<"name" | "date" | "cards">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const {
    flashcardSets,
    isGenerating,
    generationProgress,
    generationSettings,
    setFlashcardSets,
    setIsGenerating,
    setGenerationProgress,
    setGenerationSettings,
    exportFlashcards,
    removeFlashcardSet,
    flashcards,
    setFlashcards,
  } = useFlashcardStore()

  useEffect(() => {
    fetchDocuments()
    fetchFlashcardSets()
  }, [])

  const showMessage = (msg: string, type: "success" | "error" | "info" = "info") => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const data = await response.json()
      
      if (data.success) {
        // Filter for processed documents only
        const processedDocs = data.documents.filter((doc: any) => doc.processed)
        setDocuments(processedDocs)
      } else {
        console.error("Error fetching documents:", data.error)
        showMessage("Failed to load documents", "error")
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      showMessage("Failed to load documents", "error")
    }
  }

  const fetchFlashcardSets = async () => {
    try {
      // Remove userId parameter
      const response = await fetch("/api/flashcards", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch flashcard sets")
      }

      setFlashcardSets(result.data || [])
      // Flatten all flashcards from all sets and set them in the store for review
      const allFlashcards = (result.data || []).flatMap((set: any) => set.flashcards || [])
      setFlashcards(allFlashcards)
    } catch (error) {
      console.error("Error fetching flashcard sets:", error)
      showMessage("Failed to load flashcard sets", "error")
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!selectedDocument) {
      showMessage("Please select a document", "error")
      return
    }

    // Find the selected document - try multiple approaches
    let doc = documents.find((d) => d.id.toString() === selectedDocument)
    
    // If not found by id, try to find by name (filename)
    if (!doc) {
      doc = documents.find((d) => d.name === selectedDocument)
    }
    
    // If still not found, try to find by documentId field
    if (!doc) {
      doc = documents.find((d) => d.documentId === selectedDocument)
    }

    if (!doc) {
      console.error("Could not find document:", { selectedDocument, availableDocuments: documents.map(d => ({ id: d.id, name: d.name, documentId: d.documentId })) })
      showMessage("Selected document not found", "error")
      return
    }

    // Use the document's id as the primary identifier, fallback to documentId if needed
    const docIdToUse = doc.id || doc.documentId

    console.log("Selected document:", { doc, docIdToUse })

    setIsGenerating(true)
    setGenerationProgress(0)
    setMessage("")

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: docIdToUse, // Use the correct documentId
          count: generationSettings.count,
          difficulty: generationSettings.difficulty,
          questionTypes: generationSettings.questionTypes,
          focusAreas: generationSettings.focusAreas,
          tags, // Pass tags to backend
        }),
      })

      clearInterval(progressInterval)
      setGenerationProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate flashcards")
      }

      showMessage(`Successfully generated ${result.count} flashcards!`, "success")
      await fetchFlashcardSets()
      router.push("?tab=library")
    } catch (error) {
      console.error("Flashcard generation error:", error)
      showMessage(error instanceof Error ? error.message : "Failed to generate flashcards", "error")
    } finally {
      setIsGenerating(false)
      setTimeout(() => setGenerationProgress(0), 1000)
    }
  }

  const handleDeleteSet = async (setId: number) => {
    setSetToDelete(setId)
  }
  const confirmDeleteSet = async () => {
    if (setToDelete === null) return
    try {
      const response = await fetch(`/api/flashcards?setId=${setToDelete}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to delete flashcard set")
      }
      removeFlashcardSet(setToDelete)
      toast.success('Flashcard set deleted!')
      await fetchFlashcardSets()
    } catch (error) {
      toast.error('Failed to delete flashcard set')
    } finally {
      setSetToDelete(null)
    }
  }

  // Removed handleSaveManualFlashcard function

  // Collect all unique tags from all flashcards in all sets
  const allTags = Array.from(
    new Set(flashcardSets.flatMap((set) => (set.flashcards || []).flatMap((card) => card.tags || []))),
  )

  // Enhanced filtering with search, tags, and sorting
  const filteredAndSortedSets = flashcardSets
    .filter((set) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        set.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Tag filter
      const matchesTags = tagFilter.length === 0 || 
        (set.flashcards || []).some((card) => 
          (card.tags || []).some((tag) => tagFilter.includes(tag))
        )
      
      return matchesSearch && matchesTags
    })
    .sort((a, b) => {
      const factor = sortOrder === "asc" ? 1 : -1
      
      switch (sortBy) {
        case "name":
          return factor * a.name.localeCompare(b.name)
        case "date":
          return factor * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        case "cards":
          return factor * ((a.flashcards?.length || 0) - (b.flashcards?.length || 0))
        default:
          return 0
      }
    })

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedSets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSets = filteredAndSortedSets.slice(startIndex, endIndex)

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, tagFilter, sortBy, sortOrder])

  // Filter sets: only show sets with at least one card matching a selected tag (or all if no filter)
  const filteredSets = paginatedSets

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center space-y-4 animate-in fade-in-50 duration-700">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Flashcard Generator
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Transform your documents into interactive flashcards with AI-powered generation and spaced repetition learning
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          router.push(`?tab=${value}`)
        }}
        className="w-full animate-in fade-in-50 slide-in-from-bottom-2 duration-1000"
      >
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 backdrop-blur-sm">
          <TabsTrigger value="generate" className="flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <FileText className="h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <Brain className="h-4 w-4" />
            Review
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 transform transition-all duration-500 hover:shadow-2xl hover:scale-[1.01]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Generation Settings
              </CardTitle>
              <CardDescription>Configure how your flashcards will be generated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 group">
                  <Label className="">Select Document</Label>
                  <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                    <SelectTrigger className="transition-all duration-300 hover:border-blue-400 focus:border-blue-500 group-hover:shadow-sm">
                      <SelectValue placeholder="Choose a processed document" />
                    </SelectTrigger>
                    <SelectContent className="">
                      {documents.length > 0 ? (
                        documents.map((doc) => (
                          <SelectItem className="transition-colors duration-200 hover:bg-blue-50" key={doc.id} value={doc.id.toString()}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {doc.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem className="" value="no-docs" disabled>
                          No processed documents available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 group">
                  <Label className="">Number of Flashcards</Label>
                  <Input
                    className="transition-all duration-300 hover:border-blue-400 focus:border-blue-500 group-hover:shadow-sm"
                    type="number"
                    min="5"
                    max="50"
                    value={generationSettings.count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setGenerationSettings({ count: Number.parseInt(e.target.value) || 15 })
                    }
                  />
                </div>

                <div className="space-y-3 group">
                  <Label className="">Difficulty Level</Label>
                  <Select
                    value={generationSettings.difficulty}
                    onValueChange={(value: any) => setGenerationSettings({ difficulty: value })}
                  >
                    <SelectTrigger className="transition-all duration-300 hover:border-blue-400 focus:border-blue-500 group-hover:shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="">
                      <SelectItem className="transition-colors duration-200 hover:bg-blue-50" value="easy">
                        Easy
                      </SelectItem>
                      <SelectItem className="transition-colors duration-200 hover:bg-blue-50" value="medium">
                        Medium
                      </SelectItem>
                      <SelectItem className="transition-colors duration-200 hover:bg-blue-50" value="hard">
                        Hard
                      </SelectItem>
                      <SelectItem className="transition-colors duration-200 hover:bg-blue-50" value="mixed">
                        Mixed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="">Question Types</Label>
                  <div className="space-y-2">
                    {[
                      { id: "open", label: "Open-ended" },
                      { id: "multiple_choice", label: "Multiple Choice" },
                      { id: "fill_blank", label: "Fill in the Blank" },
                    ].map((type) => (
                      <div key={type.id} className="flex items-center space-x-2 group">
                        <Checkbox
                          id={type.id}
                          checked={generationSettings.questionTypes.includes(type.id as any)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setGenerationSettings({
                                questionTypes: [...generationSettings.questionTypes, type.id as any],
                              })
                            } else {
                              setGenerationSettings({
                                questionTypes: generationSettings.questionTypes.filter((t) => t !== type.id),
                              })
                            }
                          }}
                          className="transition-all duration-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label className="transition-colors duration-200 group-hover:text-blue-700 cursor-pointer" htmlFor={type.id}>
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 group">
                  <Label className="">Tags (optional)</Label>
                  <TagInput value={tags} onChange={setTags} placeholder="e.g. chapter 1, formula, definition" />
                </div>
              </div>

              {isGenerating && (
                <div className="space-y-3 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generating flashcards...</span>
                    <span className="text-sm text-muted-foreground">{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} className="w-full h-3" />
                </div>
              )}

              <Button
                onClick={handleGenerateFlashcards}
                disabled={isGenerating || !selectedDocument}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Flashcards...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Generate Flashcards
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Flashcard Library</h3>
            <Button variant="outline" size="sm" onClick={fetchFlashcardSets} className="transition-all duration-300 hover:scale-105 hover:shadow-md">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Search and Filter Controls */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Bar */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search flashcard sets..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-10 transition-all duration-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Sort Controls */}
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: "name" | "date" | "cards") => setSortBy(value)}>
                    <SelectTrigger className="flex-1 transition-all duration-300 hover:border-blue-400 focus:border-blue-500">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="">
                      <SelectItem className="transition-colors duration-200 hover:bg-blue-50" value="date">Sort by Date</SelectItem>
                      <SelectItem className="transition-colors duration-200 hover:bg-blue-50" value="name">Sort by Name</SelectItem>
                      <SelectItem className="transition-colors duration-200 hover:bg-blue-50" value="cards">Sort by Cards</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="transition-all duration-300 hover:scale-105"
                    title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </Button>
                </div>
              </div>

              {/* Results Summary */}
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span className="animate-in fade-in-50 duration-500">
                  Showing {filteredSets.length} of {flashcardSets.length} flashcard sets
                  {searchQuery && ` matching "${searchQuery}"`}
                </span>
                {(searchQuery || tagFilter.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("")
                      setTagFilter([])
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors duration-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <TagFilter allTags={allTags} selected={tagFilter} onChange={setTagFilter} />
          {filteredSets.length === 0 ? (
            <div className="text-center space-y-6 py-12 animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
              <p className="text-lg font-medium">No Flashcard Sets</p>
              <p className="text-base text-muted-foreground max-w-md mx-auto">
                Generate your first set of flashcards from your documents to get started
              </p>
              <Button size="lg" onClick={() => router.push("?tab=generate")} className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                Generate Flashcards
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
              {filteredSets.map((set, index) => (
                <AlertDialog key={set.id} open={setToDelete === set.id} onOpenChange={(open: boolean) => {
                  if (!open) setSetToDelete(null);
                }}>
                  <Card className="flex flex-col h-auto min-h-[280px] sm:min-h-[300px] shadow-sm hover:shadow-lg transition-all duration-500 hover:scale-[1.02] transform group animate-in fade-in-50 slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl truncate mb-2 group-hover:text-blue-700 transition-colors duration-300">{set.name}</CardTitle>
                        <CardDescription className="text-base font-medium">
                          {set.flashcards?.length || 0} cards
                        </CardDescription>
                      </div>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSet(set.id)}
                          title="Delete entire set"
                          className="flex-shrink-0 ml-3 h-9 w-9 transition-all duration-300 hover:scale-110 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-6 overflow-hidden px-6 pb-6">
                      <div className="flex flex-col space-y-3">
                        <p className="text-base text-muted-foreground">
                          Created {new Date(set.created_at).toLocaleDateString()}
                        </p>
                        {set.settings && (
                          <div className="flex flex-wrap gap-3">
                            <Badge variant="secondary" className="text-sm px-3 py-1 transition-all duration-300 hover:scale-105">
                              {set.settings.difficulty || "mixed"}
                            </Badge>
                            <Badge variant="outline" className="text-sm px-3 py-1 transition-all duration-300 hover:scale-105">
                              {set.settings.count || 0} cards
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Enhanced Flashcard Preview Container */}
                      <div className="flex-1 border-2 rounded-xl bg-gradient-to-br from-muted/10 to-muted/30 overflow-hidden shadow-inner transition-all duration-500 group-hover:shadow-lg">
                        <div className="h-full min-h-[140px] sm:min-h-[150px] md:min-h-[160px] p-4">
                          <FlashcardViewer
                            flashcards={(set.flashcards || []).map((card) => ({
                              ...card,
                              id: Number(card.id),
                            }))}
                            hideControls={true}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <AlertDialogContent className="">
                      <AlertDialogHeader className="">
                        <AlertDialogTitle className="">Delete Flashcard Set?</AlertDialogTitle>
                        <AlertDialogDescription className="">
                          Are you sure you want to delete this flashcard set? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="">
                        <AlertDialogCancel onClick={() => setSetToDelete(null)} className="transition-all duration-300 hover:scale-105">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSet} className="transition-all duration-300 hover:scale-105">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </Card>
                </AlertDialog>
              ))}
            </div>
          )}

          {/* Pagination Controls - Outside conditional */}
          {filteredAndSortedSets.length > itemsPerPage && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} • {filteredAndSortedSets.length} total sets
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>

                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 transition-all duration-300 hover:scale-110 ${
                                currentPage === pageNum 
                                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
                                  : "hover:bg-blue-50"
                              }`}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        <TabsContent value="review" className="animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
          <SpacedRepetitionReview />
        </TabsContent>

        <TabsContent value="analytics" className="animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
          <Card className="transform transition-all duration-500 hover:shadow-lg hover:scale-[1.01]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Learning Analytics
              </CardTitle>
              <CardDescription>Track your progress and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsCharts />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {message && (
        <Alert
          className={`border-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-500 transform transition-all hover:scale-[1.01] ${
            messageType === "success"
              ? "border-green-200 bg-green-50"
              : messageType === "error"
                ? "border-red-200 bg-red-50"
                : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="flex items-center gap-2">
            {messageType === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
            {messageType === "error" && <X className="w-4 h-4 text-red-600" />}
            {messageType === "info" && <Target className="w-4 h-4 text-blue-600" />}
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
      {/* AlertDialog for delete is now inside each card */}
    </div>
  )
}

export default FlashcardGenerator
