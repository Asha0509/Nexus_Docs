'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { DocumentInfo } from '@/lib/types';
import clsx from 'clsx';

interface FileUploadProps {
  folder: string;
  onUploadComplete: (doc: DocumentInfo) => void;
}

interface UploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  document?: DocumentInfo;
}

export function FileUpload({ folder, onUploadComplete }: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const processFile = async (file: File) => {
    setUploads(prev => 
      prev.map(u => 
        u.file === file ? { ...u, status: 'uploading' } : u
      )
    );

    try {
      const response = await api.uploadDocument(file, folder);
      
      setUploads(prev =>
        prev.map(u =>
          u.file === file
            ? { ...u, status: 'success', message: response.message, document: response.document }
            : u
        )
      );

      if (response.document) {
        onUploadComplete(response.document);
      }
    } catch (error) {
      setUploads(prev =>
        prev.map(u =>
          u.file === file
            ? { ...u, status: 'error', message: error instanceof Error ? error.message : 'Upload failed' }
            : u
        )
      );
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: UploadStatus[] = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const,
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsUploading(true);

    // Process files sequentially to avoid overwhelming the server
    for (const file of acceptedFiles) {
      await processFile(file);
    }

    setIsUploading(false);
  }, [folder, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    disabled: isUploading,
  });

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status === 'uploading' || u.status === 'pending'));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx(
            'p-4 rounded-full',
            isDragActive ? 'bg-blue-500/20' : 'bg-zinc-800'
          )}>
            <Upload className={clsx(
              'w-8 h-8',
              isDragActive ? 'text-blue-400' : 'text-zinc-400'
            )} />
          </div>
          <div>
            <p className="text-lg font-medium text-zinc-200">
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              or click to browse • PDF, DOCX, TXT, MD supported
            </p>
          </div>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Upload Progress</span>
            {uploads.some(u => u.status === 'success' || u.status === 'error') && (
              <button
                onClick={clearCompleted}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploads.map((upload, idx) => (
              <div
                key={`${upload.file.name}-${idx}`}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
              >
                <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 truncate">
                    {upload.file.name}
                  </p>
                  {upload.message && (
                    <p className={clsx(
                      'text-xs truncate',
                      upload.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                    )}>
                      {upload.message}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {upload.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full bg-zinc-600" />
                  )}
                  {upload.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  {upload.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {upload.status === 'error' && (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
