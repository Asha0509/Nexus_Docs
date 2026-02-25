'use client';

import { FileText, Layers, FolderTree } from 'lucide-react';
import type { StatsResponse } from '@/lib/types';

interface StatsDisplayProps {
  stats: StatsResponse;
}

export function StatsDisplay({ stats }: StatsDisplayProps) {
  const items = [
    {
      label: 'Documents',
      value: stats.total_documents,
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Chunks',
      value: stats.total_chunks,
      icon: Layers,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Folders',
      value: stats.total_folders,
      icon: FolderTree,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-800"
        >
          <div className={`p-2.5 rounded-lg ${item.bgColor}`}>
            <item.icon className={`w-5 h-5 ${item.color}`} />
          </div>
          <div>
            <p className="text-2xl font-semibold text-zinc-100">{item.value}</p>
            <p className="text-xs text-zinc-500">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
