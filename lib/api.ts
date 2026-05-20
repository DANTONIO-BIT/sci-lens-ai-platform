/**
 * SciLens API client — communicates with the FastAPI backend.
 * All requests include the Supabase JWT for authentication.
 */
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const { data } = await supabase().auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Papers
// ---------------------------------------------------------------------------

export interface UploadResponse {
  paper_id: string
  status: string
  title: string
  authors: string[]
}

export interface PaperStatusResponse {
  paper_id: string
  status: 'processing' | 'analyzed' | 'failed'
  title?: string
}

export interface PaperDetail {
  paper: {
    id: string
    title: string
    authors: string[]
    abstract: string
    journal?: string
    year?: number
    doi?: string
    file_url: string
    file_name: string
    status: string
    created_at: string
  }
  analysis: {
    trl_level: number
    trl_confidence: number
    trl_description: string
    startup_score: number
    market_opportunity: string // JSON string
    tam_estimate: string
    regulatory_complexity: 'low' | 'medium' | 'high'
    technical_barriers: string
    synthesis: string
    extracted_methods: string[]
    extracted_claims: string[]
    raw_json: Record<string, unknown>
  } | null
}

export const uploadPaper = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_URL}/papers/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed ${res.status}: ${text}`)
  }

  return res.json()
}

export const getPaperStatus = (paperId: string) =>
  apiFetch<PaperStatusResponse>(`/papers/${paperId}/status`)

export const getPaper = (paperId: string) =>
  apiFetch<PaperDetail>(`/papers/${paperId}`)

export const listPapers = () =>
  apiFetch<{ papers: PaperDetail['paper'][] }>('/papers/')

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export interface GraphData {
  nodes: Array<{
    id: string
    label: string
    cluster: string
    clusterColor: string
    relevance: number
    connections: string[]
  }>
  links: Array<{
    source: string
    target: string
    strength: number
    type: 'semantic' | 'citation' | 'author'
  }>
}

export const getGraph = () => apiFetch<GraphData>('/graph/')

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
export const healthCheck = () =>
  apiFetch<{ status: string }>('/health')
