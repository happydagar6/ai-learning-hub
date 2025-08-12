export interface StudyDocument {
  id: string
  filename: string
  originalName: string
  topic: string
  subject: string
  uploadDate: number
  fileType: string
  fileSize?: number
  processed?: boolean
  storagePath?: string
}

export interface DocumentSelectorProps {
  selectedDocument: StudyDocument | null
  onDocumentSelect: (document: StudyDocument | null) => void
  className?: string
}
