/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, Eye, Trash2, Clock, Check, FileJson } from 'lucide-react';
import { HistoryItem } from '../types';

interface SidebarHistoryProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClearAll: () => void;
  onDeleteItem: (id: string) => void;
}

export default function SidebarHistory({
  history,
  onSelect,
  onClearAll,
  onDeleteItem,
}: SidebarHistoryProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getRelativeTime = (timestamp: number) => {
    const elapsed = Date.now() - timestamp;
    if (elapsed < 60000) return 'Just now';
    const mins = Math.floor(elapsed / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Formatting Log</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
            {history.length}
          </span>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs font-medium text-slate-400 hover:text-red-500 transition cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 mt-2 space-y-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
            <Clock className="w-8 h-8 opacity-40 mb-2 stroke-1" />
            <span className="text-xs">No saved formats yet. Code formatted in the workspace appears here.</span>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="group flex flex-col gap-1 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition relative"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-medium text-xs text-slate-700 dark:text-slate-355 truncate pr-8">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 shrink-0 font-mono">
                  {formatSize(item.size)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {getRelativeTime(item.timestamp)}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 rounded transition absolute right-2 bottom-2"
                  title="Remove log item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
