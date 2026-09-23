'use client';

// ============================================================
// useSpeechInput — ブラウザ内蔵 Web Speech API 版
//
// フロー:
//   startRecording(onUtterance) 呼び出し
//     → SpeechRecognition を起動（APIキー不要）
//     → interim 結果は interimText に表示
//     → isFinal=true になったら即座に onUtterance へ渡す
//     → 無音で自動的に onend → 自動再起動（continuous モード）
//
// 対応ブラウザ: Chrome / Edge（Firefox は非対応）
// ============================================================

import { useState, useRef, useCallback } from 'react';

export type SpeechInputState = 'idle' | 'connecting' | 'recording' | 'stopping' | 'error';

export interface UseSpeechInputReturn {
  state: SpeechInputState;
  errorMessage: string | null;
  interimText: string;
  startRecording: (onUtterance: (text: string) => void) => Promise<void>;
  stopRecording: () => void;
}

export function useSpeechInput(): UseSpeechInputReturn {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');

  const stateRef = useRef<SpeechInputState>('idle');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const onUtteranceRef = useRef<((text: string) => void) | null>(null);

  const setStateSync = useCallback((s: SpeechInputState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const startRecording = useCallback(async (onUtterance: (text: string) => void) => {
    if (stateRef.current !== 'idle' && stateRef.current !== 'error') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMessage('このブラウザは音声認識に対応していません。Chromeをお使いください。');
      setStateSync('error');
      return;
    }

    setErrorMessage(null);
    onUtteranceRef.current = onUtterance;
    setStateSync('connecting');

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;      // 連続認識
    recognition.interimResults = true;  // 途中経過を受け取る
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setStateSync('recording');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript: string = result[0].transcript;
        if (result.isFinal) {
          const trimmed = transcript.trim();
          if (trimmed && onUtteranceRef.current) {
            onUtteranceRef.current(trimmed); // T1 へ送る
          }
          setInterimText('');
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      // no-speech は致命的エラーではないため無視（onend で自動再起動）
      if (event.error === 'no-speech') return;
      if (event.error === 'not-allowed') {
        setErrorMessage('マイクの使用が許可されていません。ブラウザの設定を確認してください。');
      } else {
        setErrorMessage(`音声認識エラー: ${event.error}`);
      }
      setStateSync('error');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // recording 中に onend が来た場合は自動再起動（Chrome は無音で止まることがある）
      if (stateRef.current === 'recording') {
        try { recognition.start(); } catch {}
      } else {
        setInterimText('');
        if (stateRef.current === 'stopping') {
          setStateSync('idle');
        }
        recognitionRef.current = null;
      }
    };

    try {
      recognition.start();
    } catch {
      setErrorMessage('音声認識の開始に失敗しました');
      setStateSync('error');
    }
  }, [setStateSync]);

  const stopRecording = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    setStateSync('stopping');
    setInterimText('');
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
  }, [setStateSync]);

  return { state, errorMessage, interimText, startRecording, stopRecording };
}
