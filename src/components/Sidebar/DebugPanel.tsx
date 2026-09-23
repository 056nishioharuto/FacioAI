'use client';

import { useState } from 'react';
import { useMapStore } from '@/map/mapStore';
import { DebugEntry } from '@/ai/schema/types';

function DebugEntryItem({ entry }: { entry: DebugEntry }) {
  const [open, setOpen] = useState(false);

  const phaseColor = {
    T1: 'bg-blue-100 text-blue-700',
    T2: 'bg-purple-100 text-purple-700',
    Consolidation: 'bg-emerald-100 text-emerald-700',
  }[entry.phase];

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 p-2 text-left hover:bg-slate-50 transition-colors"
      >
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${phaseColor} flex-shrink-0`}>
          {entry.phase}
        </span>
        <div className="flex-1 min-w-0">
          {entry.utterance && (
            <div className="text-xs text-slate-600 truncate">
              「{entry.utterance}」
            </div>
          )}
          <div className="text-xs text-slate-400">
            {new Date(entry.timestamp).toLocaleTimeString('ja-JP')}
          </div>
          {entry.error && (
            <div className="text-xs text-red-500 mt-0.5">⚠ {entry.error}</div>
          )}
        </div>
        <span className="text-slate-300 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-2 bg-slate-50 space-y-2">
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-1">レスポンス</div>
            <pre className="text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(entry.response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DebugPanel() {
  const { debugLog } = useMapStore();
  const [visible, setVisible] = useState(false);

  return (
    <div className="border-t border-slate-200">
      <button
        onClick={() => setVisible(!visible)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span>🔍 デバッグログ ({debugLog.length}件)</span>
        <span>{visible ? '▲' : '▼'}</span>
      </button>

      {visible && (
        <div className="max-h-64 overflow-y-auto px-3 pb-3 space-y-2">
          {debugLog.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-4">ログなし</div>
          ) : (
            debugLog.map((entry) => (
              <DebugEntryItem key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
