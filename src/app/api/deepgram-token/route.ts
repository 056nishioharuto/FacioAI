// GET /api/deepgram-token
// サーバー側で DEEPGRAM_API_KEY を読み取り、ブラウザに渡す
// キーはサーバー経由でのみ取得できる（クライアントの env には存在しない）

import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPGRAM_API_KEY が設定されていません' },
      { status: 500 }
    );
  }
  return NextResponse.json({ key: apiKey });
}
