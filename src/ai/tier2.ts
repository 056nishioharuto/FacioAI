// ============================================================
// T2：全体文脈による再整理
// - gpt-4o（OPENAI_T2_MODEL で変更可能）
// - 差分操作（operations配列）を返す
// - マップ全体をゼロから再生成しない
// ============================================================

import OpenAI from 'openai';
import { t2ResponseSchema, T2ResponseValidated } from './schema/zodSchemas';
import { buildT2SystemPrompt, buildT2UserPrompt, T2PromptInput } from './prompts/t2Prompt';

export interface T2Result {
  success: true;
  data: T2ResponseValidated;
  rawResponse: string;
}

export interface T2Error {
  success: false;
  error: string;
  rawResponse?: string;
}

export type T2Output = T2Result | T2Error;

export async function runT2(
  openai: OpenAI,
  input: T2PromptInput
): Promise<T2Output> {
  const model = process.env.OPENAI_T2_MODEL ?? 'gpt-4o';

  const systemPrompt = buildT2SystemPrompt();
  const userPrompt = buildT2UserPrompt(input);

  let rawResponse = '';

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,   // T2はより一貫性重視
      max_tokens: 2048,
    });

    rawResponse = response.choices[0]?.message?.content ?? '';

    if (!rawResponse) {
      return { success: false, error: 'Empty response from OpenAI', rawResponse };
    }

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

    const validated = t2ResponseSchema.safeParse(parsed);
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
