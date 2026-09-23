// ============================================================
// POST /api/consolidate — 最終Consolidationエンドポイント
// - 会議終了時に呼ばれる
// - マップ全体を最終品質チェックし差分操作を返す
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { runConsolidation } from '@/ai/consolidation';
import { MapNode, Utterance } from '@/ai/schema/types';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey });
}

export interface ConsolidateRequest {
  theme: string;
  allNodes: MapNode[];
  allUtterances: Utterance[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ConsolidateRequest = await req.json();

    if (!body.theme) {
      return NextResponse.json({ error: 'theme is required' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const result = await runConsolidation(openai, {
      theme: body.theme,
      allNodes: body.allNodes ?? [],
      allUtterances: body.allUtterances ?? [],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, operations: [], summary: 'Consolidation failed' },
        { status: 200 }
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
