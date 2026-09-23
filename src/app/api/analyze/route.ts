// ============================================================
// POST /api/analyze — T1処理エンドポイント
// - APIキーはサーバー側のみ（クライアントに露出しない）
// - OpenAI呼び出し → Zodバリデーション → 結果返却
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { runT1 } from '@/ai/tier1';
import { MapNode, Utterance } from '@/ai/schema/types';

// OpenAIクライアントはサーバー側で初期化
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

export interface AnalyzeRequest {
  theme: string;
  currentUtterance: string;
  recentUtterances: Utterance[];
  allNodes: MapNode[];
}

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequest = await req.json();

    if (!body.theme || !body.currentUtterance) {
      return NextResponse.json(
        { error: 'theme and currentUtterance are required' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    const result = await runT1(openai, {
      theme: body.theme,
      currentUtterance: body.currentUtterance,
      recentUtterances: body.recentUtterances ?? [],
      allNodes: body.allNodes ?? [],
    });

    if (!result.success) {
      // T1失敗時はIGNOREとして扱い、クライアントに通知
      return NextResponse.json({
        action: { action: 'IGNORE', reason: result.error },
        rawResponse: result.rawResponse,
        error: result.error,
      });
    }

    return NextResponse.json({
      action: result.data,
      rawResponse: result.rawResponse,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
