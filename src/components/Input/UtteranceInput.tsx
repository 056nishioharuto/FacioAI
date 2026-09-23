'use client';

// ============================================================
// 発言入力コンポーネント
// - テキスト入力 → T1 API呼び出し → mapStore更新
// - T2トリガー判定
// - Consolidation実行
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { useMapStore } from '@/map/mapStore';
import { T2ResponseValidated } from '@/ai/schema/zodSchemas';

export default function UtteranceInput() {
  const [text, setText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    session,
    isT1Loading,
    isT2Loading,
    isConsolidating,
    addUtterance,
    markUtteranceProcessed,
    applyT1,
    applyT2,
    applyConsolidation,
    setStatus,
    setT1Loading,
    setT2Loading,
    setConsolidating,
    addDebugEntry,
    shouldRunT2,
  } = useMapStore();

  const runT2 = useCallback(async () => {
    if (!session || isT2Loading) return;
    setT2Loading(true);
    try {
      const res = await fetch('/api/reorganize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: session.theme,
          allNodes: Object.values(session.nodes),
          recentUtterances: session.utterances.slice(-20),
        }),
      });
      const data: T2ResponseValidated & { rawResponse?: string; error?: string } =
        await res.json();

      addDebugEntry({
        phase: 'T2',
        request: { nodeCount: Object.keys(session.nodes).length },
        response: data,
      });

      if (data.operations) {
        applyT2(data);
      }
    } catch (err) {
      console.error('T2 failed:', err);
    } finally {
      setT2Loading(false);
    }
  }, [session, isT2Loading, setT2Loading, applyT2, addDebugEntry]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !session || isT1Loading) return;

    setText('');
    inputRef.current?.focus();

    // 発言をストアに追加
    const utteranceId = addUtterance(trimmed);

    setT1Loading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: session.theme,
          currentUtterance: trimmed,
          recentUtterances: session.utterances.slice(-8),
          allNodes: Object.values(session.nodes),
        }),
      });

      const data = await res.json();

      addDebugEntry({
        phase: 'T1',
        utterance: trimmed,
        request: { utterance: trimmed, nodeCount: Object.keys(session.nodes).length },
        response: data,
        error: data.error,
      });

      if (data.action) {
        applyT1(trimmed, data.action);
      }

      markUtteranceProcessed(utteranceId);
    } catch (err) {
      console.error('T1 failed:', err);
      markUtteranceProcessed(utteranceId);
    } finally {
      setT1Loading(false);
    }

    // T2トリガー確認（発言カウントが更新された後に評価）
    setTimeout(() => {
      if (shouldRunT2()) {
        runT2();
      }
    }, 100);
  }, [
    text,
    session,
    isT1Loading,
    addUtterance,
    setT1Loading,
    applyT1,
    markUtteranceProcessed,
    addDebugEntry,
    shouldRunT2,
    runT2,
  ]);

  const handleConsolidate = useCallback(async () => {
    if (!session || isConsolidating) return;
    setConsolidating(true);
    setStatus('consolidating');

    try {
      const res = await fetch('/api/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: session.theme,
          allNodes: Object.values(session.nodes),
          allUtterances: session.utterances,
        }),
      });
      const data: T2ResponseValidated & { rawResponse?: string; error?: string } =
        await res.json();

      addDebugEntry({
        phase: 'Consolidation',
        request: { nodeCount: Object.keys(session.nodes).length },
        response: data,
      });

      if (data.operations) {
        applyConsolidation(data);
      } else {
        setStatus('done');
      }
    } catch (err) {
      console.error('Consolidation failed:', err);
      setStatus('done');
    } finally {
      setConsolidating(false);
    }
  }, [session, isConsolidating, setConsolidating, setStatus, applyConsolidation, addDebugEntry]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = !session || session.status === 'done';
  const utteranceCount = session?.utteranceCount ?? 0;
  const threshold = session?.t2Threshold ?? 20;
  const nextT2 = threshold - (utteranceCount % threshold);

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      {/* T2・Consolidationステータスバー */}
      {session && session.status !== 'done' && (
        <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
          <span>
            発言数: <strong className="text-slate-600">{utteranceCount}</strong>
            {' '}／ 次のT2まで:{' '}
            <strong className="text-blue-500">{nextT2}発言</strong>
          </span>
          {isT2Loading && (
            <span className="flex items-center gap-1 text-blue-500">
              <span className="animate-spin">⟳</span> マップ再整理中...
            </span>
          )}
          {isConsolidating && (
            <span className="flex items-center gap-1 text-purple-500">
              <span className="animate-spin">⟳</span> 最終整理中...
            </span>
          )}
        </div>
      )}

      {session?.status === 'done' && (
        <div className="mb-2 text-xs text-center text-emerald-600 font-medium">
          ✓ 会議が終了しました。最終マップが完成しています。
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* 発言入力 */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={
            isDisabled
              ? '会議が終了しています'
              : '発言を入力してください（Enterで送信）'
          }
          disabled={isDisabled || isT1Loading}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm
            text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400
            focus:ring-1 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400
            font-sans transition-colors"
          style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}
        />

        <div className="flex flex-col gap-2">
          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            disabled={isDisabled || isT1Loading || !text.trim()}
            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg
              hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors font-medium"
          >
            {isT1Loading ? (
              <span className="animate-spin inline-block">⟳</span>
            ) : (
              '送信'
            )}
          </button>

          {/* 会議終了ボタン */}
          {session && session.status === 'active' && (
            <button
              onClick={handleConsolidate}
              disabled={isConsolidating || utteranceCount === 0}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg
                hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors font-medium"
            >
              終了
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
