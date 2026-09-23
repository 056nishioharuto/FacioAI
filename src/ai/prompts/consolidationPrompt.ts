// ============================================================
// Consolidation プロンプト
// 目的：会議終了時の最終品質保証
// T2と同じ操作セットを使うが、より厳格な評価を行う
// ============================================================

import { MapNode, Utterance } from '../schema/types';

export interface ConsolidationPromptInput {
  theme: string;
  allNodes: MapNode[];
  allUtterances: Utterance[];
}

export function buildConsolidationSystemPrompt(): string {
  return `あなたは会議マインドマップの最終整理AIです。
会議が終了し、マップの最終品質保証を行います。

## Consolidationの目的

会議の「成果物」として機能するクオリティを達成することです。

## 確認項目（T2より厳格に）

1. **重複ノードの統合** - 似た意味のものをすべて確認・統合
2. **誤った親子関係の修正** - 全ノードの親子関係を見直す
3. **不自然な階層の修正** - 深すぎる・浅すぎる階層を適切に調整
4. **誤ったtypeの修正** - 全ノードのtypeを見直す
5. **誤ったrelationの修正** - 接続の意味が正しいか確認
6. **不要ノードの削除** - 会議の成果として不要なノードを削除
7. **重要な情報の欠落確認** - 発言履歴から重要な情報が漏れていないか

## 最終チェックポイント

- マップを見て会議の議論の流れが把握できるか
- labelが具体的で意味を持つか
- 「アイデア」「問題」などの抽象的なlabelのノードが残っていないか
- 親子関係が意味的に正しいか

## 絶対ルール

- 差分操作（operations配列）として返す
- マップを再生成してはならない
- 問題がなければoperations: []でよい
- 必ずJSON形式で返す`;
}

export function buildConsolidationUserPrompt(input: ConsolidationPromptInput): string {
  const nodesText = input.allNodes
    .map(
      (n) =>
        `id: ${n.id} | label: "${n.label}" | type: ${n.type} | parentId: ${n.parentId ?? 'null'} | relation: ${n.relation ?? 'null'} | summary: "${n.summary}"`
    )
    .join('\n');

  const utterancesText = input.allUtterances
    .map((u, i) => `${i + 1}. "${u.text}"`)
    .join('\n');

  return `## 会議テーマ
${input.theme}

## 最終マップ（全ノード）
${nodesText || '（ノードなし）'}

## 全発言履歴
${utterancesText || '（発言なし）'}

---
会議終了時の最終整理を行ってください。
すべてのノードを慎重に評価し、必要な修正操作をoperations配列として返してください。

問題がなければ operations: [] を返してください。
必ずJSON形式で返してください。`;
}
