/**
 * NexusDocs - Type Definitions
 */

export interface DocumentInfo {
  doc_id: string;
  filename: string;
  folder: string;
  file_type: string;
  total_chunks: number;
}

export interface FolderInfo {
  name: string;
  document_count: number;
}

export interface Citation {
  filename: string;
  folder: string;
  chunk_index: number;
  content_preview: string;
  relevance_score: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  query: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  document?: DocumentInfo;
}

export interface StatsResponse {
  total_documents: number;
  total_chunks: number;
  total_folders: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}
