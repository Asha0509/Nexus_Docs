'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileUpload,
  DocumentList,
  ChatInterface,
  FolderSidebar,
  StatsDisplay,
} from '@/components';
import { api } from '@/lib/api';
import type { DocumentInfo, FolderInfo, StatsResponse } from '@/lib/types';
import { Brain, RefreshCw, MessageSquare, FileText } from 'lucide-react';
import clsx from 'clsx';

type View = 'documents' | 'chat';

export default function Home() {
  // State
  const [view, setView] = useState<View>('documents');
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [stats, setStats] = useState<StatsResponse>({
    total_documents: 0,
    total_chunks: 0,
    total_folders: 0,
  });
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docsData, foldersData, statsData] = await Promise.all([
        api.getDocuments(selectedFolder || undefined),
        api.getFolders(),
        api.getStats(),
      ]);
      setDocuments(docsData);
      setFolders(foldersData);
      setStats(statsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to connect to backend. Make sure the server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleUploadComplete = (doc: DocumentInfo) => {
    setDocuments((prev) => [...prev, doc]);
    setStats((prev) => ({
      ...prev,
      total_documents: prev.total_documents + 1,
      total_chunks: prev.total_chunks + doc.total_chunks,
    }));
    // Refresh folders in case a new one was created
    api.getFolders().then(setFolders).catch(console.error);
  };

  const handleDeleteDocument = async (docId: string) => {
    setDeletingDoc(docId);
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
      // Refresh stats
      const newStats = await api.getStats();
      setStats(newStats);
      // Refresh folders
      const newFolders = await api.getFolders();
      setFolders(newFolders);
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeletingDoc(undefined);
    }
  };

  const handleCreateFolder = async (name: string) => {
    await api.createFolder(name);
    const newFolders = await api.getFolders();
    setFolders(newFolders);
  };

  const handleDeleteFolder = async (name: string) => {
    await api.deleteFolder(name);
    const [newFolders, newDocs, newStats] = await Promise.all([
      api.getFolders(),
      api.getDocuments(selectedFolder || undefined),
      api.getStats(),
    ]);
    setFolders(newFolders);
    setDocuments(newDocs);
    setStats(newStats);
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-zinc-100">NexusDocs</h1>
              <p className="text-xs text-zinc-500">Your Second Brain</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 border-b border-zinc-800">
          <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
            <button
              onClick={() => setView('documents')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                view === 'documents'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <FileText className="w-4 h-4" />
              Library
            </button>
            <button
              onClick={() => setView('chat')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                view === 'chat'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
          </div>
        </div>

        {/* Folder Sidebar */}
        <FolderSidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {view === 'documents' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  Document Library
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedFolder
                    ? `Viewing: ${selectedFolder}`
                    : 'Viewing all documents'}
                </p>
              </div>
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
              >
                <RefreshCw
                  className={clsx('w-4 h-4', isLoading && 'animate-spin')}
                />
                Refresh
              </button>
            </div>

            {/* Stats */}
            <StatsDisplay stats={stats} />

            {/* Upload Section */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-200 mb-4">
                Upload Documents
              </h3>
              <FileUpload
                folder={selectedFolder || 'default'}
                onUploadComplete={handleUploadComplete}
              />
            </div>

            {/* Documents List */}
            <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-200 mb-4">
                {selectedFolder ? `Documents in ${selectedFolder}` : 'All Documents'}
                <span className="text-zinc-500 font-normal ml-2">
                  ({documents.length})
                </span>
              </h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
                </div>
              ) : (
                <DocumentList
                  documents={documents}
                  onDelete={handleDeleteDocument}
                  isDeleting={deletingDoc}
                />
              )}
            </div>
          </div>
        ) : (
          <ChatInterface selectedFolder={selectedFolder} />
        )}
      </main>
    </div>
  );
}
