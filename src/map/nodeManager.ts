// ============================================================
// ノード操作ユーティリティ
// - CREATE / UPDATE / IGNORE の適用
// - T2 Operations の適用
// - ノードIDの生成
// ============================================================

import { nanoid } from 'nanoid';
import { MapNode, NodeInsight, NodeType, RelationType, InsightType } from '@/ai/schema/types';
import { T1ResponseValidated } from '@/ai/schema/zodSchemas';
import { T2ResponseValidated } from '@/ai/schema/zodSchemas';

// ------- ノードID生成 -------
export function generateNodeId(): string {
  return `node_${nanoid(8)}`;
}

// ------- Insight 重複チェック -------
// 既存のinsightと意味的にほぼ同一のテキストを弾く
// （LLM呼び出しなし：正規化後の文字列一致・包含関係で判定）
function isDuplicateInsight(existing: NodeInsight[], newText: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s　、。，．！？。、！？.,!?]/g, '');

  const normalizedNew = normalize(newText);
  if (normalizedNew.length < 3) return true; // 短すぎる

  return existing.some((ins) => {
    const normalizedExisting = normalize(ins.text);
    return (
      normalizedNew === normalizedExisting ||
      normalizedNew.includes(normalizedExisting) ||
      normalizedExisting.includes(normalizedNew)
    );
  });
}

// ------- T1アクション適用 -------
export function applyT1Action(
  nodes: Record<string, MapNode>,
  action: T1ResponseValidated,
  utteranceText: string
): { nodes: Record<string, MapNode>; createdId?: string; updatedId?: string } {
  const updated = { ...nodes };
  const now = Date.now();

  if (action.action === 'CREATE') {
    // parentIdが存在するか検証
    const parentId = action.node.parentId;
    const validParentId = parentId && updated[parentId] ? parentId : null;

    const id = generateNodeId();
    updated[id] = {
      id,
      label: action.node.label,
      type: action.node.type as NodeType,
      parentId: validParentId,
      relation: action.node.relation as RelationType | null,
      summary: action.node.summary,
      insights: [], // 初期値は空配列
      sourceUtterance: utteranceText,
      confidence: action.node.confidence,
      createdAt: now,
      updatedAt: now,
      position: { x: 0, y: 0 }, // layoutで後から設定
    };
    return { nodes: updated, createdId: id };
  }

  if (action.action === 'UPDATE') {
    const target = updated[action.targetNodeId];
    if (!target) {
      // 存在しないIDへのUPDATEはIGNOREとして扱う
      return { nodes: updated };
    }

    // insight を他の update フィールドと分離して処理
    const { insight, ...otherUpdates } = action.update;

    // insight が含まれており、重複でなければ配列に追加
    const existingInsights = target.insights ?? [];
    const newInsights = [...existingInsights];

    if (insight && !isDuplicateInsight(existingInsights, insight.text)) {
      const newInsight: NodeInsight = {
        id: nanoid(8),
        text: insight.text,
        type: insight.type as InsightType,
        sourceUtterance: utteranceText,
        createdAt: now,
      };
      newInsights.push(newInsight);
    }

    updated[action.targetNodeId] = {
      ...target,
      ...otherUpdates, // label / summary / type / relation の更新（あれば）
      insights: newInsights, // 追記のみ（上書きなし）
      updatedAt: now,
    };
    return { nodes: updated, updatedId: action.targetNodeId };
  }

  // IGNORE
  return { nodes: updated };
}

// ------- T2 Operations 適用 -------
export function applyT2Operations(
  nodes: Record<string, MapNode>,
  response: T2ResponseValidated
): Record<string, MapNode> {
  let updated = { ...nodes };
  const now = Date.now();

  for (const op of response.operations) {
    switch (op.op) {
      case 'MERGE': {
        const source = updated[op.sourceId];
        const target = updated[op.targetId];
        if (!source || !target) break;

        // targetのsummaryを更新し、sourceのinsightsをtargetに統合
        const mergedInsights = [
          ...(target.insights ?? []),
          ...(source.insights ?? []),
        ];
        updated[op.targetId] = {
          ...target,
          summary: op.mergedSummary,
          insights: mergedInsights,
          updatedAt: now,
        };

        // sourceの子ノードをtargetに付け替え
        for (const node of Object.values(updated)) {
          if (node.parentId === op.sourceId) {
            updated[node.id] = { ...node, parentId: op.targetId, updatedAt: now };
          }
        }

        // sourceを削除
        delete updated[op.sourceId];
        break;
      }

      case 'REPARENT': {
        const node = updated[op.nodeId];
        if (!node) break;
        // 新parentIdが存在するか確認
        const validParentId =
          op.newParentId && updated[op.newParentId] ? op.newParentId : null;
        updated[op.nodeId] = {
          ...node,
          parentId: validParentId,
          relation: op.newRelation as RelationType | null,
          updatedAt: now,
        };
        break;
      }

      case 'UPDATE_TYPE': {
        const node = updated[op.nodeId];
        if (!node) break;
        updated[op.nodeId] = { ...node, type: op.newType as NodeType, updatedAt: now };
        break;
      }

      case 'UPDATE_LABEL': {
        const node = updated[op.nodeId];
        if (!node) break;
        updated[op.nodeId] = { ...node, label: op.newLabel, updatedAt: now };
        break;
      }

      case 'DELETE': {
        const node = updated[op.nodeId];
        if (!node) break;
        // 子ノードを親に繋ぎ替え
        for (const child of Object.values(updated)) {
          if (child.parentId === op.nodeId) {
            updated[child.id] = {
              ...child,
              parentId: node.parentId,
              updatedAt: now,
            };
          }
        }
        delete updated[op.nodeId];
        break;
      }

      case 'UPDATE_SUMMARY': {
        const node = updated[op.nodeId];
        if (!node) break;
        updated[op.nodeId] = { ...node, summary: op.newSummary, updatedAt: now };
        break;
      }
    }
  }

  return updated;
}

// ------- ツリー構造のバリデーション -------
// 循環参照を検出してフォールバック
export function validateTree(nodes: Record<string, MapNode>): Record<string, MapNode> {
  const validated = { ...nodes };

  for (const node of Object.values(validated)) {
    if (!node.parentId) continue;

    // 祖先をたどって循環参照がないか確認
    const visited = new Set<string>();
    let current: string | null = node.parentId;
    let hasCycle = false;

    while (current) {
      if (visited.has(current) || current === node.id) {
        hasCycle = true;
        break;
      }
      visited.add(current);
      current = validated[current]?.parentId ?? null;
    }

    if (hasCycle) {
      validated[node.id] = { ...node, parentId: null };
    }
  }

  return validated;
}
