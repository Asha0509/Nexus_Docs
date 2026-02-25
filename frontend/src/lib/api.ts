/**
 * NexusDocs - API Client
 * Handles all communication with the FastAPI backend
 */

import type {
  DocumentInfo,
  FolderInfo,
  ChatResponse,
  UploadResponse,
  StatsResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================================================
  // Stats
  // ============================================================================

  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/stats');
  }

  // ============================================================================
  // Document Management
  // ============================================================================

  async uploadDocument(file: File, folder: string = 'default'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.request<UploadResponse>('/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getDocuments(folder?: string): Promise<DocumentInfo[]> {
    const params = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    return this.request<DocumentInfo[]>(`/documents${params}`);
  }

  async deleteDocument(docId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Folder Management
  // ============================================================================

  async getFolders(): Promise<FolderInfo[]> {
    return this.request<FolderInfo[]>('/folders');
  }

  async createFolder(name: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/folders/${encodeURIComponent(name)}`, {
      method: 'POST',
    });
  }

  async deleteFolder(name: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/folders/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Chat
  // ============================================================================

  async chat(query: string, folder?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        folder: folder || null,
      }),
    });
  }
}

// Export singleton instance
export const api = new ApiClient();
export default api;
