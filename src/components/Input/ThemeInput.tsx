'use client';

import { useState } from 'react';
import { useMapStore } from '@/map/mapStore';

export default function ThemeInput() {
  const [theme, setTheme] = useState('');
  const { session, initSession, resetSession } = useMapStore();

  const handleStart = () => {
    const trimmed = theme.trim();
    if (!trimmed) return;
    initSession(trimmed);
  };

  if (session) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200">
        <div className="text-slate-400 text-xs">会議テーマ</div>
        <div className="flex-1 text-sm font-semibold text-slate-800"
          style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}>
          {session.theme}
        </div>
        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          session.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
          session.status === 'consolidating' ? 'bg-purple-100 text-purple-700' :
          session.status === 'done' ? 'bg-slate-100 text-slate-600' :
          'bg-slate-100 text-slate-500'
        }`}>
          {session.status === 'active' ? '● 進行中' :
           session.status === 'consolidating' ? '⟳ 整理中' :
           session.status === 'done' ? '✓ 完了' : '待機'}
        </div>
        <button
          onClick={resetSession}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded"
        >
          リセット
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
      <input
        type="text"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        placeholder="会議テーマを入力してください（例：新製品の方向性を決める）"
        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2
          text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400
          focus:ring-1 focus:ring-blue-200 transition-colors"
        style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}
      />
      <button
        onClick={handleStart}
        disabled={!theme.trim()}
        className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg
          hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
      >
        開始
      </button>
    </div>
  );
}
