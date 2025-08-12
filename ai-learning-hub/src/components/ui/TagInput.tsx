import React, { useState } from "react"
import { X } from "lucide-react"

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
}

const colors = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-yellow-100 text-yellow-700",
  "bg-indigo-100 text-indigo-700",
]

const TagInput: React.FC<TagInputProps> = ({ value, onChange, placeholder = "Add a tag...", maxTags = 8 }) => {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setError("")
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      addTag(input.trim())
    }
  }

  const addTag = (tag: string) => {
    if (!tag) return
    if (value.includes(tag)) {
      setError("Tag already added")
      return
    }
    if (value.length >= maxTags) {
      setError(`Max ${maxTags} tags allowed`)
      return
    }
    onChange([...value, tag])
    setInput("")
    setError("")
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, i) => (
          <span
            key={tag}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-sm ${colors[i % colors.length]} animate-fade-in`}
          >
            {tag}
            <button
              type="button"
              className="ml-2 hover:text-red-500 focus:outline-none"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              <X className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        placeholder={placeholder}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        disabled={value.length >= maxTags}
        aria-label="Add tag"
      />
      {error && <div className="text-red-500 text-xs mt-1 animate-shake">{error}</div>}
    </div>
  )
}

export default TagInput 