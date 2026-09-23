// ============================================================
// T1：高速リアルタイム解析
// - gpt-4o-mini（OPENAI_T1_MODEL で変更可能）
// - CREATE / UPDATE / IGNORE を返す
// - サーバーサイドAPIルートから呼び出す
// ============================================================

import OpenAI from 'openai';
import { t1ResponseSchema, T1ResponseValidated } from './schema/zodSchemas';
import { buildT1SystemPrompt, buildT1UserPrompt, T1PromptInput } from './prompts/t1Prompt';

export interface T1Result {
  success: true;
  data: T1ResponseValidated;
  rawResponse: string;
}

export interface T1Error {
  success: false;
  error: string;
  rawResponse?: string;
}

export type T1Output = T1Result | T1Error;

export async function runT1(
  openai: OpenAI,
  input: T1PromptInput
): Promise<T1Output> {
  const model = process.env.OPENAI_T1_MODEL ?? 'gpt-4o-mini';

  const systemPrompt = buildT1SystemPrompt();
  const userPrompt = buildT1UserPrompt(input);

  let rawResponse = '';

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,   // 低温で一貫性を確保
      max_tokens: 512,
    });

    rawResponse = response.choices[0]?.message?.content ?? '';

    if (!rawResponse) {
      return { success: false, error: 'Empty response from OpenAI', rawResponse };
    }

    // JSONパース
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      return {
        success: false,
        error: `JSON parse failed: ${rawResponse}`,
        rawResponse,
      };
    }

    // Zodバリデーション
    const validated = t1ResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        success: false,
        error: `Validation failed: ${validated.error.message}`,
        rawResponse,
      };
    }

    return { success: true, data: validated.data, rawResponse };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      rawResponse,
    };
  }
}
