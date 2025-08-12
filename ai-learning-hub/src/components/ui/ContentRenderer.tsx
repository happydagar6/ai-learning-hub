import React from "react"
import { marked } from "marked"
import "katex/dist/katex.min.css"
// @ts-ignore: If you want full type safety, install @types/katex
import katex from "katex"

interface ContentRendererProps {
  content: string
  className?: string
}

const ContentRenderer: React.FC<ContentRendererProps> = ({ content, className = "" }) => {
  function renderMarkdown(md: string) {
    // marked.parse may be async in some versions, so handle both cases
    let html: string
    // @ts-ignore
    if (typeof marked.parseSync === "function") {
      // @ts-ignore
      html = marked.parseSync(md)
    } else {
      const parsed = marked.parse(md)
      if (typeof parsed === "string") {
        html = parsed
      } else {
        html = "<span class='text-red-500'>Preview not available (async markdown parser). Please update marked or use parseSync.</span>"
      }
    }
    // Replace $...$ with KaTeX-rendered math
    html = html.replace(/\$(.+?)\$/g, (match: string, math: string) => {
      try {
        return katex.renderToString(math, { throwOnError: false })
      } catch {
        return `<span class='text-red-500'>Invalid LaTeX</span>`
      }
    })
    // Render images as responsive
    html = html.replace(/<img /g, '<img class="max-w-full h-auto rounded shadow" ')
    return html
  }

  return (
    <div className={`prose prose-sm sm:prose-base lg:prose-lg max-w-none antialiased-text prose-slate dark:prose-invert flashcard-content ${className}`}>
      <div 
        className="leading-relaxed text-foreground"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} 
      />
    </div>
  )
}

export default ContentRenderer