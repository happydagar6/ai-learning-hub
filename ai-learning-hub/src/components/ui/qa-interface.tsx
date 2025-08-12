"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Loader2, MessageSquare, Send, User, Copy, Check, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VoiceControls } from "@/components/ui/voice-controls"
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition"
import { StudyDocument } from "@/types/document"

interface QAInterfaceProps {
  userId: string
  selectedDocument?: StudyDocument | null
}

interface Doc {
  content?: string
  metadata?: {
    loc?: {
      pageNumber?: number
    }
    source?: string
    relevanceScore?: number
    pageNumber?: string | number
    referenceId?: number
  }
}

interface PageReference {
  referenceId: number
  pageNumber: string | number
  source: string
  preview: string
}

interface MessageContent {
  type: "success" | "error"
  content: string
  formatted?: boolean
}

interface IMessage {
  role: "assistant" | "user"
  content?: string | MessageContent
  documents?: Doc[]
  pageReferences?: PageReference[]
  timestamp: Date | string
  contextSections?: number
}

const QAInterface: React.FC<QAInterfaceProps> = ({ userId, selectedDocument }) => {
  // Load messages from localStorage on component mount
  const loadMessagesFromStorage = (): IMessage[] => {
    if (typeof window !== 'undefined') {
      try {
        const savedMessages = localStorage.getItem(`qa-messages-${userId}`)
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages)
          // Convert timestamp strings back to Date objects
          return parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }
        return []
      } catch (error) {
        console.warn('Error loading messages from localStorage:', error)
        return []
      }
    }
    return []
  }

  // Save messages to localStorage
  const saveMessagesToStorage = (messages: IMessage[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`qa-messages-${userId}`, JSON.stringify(messages))
      } catch (error) {
        console.warn('Error saving messages to localStorage:', error)
      }
    }
  }

  const [question, setQuestion] = useState<string>("")
  const [messages, setMessages] = useState<IMessage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false)
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false)
  const [showRestoredIndicator, setShowRestoredIndicator] = useState<boolean>(false)
  const [isHydrated, setIsHydrated] = useState<boolean>(false)
  
  // Response mode and depth controls
  const [responseMode, setResponseMode] = useState<'standard' | 'professional'>('standard')
  const [responseDepth, setResponseDepth] = useState<'quick' | 'standard' | 'professional'>('standard')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const voiceRecognitionRef = useRef<any>(null)

  // Voice recognition hook
  const voiceRecognition = useVoiceRecognition({
    language: 'en-US',
    continuous: false,
    interimResults: true
  })
  
  // Store refs to avoid dependency issues in useEffect
  voiceRecognitionRef.current = voiceRecognition

  // Load messages from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true)
    const loadedMessages = loadMessagesFromStorage()
    setMessages(loadedMessages)
    setHasUserInteracted(loadedMessages.length > 0)
    setShowRestoredIndicator(loadedMessages.length > 0)
  }, [userId])

  // Save messages to localStorage whenever messages change (but only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveMessagesToStorage(messages)
    }
  }, [messages, isHydrated])

  // Hide the restored indicator after 5 seconds
  useEffect(() => {
    if (showRestoredIndicator) {
      const timer = setTimeout(() => {
        setShowRestoredIndicator(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showRestoredIndicator])

  useEffect(() => {
    // Only scroll to bottom when there are messages and user has interacted
    // Add a small delay to ensure the message is fully rendered
    if (messages.length > 0 && hasUserInteracted && !loading) {
      scrollToBottom()
    }
  }, [messages.length, hasUserInteracted, loading])

  const scrollToBottom = () => {
    // Use a timeout to ensure the DOM has updated after new messages
    setTimeout(() => {
      if (messagesEndRef.current) {
        // Try the ScrollArea viewport first
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
        
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          })
        } else {
          // Fallback to scrollIntoView but with block: "nearest" to prevent page scroll
          messagesEndRef.current.scrollIntoView({ 
            behavior: "smooth", 
            block: "nearest",
            inline: "nearest"
          })
        }
      }
    }, 100)
  }

  // Voice input handler
  const handleVoiceInput = (transcript: string) => {
    if (transcript.trim() && !loading) {
      setQuestion(transcript)
      setHasUserInteracted(true) // Mark user interaction for voice input
      
      // Stop voice recognition immediately to prevent continuous listening
      voiceRecognition.stopListening()
      
      // Auto-submit if transcript ends with question mark or contains typical question words
      const isQuestion = transcript.includes('?') || 
        /^(what|how|when|where|why|who|can|could|would|should|is|are|do|does|did)/i.test(transcript.trim())
      
      if (isQuestion) {
        // Small delay to allow user to see the transcript
        setTimeout(() => {
          askQuestion()
        }, 1000)
      }
    }
  }

  // Stop voice recognition when loading starts
  useEffect(() => {
    if (loading) {
      voiceRecognitionRef.current?.stopListening()
    }
  }, [loading])

  // Stop voice recognition when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      voiceRecognitionRef.current?.stopListening()
    }
  }, [messages.length])

  // Enhanced markdown-like formatting for responses
  const formatResponse = (content: string) => {
    if (!content) return content

    return content
      // Headers with improved styling
      .replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold mt-3 mb-2 text-foreground border-l-4 border-blue-500 dark:border-blue-400 pl-3">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-3 text-foreground border-l-4 border-blue-600 dark:border-blue-500 pl-3">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-3 text-foreground border-l-4 border-blue-700 dark:border-blue-600 pl-3">$1</h2>')
      
      // Bold and italic formatting
      .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold text-foreground'>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em class='italic text-muted-foreground'>$1</em>")
      
      // Enhanced bullet points with better styling
      .replace(/^• (.+)$/gm, '<li class="ml-6 mb-1 text-foreground relative before:content-[\"•\"] before:text-blue-600 dark:before:text-blue-400 before:font-bold before:absolute before:-ml-4">$1</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-6 mb-1 text-foreground relative before:content-[\"-\"] before:text-blue-600 dark:before:text-blue-400 before:font-bold before:absolute before:-ml-4">$1</li>')
      
      // Numbered lists with enhanced styling
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 mb-2 text-foreground list-decimal marker:text-blue-600 dark:marker:text-blue-400 marker:font-semibold">$2</li>')
      
      // Enhanced page references with better visual design
      .replace(/\[Page (\w+)\]/g, '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 ml-1 shadow-sm hover:shadow-md transition-shadow"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg>Page $1</span>')
      
      // Code blocks with syntax highlighting appearance
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<div class="bg-muted rounded-lg p-4 my-3 border-l-4 border-muted-foreground/20"><pre class="text-sm font-mono text-foreground overflow-x-auto"><code>$2</code></pre></div>')
      
      // Inline code with better styling
      .replace(/`([^`]+)`/g, '<code class="bg-muted text-foreground px-2 py-1 rounded text-sm font-mono border border-border">$1</code>')
      
      // Enhanced paragraph breaks
      .replace(/\n\n/g, '</p><p class="mb-3 text-foreground leading-relaxed">')
      
      // Key takeaways or important notes with theme-aware colors
      .replace(/^Key Takeaways?:(.+)$/gm, '<div class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 my-4 rounded-r-lg"><h4 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">🔑 Key Takeaways</h4><div class="text-yellow-700 dark:text-yellow-300">$1</div></div>')
      .replace(/^Important:(.+)$/gm, '<div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 my-4 rounded-r-lg"><h4 class="font-semibold text-red-800 dark:text-red-200 mb-2">⚠️ Important</h4><div class="text-red-700 dark:text-red-300">$1</div></div>')
      .replace(/^Note:(.+)$/gm, '<div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 my-4 rounded-r-lg"><h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">📝 Note</h4><div class="text-blue-700 dark:text-blue-300">$1</div></div>')
  }

  // Download answer as formatted text file
  const handleDownload = (content: string | MessageContent, index: number) => {
    const textContent = typeof content === "string" ? content : content.content
    const element = document.createElement("a")
    const file = new Blob([textContent], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `pdf-chat-answer-${index + 1}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Copy to clipboard
  const handleCopy = async (content: string | MessageContent, index: number) => {
    const textContent = typeof content === "string" ? content : content.content
    try {
      await navigator.clipboard.writeText(textContent)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const askQuestion = async () => {
    if (!question.trim() || loading) {
      return
    }
    
    // Mark that user has interacted
    setHasUserInteracted(true)
    
    // Stop voice recognition before starting
    voiceRecognition.stopListening()
    
    setLoading(true)

    // Add user question to conversation
    const userMessage: IMessage = {
      role: "user",
      content: question,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Clear the question input immediately
    const currentQuestion = question
    setQuestion("")

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        message: currentQuestion,
        responseMode: responseMode,
        responseDepth: responseDepth
      });
      
      // Add document filter if a document is selected
      if (selectedDocument?.originalName) {
        queryParams.append('documentId', selectedDocument.originalName);
      }
      
      // Use the server's chat endpoint directly with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 200000) // 200 second timeout (3 minutes 20 seconds) - longer than server timeout

      const response = await fetch(`http://localhost:8000/chat?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.details || "Failed to get answer from server"
        
        // Show server errors as chat responses instead of throwing
        const errorResponse: IMessage = {
          role: "assistant",
          content: `❌ **Error:** ${errorMessage}

${data.suggestions ? `**Suggestions:**\n${data.suggestions.map((s: string) => `• ${s}`).join('\n')}` : ''}

Please try rephrasing your question or check if you have uploaded documents.`,
          timestamp: new Date(),
          contextSections: 0,
        }
        setMessages((prev) => [...prev, errorResponse])
        return
      }

      // Handle the response format from the server
      let answer = ""
      let context = []

      if (data.error) {
        // Handle error response format - show as chat message instead of throwing
        const errorMessage = data.error || data.details || "Server returned an error"
        const errorResponse: IMessage = {
          role: "assistant",
          content: `❌ **Error:** ${errorMessage}

${data.suggestions ? `**Suggestions:**\n${data.suggestions.map((s: string) => `• ${s}`).join('\n')}` : ''}

Please try rephrasing your question or make sure you have uploaded and processed documents.`,
          timestamp: new Date(),
          contextSections: 0,
        }
        setMessages((prev) => [...prev, errorResponse])
        return
      } else if (typeof data.message === "string") {
        // Handle success message format
        answer = data.message
        context = data.docs || []
      } else if (data.message) {
        // Handle case where message exists but isn't a string
        answer = String(data.message)
        context = data.docs || []
      } else {
        // Log the actual response format for debugging
        console.error("Unexpected server response format:", data)
        const debugResponse: IMessage = {
          role: "assistant",
          content: `❌ **Unexpected Response Format**

The server returned an unexpected response format. Please try again or contact support.

**Debug Info:** Expected 'message' field but received: ${JSON.stringify(Object.keys(data))}`,
          timestamp: new Date(),
          contextSections: 0,
        }
        setMessages((prev) => [...prev, debugResponse])
        return
      }

      // Add AI response to conversation
      const aiMessage: IMessage = {
        role: "assistant",
        content: answer,
        documents: context,
        pageReferences: data.pageReferences || [],
        timestamp: new Date(),
        contextSections: context?.length || 0,
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error: unknown) {
      console.error("Error asking question:", error)
      
      // Handle network and other errors as chat responses
      let errorContent = "❌ **Connection Error**\n\n"
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorContent = "⏰ **Query Timeout**\n\nYour question is taking longer than expected to process (over 3 minutes)."
          errorContent += "\n\n**💡 This might happen when:**\n• Analyzing very large or complex documents\n• Processing intricate queries requiring deep analysis\n• Server is under heavy load"
          errorContent += "\n\n**🔄 Try these solutions:**\n• Break your question into smaller, more specific parts\n• Ask about a particular section or concept\n• Use simpler language and shorter queries\n• Wait a moment and try again\n• Check if your documents are fully processed"
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          errorContent += "Unable to connect to the server. Please check if the server is running and try again."
          errorContent += "\n\n**🔄 Solutions:**\n• Check your internet connection\n• Ensure the AI server is running\n• Refresh the page and try again"
        } else {
          errorContent += `${error.message}`
          errorContent += "\n\n**🔄 Try:**\n• Refreshing the page\n• Asking a simpler question\n• Checking if documents are uploaded properly"
        }
      } else {
        errorContent += "An unknown error occurred while processing your request."
        errorContent += "\n\n**🔄 Please try:**\n• Refreshing the page\n• Asking your question again\n• Simplifying your query"
      }
      
      if (!error || (error instanceof Error && error.name !== 'AbortError')) {
        errorContent += "\n\n**Troubleshooting:**\n• Make sure the server is running on localhost:8000\n• Check your internet connection\n• Try refreshing the page"
      }
      
      const errorMessage: IMessage = {
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
        contextSections: 0,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      // Reset voice recognition state after completion
      voiceRecognition.resetTranscript()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      askQuestion()
    }
  }

  const clearChat = () => {
    setShowClearConfirm(true)
  }

  const confirmClearChat = () => {
    setMessages([])
    setHasUserInteracted(false) // Reset interaction flag when clearing chat
    // Clear from localStorage as well
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`qa-messages-${userId}`)
    }
    setShowClearConfirm(false)
  }

  const cancelClearChat = () => {
    setShowClearConfirm(false)
  }

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto">
      {/* Chat Interface */}
      <Card className="flex-1 flex flex-col shadow-lg border-border/50 min-h-0 h-full bg-card/50 backdrop-blur-sm">
        {/* Chat Header */}
        <CardHeader className="pb-4 border-b flex-shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              AI Document Assistant
            </CardTitle>
            {messages.length > 0 && (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {messages.filter((m) => m.role === "user").length} questions asked
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearChat} 
                  className="text-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  Clear Conversation
                </Button>
              </div>
            )}
          </div>
          <CardDescription className="mt-3 text-base">
            {selectedDocument ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                Chatting with: <strong>{selectedDocument.originalName}</strong>
                <Badge variant="outline" className="text-xs">
                  {selectedDocument.subject}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                No specific document selected - searching all documents
              </div>
            )}
            {showRestoredIndicator && (
              <span className="block text-sm text-emerald-600 mt-1 animate-fade-in">
                💾 Conversation restored from previous session
              </span>
            )}
          </CardDescription>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 p-6 overflow-hidden min-h-0">
          <div className="h-full flex flex-col min-h-0">
            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 min-h-0 mb-4">
              <div className="space-y-6 pb-8">
                {!isHydrated ? (
                  <div className="text-center py-16">
                    <div className="p-4 bg-primary/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    </div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Loading your conversations...</h3>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="p-4 bg-primary/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <MessageSquare className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Ready to chat with your documents</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
                      Start by asking a question about your uploaded documents. I&apos;ll provide detailed, well-structured
                      answers based on the content.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-6`}>
                      <Card
                        className={`max-w-[85%] min-w-[200px] shadow-lg border ${
                          msg.role === "user" 
                            ? "bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-700" 
                            : "bg-card dark:bg-card border-border dark:border-border"
                        }`}
                      >
                        <CardContent className="p-4">
                          {/* Action Buttons for Assistant Messages - Top Right */}
                          {msg.role === "assistant" && (
                            <div className="flex items-center justify-end space-x-1 mb-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(msg.content || "", idx)}
                                className="text-xs h-7 px-2"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Copy</span>
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(msg.content || "", idx)}
                                className="text-xs h-7 px-2"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Download</span>
                              </Button>

                              {msg.contextSections && (
                                <Badge variant="outline" className="text-xs h-7">
                                  {msg.contextSections} sources
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-start space-x-3">
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                msg.role === "user" 
                                  ? "bg-white/20 text-white" 
                                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {msg.role === "user" ? (
                                <User className="h-4 w-4 text-white" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 overflow-hidden">
                              {msg.role === "assistant" ? (
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                  <div
                                    className="prose prose-sm max-w-none text-foreground break-words"
                                    dangerouslySetInnerHTML={{
                                      __html: `<p class="mb-3 leading-relaxed text-foreground">${formatResponse(
                                        typeof msg.content === "string" ? msg.content : msg.content?.content || "",
                                      )}</p>`,
                                    }}
                                  />

                                  {/* Page References */}
                                  {msg.pageReferences && msg.pageReferences.length > 0 && (
                                    <div className="mt-4 p-3 bg-muted dark:bg-muted rounded-lg border border-border dark:border-border">
                                      <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-2">📄 Sources:</h4>
                                      <div className="space-y-2">
                                        {msg.pageReferences.map((ref, idx) => (
                                          <div key={idx} className="flex items-start space-x-2 text-sm">
                                            <Badge variant="outline" className="text-xs">
                                              Page {ref.pageNumber}
                                            </Badge>
                                            <span className="text-muted-foreground dark:text-muted-foreground flex-1">
                                              {ref.source} - {ref.preview}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={`break-words whitespace-pre-wrap leading-relaxed ${
                                  msg.role === "user" ? "text-white" : "text-foreground dark:text-foreground"
                                }`}>
                                  {typeof msg.content === "string" ? msg.content : msg.content?.content}
                                </div>
                              )}

                              <div
                                className={`text-xs mt-3 ${
                                  msg.role === "user" 
                                    ? "text-white/70" 
                                    : "text-muted-foreground dark:text-muted-foreground"
                                }`}
                              >
                                {(() => {
                                  try {
                                    const date = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
                                    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleTimeString()
                                  } catch (error) {
                                    return 'Invalid date'
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex justify-start">
                    <Card className="bg-card border-border shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex items-center space-x-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <div className="space-y-1">
                              <span className="text-foreground text-base">AI is analyzing your question...</span>
                              <div className="text-sm text-muted-foreground">
                                🔍 Searching documents • 🧠 Processing context • ✨ Generating response
                              </div>
                              <div className="text-xs text-muted-foreground opacity-70">
                                Complex queries may take up to 3 minutes
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border pt-6 pb-6 space-y-4 flex-shrink-0">
              {/* Response Mode Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground dark:text-foreground">Response Mode</label>
                    <div className="flex gap-2">
                      <Button
                        variant={responseMode === 'standard' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setResponseMode('standard')}
                        className="h-8 text-xs"
                      >
                        📝 Standard
                      </Button>
                      <Button
                        variant={responseMode === 'professional' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setResponseMode('professional')}
                        className="h-8 text-xs"
                      >
                        🏢 Professional
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground dark:text-foreground">Response Depth</label>
                    <div className="flex gap-2">
                      <Button
                        variant={responseDepth === 'quick' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setResponseDepth('quick')}
                        className="h-8 text-xs"
                        disabled={responseMode === 'professional'}
                      >
                        ⚡ Quick
                      </Button>
                      <Button
                        variant={responseDepth === 'standard' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setResponseDepth('standard')}
                        className="h-8 text-xs"
                      >
                        📊 Standard
                      </Button>
                      <Button
                        variant={responseDepth === 'professional' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setResponseDepth('professional')}
                        className="h-8 text-xs"
                        disabled={responseMode !== 'professional'}
                      >
                        🔍 Deep
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Mode Description - Redesigned without box */}
                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  {responseMode === 'standard' ? (
                    <>
                      <div className="flex items-center space-x-1 bg-blue-100/50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                        <span className="text-blue-600 dark:text-blue-400">📝</span>
                        <span className="font-medium text-blue-700 dark:text-blue-300">Standard Mode</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-foreground">Direct answers with clear references</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1 bg-purple-100/50 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                        <span className="text-purple-600 dark:text-purple-400">🏢</span>
                        <span className="font-medium text-purple-700 dark:text-purple-300">Professional Mode</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-foreground">Enhanced analysis with industry insights</span>
                    </>
                  )}
                </div>
              </div>

              {/* Voice Controls */}
              <VoiceControls
                voiceRecognition={voiceRecognition}
                onTranscriptReady={handleVoiceInput}
                isDisabled={loading}
                showTranscript={false}
                className="flex justify-center"
              />
              
              <div className="flex space-x-4">
                <input
                  ref={inputRef}
                  className="flex-1 h-10 text-sm bg-background dark:bg-background text-foreground dark:text-foreground border-2 border-border dark:border-border focus:border-blue-500 dark:focus:border-blue-400 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  type="text"
                  placeholder={isHydrated ? "Ask a question about your documents... 🎤 or use voice" : "Loading..."}
                  value={question}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading || !isHydrated}
                />
                <Button onClick={askQuestion} disabled={loading || !question.trim() || !isHydrated} className="px-6 h-10 text-sm flex-shrink-0">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground">
                <span>Press Enter to send • Use 🎤 for voice input</span>
                <span>Powered by AI • Answers from your documents</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Conversation Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Clear Conversation</CardTitle>
              <CardDescription>
                Are you sure you want to clear all messages? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 justify-end">
              <Button variant="outline" onClick={cancelClearChat}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmClearChat}>
                Clear All Messages
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default QAInterface
