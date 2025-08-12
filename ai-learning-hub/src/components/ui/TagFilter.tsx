import React from "react"
import { Check, X } from "lucide-react"

interface TagFilterProps {
  allTags: string[]
  selected: string[]
  onChange: (tags: string[]) => void
}

const colors = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-yellow-100 text-yellow-700",
  "bg-indigo-100 text-indigo-700",
]

const TagFilter: React.FC<TagFilterProps> = ({ allTags, selected, onChange }) => {
  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag))
    } else {
      onChange([...selected, tag])
    }
  }

  const clearAll = () => onChange([])

  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      {allTags.length === 0 && <span className="text-muted-foreground">No tags available</span>}
      {allTags.map((tag, i) => {
        const isSelected = selected.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-sm border transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${colors[i % colors.length]} ${isSelected ? "ring-2 ring-blue-400 border-blue-400" : "border-transparent hover:bg-opacity-80"}`}
            onClick={() => toggleTag(tag)}
            aria-pressed={isSelected}
          >
            {tag}
            {isSelected && <Check className="w-4 h-4 ml-2 text-blue-600" />}
          </button>
        )
      })}
      {selected.length > 0 && (
        <button
          type="button"
          className="ml-2 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-100 transition"
          onClick={clearAll}
        >
          <X className="w-4 h-4 inline mr-1" /> Clear
        </button>
      )}
    </div>
  )
}

export default TagFilter 