'use client';

import { FileText, Trash2, FileType, Hash } from 'lucide-react';
import type { DocumentInfo } from '@/lib/types';
import clsx from 'clsx';

interface DocumentListProps {
  documents: DocumentInfo[];
  onDelete: (docId: string) => void;
  isDeleting?: string;
}

const fileTypeIcons: Record<string, string> = {
  '.pdf': '📄',
  '.docx': '📝',
  '.txt': '📃',
  '.md': '📑',
};

const fileTypeColors: Record<string, string> = {
  '.pdf': 'bg-red-500/20 text-red-400',
  '.docx': 'bg-blue-500/20 text-blue-400',
  '.txt': 'bg-zinc-500/20 text-zinc-400',
  '.md': 'bg-purple-500/20 text-purple-400',
};

export function DocumentList({ documents, onDelete, isDeleting }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-500">No documents yet</p>
        <p className="text-sm text-zinc-600 mt-1">
          Upload files to start building your knowledge base
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.doc_id}
          className={clsx(
            'group flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
            'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700',
            isDeleting === doc.doc_id && 'opacity-50'
          )}
        >
          {/* File Type Badge */}
          <div className={clsx(
            'flex items-center justify-center w-10 h-10 rounded-lg text-lg',
            fileTypeColors[doc.file_type] || 'bg-zinc-700 text-zinc-400'
          )}>
            {fileTypeIcons[doc.file_type] || '📄'}
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-200 truncate">
              {doc.filename}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <FileType className="w-3 h-3" />
                {doc.file_type.replace('.', '').toUpperCase()}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {doc.total_chunks} chunks
              </span>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(doc.doc_id)}
            disabled={isDeleting === doc.doc_id}
            className={clsx(
              'p-2 rounded-lg transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              'text-zinc-500 hover:text-red-400 hover:bg-red-500/10',
              isDeleting === doc.doc_id && 'cursor-not-allowed'
            )}
            title="Delete document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
