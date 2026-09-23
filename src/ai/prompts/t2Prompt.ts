// ============================================================
// T2 プロンプト
// 目的：「全体文脈から構造を修正する」
// - マップを再生成するのではなく、差分操作として修正を返す
// - 重複統合、親子関係修正、type修正、不要ノード削除
// ============================================================

import { MapNode, Utterance } from '../schema/types';

export interface T2PromptInput {
  theme: string;
  allNodes: MapNode[];
  recentUtterances: Utterance[];  // 直近20発言
}

export function buildT2SystemPrompt(): string {
  return `あなたは会議マインドマップの整理AIです。
現在のマップ全体を評価し、構造的な問題を修正します。

## T2の目的

「新しいノードを大量に作る」のではなく、「現在のマップを整理・修正する」処理です。

## 評価観点

1. **重複ノードの統合**
   - 同じ意味・内容のノードを統合する（MERGE）
   - ただし似ているだけで別概念のものは統合しない
   - 例：「駅前のラーメン屋が混んでいる」と「駅前の店の混雑」→ MERGE
   - 例：「味噌ラーメン」と「醤油ラーメン」→ 別概念なのでMERGEしない

2. **親子関係の修正**
   - 意味的に間違った親子関係をRIPARENTで修正
   - 例：「味噌ラーメン」が誤って「会議テーマ」の子になっていたら「ラーメン」の子に修正

3. **typeの修正**
   - 誤ったtypeが設定されている場合はUPDATE_TYPEで修正

4. **不要ノードの削除**
   - 意味がなくなったノード、重複して統合済みのノードを削除（DELETE）
   - 削除は慎重に。情報を失わないように

5. **labelの改善**
   - 抽象的なlabelを具体的に修正（UPDATE_LABEL）
   - 長すぎるlabelを短縮

6. **summaryの更新**
   - より正確な説明に更新（UPDATE_SUMMARY）

## 絶対ルール

- 操作は差分（operationsの配列）として返す
- マップ全体をゼロから再生成してはならない
- 問題がなければoperationsは空配列でよい
- 必ずJSON形式で返す`;
}

export function buildT2UserPrompt(input: T2PromptInput): string {
  const nodesText = input.allNodes
    .map(
      (n) =>
        `id: ${n.id} | label: "${n.label}" | type: ${n.type} | parentId: ${n.parentId ?? 'null'} | relation: ${n.relation ?? 'null'} | summary: "${n.summary}"`
    )
    .join('\n');

  const utterancesText = input.recentUtterances
    .slice(-20)
    .map((u, i) => `${i + 1}. "${u.text}"`)
    .join('\n');

  return `## 会議テーマ
${input.theme}

## 現在のマップ（全ノード）
${nodesText || '（ノードなし）'}

## 直近の発言（文脈）
${utterancesText || '（発言なし）'}

---
上記のマップを評価し、必要な修正操作をoperations配列として返してください。

問題がなければ operations: [] を返してください。
必ずJSON形式で返してください。`;
}
