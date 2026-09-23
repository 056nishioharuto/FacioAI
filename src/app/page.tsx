'use client';

import ThemeInput from '@/components/Input/ThemeInput';
import UtteranceInput from '@/components/Input/UtteranceInput';
import MindMapCanvas from '@/components/MindMap/MindMapCanvas';
import MeetingInfo from '@/components/Sidebar/MeetingInfo';
import NodeDetail from '@/components/Sidebar/NodeDetail';
import DebugPanel from '@/components/Sidebar/DebugPanel';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA] overflow-hidden">
      {/* ヘッダー */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <div className="text-lg font-bold text-slate-900 tracking-tight">
          FaciliAI
        </div>
        <div className="text-xs text-slate-400 border-l border-slate-200 pl-3">
          会議ファシリテーション・マインドマップ
        </div>
      </header>

      {/* 会議テーマ */}
      <ThemeInput />

      {/* メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* マインドマップ */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <MindMapCanvas />
          <UtteranceInput />
        </main>

        {/* サイドバー */}
        <aside className="w-64 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
          <MeetingInfo />
          <div className="flex-1 overflow-y-auto">
            <NodeDetail />
          </div>
          <DebugPanel />
        </aside>
      </div>
    </div>
  );
}
