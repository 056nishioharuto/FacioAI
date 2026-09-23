// ============================================================
// Consolidation：会議終了時の最終整理
// - gpt-4o（OPENAI_CONSOLIDATION_MODEL で変更可能）
// - T2と同じ操作セット、より厳格な評価
// ============================================================

import OpenAI from 'openai';
import { t2ResponseSchema, T2ResponseValidated } from './schema/zodSchemas';
import {
  buildConsolidationSystemPrompt,
  buildConsolidationUserPrompt,
  ConsolidationPromptInput,
} from './prompts/consolidationPrompt';

export interface ConsolidationResult {
  success: true;
  data: T2ResponseValidated;
  rawResponse: string;
}

export interface ConsolidationError {
  success: false;
  error: string;
  rawResponse?: string;
}

export type ConsolidationOutput = ConsolidationResult | ConsolidationError;

export async function runConsolidation(
  openai: OpenAI,
  input: ConsolidationPromptInput
): Promise<ConsolidationOutput> {
  const model = process.env.OPENAI_CONSOLIDATION_MODEL ?? 'gpt-4o';

  const systemPrompt = buildConsolidationSystemPrompt();
  const userPrompt = buildConsolidationUserPrompt(input);

  let rawResponse = '';

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
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
