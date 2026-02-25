'use client';

import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Library,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { FolderInfo } from '@/lib/types';
import clsx from 'clsx';

interface FolderSidebarProps {
  folders: FolderInfo[];
  selectedFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (name: string) => Promise<void>;
}

export function FolderSidebar({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<string | null>(null);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDeleteFolder = async (name: string) => {
    if (!confirm(`Delete folder "${name}" and all its documents?`)) return;

    setDeletingFolder(name);
    try {
      await onDeleteFolder(name);
      if (selectedFolder === name) {
        onSelectFolder(null);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    } finally {
      setDeletingFolder(null);
    }
  };

  const totalDocs = folders.reduce((sum, f) => sum + f.document_count, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Folders
        </h2>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* All Documents */}
        <button
          onClick={() => onSelectFolder(null)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            selectedFolder === null
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          <Library className="w-4 h-4" />
          <span className="flex-1 text-left text-sm font-medium">All Documents</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800">
            {totalDocs}
          </span>
        </button>

        {/* Divider */}
        <div className="h-px bg-zinc-800 my-2" />

        {/* Folders */}
        <div className="space-y-1">
          {folders.map((folder) => (
            <div
              key={folder.name}
              className={clsx(
                'group flex items-center gap-2 rounded-lg transition-all duration-200',
                selectedFolder === folder.name
                  ? 'bg-blue-500/20'
                  : 'hover:bg-zinc-800'
              )}
            >
              <button
                onClick={() => onSelectFolder(folder.name)}
                className={clsx(
                  'flex-1 flex items-center gap-3 px-3 py-2.5',
                  selectedFolder === folder.name
                    ? 'text-blue-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {selectedFolder === folder.name ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
                <span className="flex-1 text-left text-sm font-medium truncate">
                  {folder.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800">
                  {folder.document_count}
                </span>
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.name)}
                disabled={deletingFolder === folder.name}
                className={clsx(
                  'p-2 mr-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                  'text-zinc-500 hover:text-red-400 hover:bg-red-500/10',
                  deletingFolder === folder.name && 'opacity-100'
                )}
              >
                {deletingFolder === folder.name ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
        </div>

        {folders.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">
            No folders yet
          </p>
        )}
      </div>

      {/* Create Folder */}
      <div className="p-3 border-t border-zinc-800">
        {isCreating ? (
          <form onSubmit={handleCreateFolder} className="space-y-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewFolderName('');
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Folder
          </button>
        )}
      </div>
    </div>
  );
}
