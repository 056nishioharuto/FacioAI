'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMapStore } from '@/map/mapStore';
import { T2ResponseValidated } from '@/ai/schema/zodSchemas';
import { useSpeechInput } from '@/hooks/useSpeechInput';

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

  const { state: speechState, errorMessage: speechError, interimText, startRecording, stopRecording } =
    useSpeechInput();

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
      const data: T2ResponseValidated & { rawResponse?: string; error?: string } = await res.json();
      addDebugEntry({ phase: 'T2', request: { nodeCount: Object.keys(session.nodes).length }, response: data });
      if (data.operations) applyT2(data);
    } catch (err) {
      console.error('T2 failed:', err);
    } finally {
      setT2Loading(false);
    }
  }, [session, isT2Loading, setT2Loading, applyT2, addDebugEntry]);

  const submitUtterance = useCallback(
    async (utteranceText: string, source: 'text' | 'speech' = 'text') => {
      const trimmed = utteranceText.trim();
      if (!trimmed || !session || isT1Loading) return;
      const utteranceId = addUtterance(trimmed, source);
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
        addDebugEntry({ phase: 'T1', utterance: trimmed, request: { utterance: trimmed, nodeCount: Object.keys(session.nodes).length, source }, response: data, error: data.error });
        if (data.action) applyT1(trimmed, data.action);
        markUtteranceProcessed(utteranceId);
      } catch (err) {
        console.error('T1 failed:', err);
        markUtteranceProcessed(utteranceId);
      } finally {
        setT1Loading(false);
      }
      setTimeout(() => { if (shouldRunT2()) runT2(); }, 100);
    },
    [session, isT1Loading, addUtterance, setT1Loading, applyT1, markUtteranceProcessed, addDebugEntry, shouldRunT2, runT2]
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    inputRef.current?.focus();
    await submitUtterance(trimmed, 'text');
  }, [text, submitUtterance]);

  const submitUtteranceRef = useRef(submitUtterance);
  useEffect(() => { submitUtteranceRef.current = submitUtterance; }, [submitUtterance]);

  const handleSpeechUtterance = useCallback((spokenText: string) => {
    submitUtteranceRef.current(spokenText, 'speech');
  }, []);

  const handleSpeechButtonClick = useCallback(() => {
    if (speechState === 'recording' || speechState === 'stopping') {
      stopRecording();
    } else if (speechState === 'idle' || speechState === 'error') {
      startRecording(handleSpeechUtterance);
    }
  }, [speechState, stopRecording, startRecording, handleSpeechUtterance]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleConsolidate = useCallback(async () => {
    if (!session || isConsolidating) return;
    setConsolidating(true);
    setStatus('consolidating');
    try {
      const res = await fetch('/api/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: session.theme, allNodes: Object.values(session.nodes), allUtterances: session.utterances }),
      });
      const data: T2ResponseValidated & { rawResponse?: string; error?: string } = await res.json();
      addDebugEntry({ phase: 'Consolidation', request: { nodeCount: Object.keys(session.nodes).length }, response: data });
      if (data.operations) applyConsolidation(data);
      else setStatus('done');
    } catch (err) {
      console.error('Consolidation failed:', err);
      setStatus('done');
    } finally {
      setConsolidating(false);
    }
  }, [session, isConsolidating, setConsolidating, setStatus, applyConsolidation, addDebugEntry]);

  const isDisabled = !session || session.status === 'done';
  const utteranceCount = session?.utteranceCount ?? 0;
  const threshold = session?.t2Threshold ?? 20;
  const nextT2 = threshold - (utteranceCount % threshold);
  const isSpeechRecording = speechState === 'recording';
  const isSpeechConnecting = speechState === 'connecting' || speechState === 'stopping';
  const speechButtonDisabled = isDisabled || isSpeechConnecting;

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      {session && session.status !== 'done' && (
        <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
          <span>
            発言数: <strong className="text-slate-600">{utteranceCount}</strong>
            {' '}／ 次のT2まで: <strong className="text-blue-500">{nextT2}発言</strong>
          </span>
          {isT2Loading && <span className="flex items-center gap-1 text-blue-500"><span className="animate-spin">⟳</span> マップ再整理中...</span>}
          {isConsolidating && <span className="flex items-center gap-1 text-purple-500"><span className="animate-spin">⟳</span> 最終整理中...</span>}
        </div>
      )}

      {session?.status === 'done' && (
        <div className="mb-2 text-xs text-center text-emerald-600 font-medium">✓ 会議が終了しました。最終マップが完成しています。</div>
      )}

      {(isSpeechRecording || isSpeechConnecting) && interimText && (
        <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            認識中...
          </div>
          <div className="text-sm text-blue-800 italic" style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}>
            「{interimText}」
          </div>
        </div>
      )}

      {speechState === 'error' && speechError && (
        <div className="mb-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
          ⚠️ {speechError}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={isDisabled ? '会議が終了しています' : isSpeechRecording ? '🔴 音声入力中... （テキスト入力も使えます）' : '発言を入力してください（Enterで送信）'}
          disabled={isDisabled || isT1Loading}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400 font-sans transition-colors"
          style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}
        />

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={isDisabled || isT1Loading || !text.trim()}
            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isT1Loading ? <span className="animate-spin inline-block">⟳</span> : '送信'}
          </button>

          <button
            onClick={handleSpeechButtonClick}
            disabled={speechButtonDisabled}
            title={speechState === 'error' ? speechError ?? '音声入力エラー' : isSpeechRecording ? 'クリックして録音を停止' : '音声入力を開始'}
            className={[
              'px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-1.5',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isSpeechRecording ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200'
                : isSpeechConnecting ? 'bg-slate-200 text-slate-500 cursor-wait'
                : speechState === 'error' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
            ].join(' ')}
          >
            <span className={isSpeechRecording ? 'animate-pulse' : ''}>
              {isSpeechRecording ? '🔴' : isSpeechConnecting ? '⟳' : speechState === 'error' ? '⚠️' : '🎤'}
            </span>
            <span>
              {isSpeechRecording ? '録音中' : speechState === 'connecting' ? '接続中...' : speechState === 'stopping' ? '停止中...' : speechState === 'error' ? '再試行' : '音声'}
            </span>
          </button>

          {session && session.status === 'active' && (
            <button
              onClick={handleConsolidate}
              disabled={isConsolidating || utteranceCount === 0}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              終了
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
