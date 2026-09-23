// ============================================================
// POST /api/reorganize — T2処理エンドポイント
// - 20発言ごとに呼ばれる
// - マップ全体を評価し、差分操作を返す
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { runT2 } from '@/ai/tier2';
import { MapNode, Utterance } from '@/ai/schema/types';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey });
}

export interface ReorganizeRequest {
  theme: string;
  allNodes: MapNode[];
  recentUtterances: Utterance[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ReorganizeRequest = await req.json();

    if (!body.theme) {
      return NextResponse.json({ error: 'theme is required' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const result = await runT2(openai, {
      theme: body.theme,
      allNodes: body.allNodes ?? [],
      recentUtterances: body.recentUtterances ?? [],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, operations: [], summary: 'T2 failed' },
        { status: 200 } // クライアントをクラッシュさせない
      );
    }

    return NextResponse.json({
      operations: result.data.operations,
      summary: result.data.summary,
      rawResponse: result.rawResponse,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
