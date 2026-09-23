// ============================================================
// FaciliAI — Core Type Definitions
// ============================================================

// ------- Node Type -------
export const NODE_TYPES = [
  'topic',
  'idea',
  'issue',
  'example',
  'action',
  'decision',
  'question',
  'risk',
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

// ------- Relation Type -------
export const RELATION_TYPES = [
  '具体化',
  '派生',
  '支持',
  '反対',
  '問題',
  '解決策',
  '具体例',
  '根拠',
  'アクション',
  '決定',
  '関連',
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

// ------- Insight Type -------
// UPDATE時にノードに追加される補足情報の種別
export const INSIGHT_TYPES = [
  'support',    // 支持・賛成
  'concern',    // 懸念・心配
  'counter',    // 反対・異論
  'detail',     // 詳細・補足
  'condition',  // 条件・制約
  'evidence',   // 根拠・データ
] as const;

export type InsightType = (typeof INSIGHT_TYPES)[number];

export interface NodeInsight {
  id: string;
  text: string;           // UIに表示する短文（20文字程度）
  type: InsightType;      // 種別
  sourceUtterance: string; // 元発言
  createdAt: number;
}

// ------- MapNode -------
export interface MapNode {
  id: string;
  label: string;           // UIに表示する短い具体的テキスト
  type: NodeType;          // メタデータ（labelではない）
  parentId: string | null; // ルートノードはnull
  relation: RelationType | null; // ルートノードはnull
  summary: string;         // LLMが理解した意味（内部利用）
  insights: NodeInsight[]; // UPDATE時に蓄積される補足情報（上書きなし）
  sourceUtterance: string; // 元になった発言
  confidence: number;      // 0.0〜1.0
  createdAt: number;
  updatedAt: number;
  // React Flow座標（mapStoreで管理）
  position: { x: number; y: number };
}

// ------- Utterance -------
export interface Utterance {
  id: string;
  text: string;
  timestamp: number;
  processed: boolean;
}

// ------- Meeting Session -------
export interface MeetingSession {
  id: string;
  theme: string;
  nodes: Record<string, MapNode>;
  utterances: Utterance[];
  utteranceCount: number;
  t2Threshold: number;       // デフォルト20、設定変更可能
  status: 'idle' | 'active' | 'consolidating' | 'done';
  createdAt: number;
}

// ------- T1 Response -------
export type T1Action =
  | {
      action: 'CREATE';
      node: {
        label: string;
        type: NodeType;
        parentId: string | null;
        relation: RelationType | null;
        summary: string;
        confidence: number;
      };
    }
  | {
      action: 'UPDATE';
      targetNodeId: string;
      update: {
        label?: string;
        summary?: string;
        type?: NodeType;
        relation?: RelationType;
        // 新しい補足情報（insightsに追加される、上書きなし）
        insight?: {
          text: string;
          type: InsightType;
        };
      };
    }
  | {
      action: 'IGNORE';
      reason?: string;
    };

// ------- T2 Operations -------
export type T2Operation =
  | {
      op: 'MERGE';
      sourceId: string;      // このノードを削除
      targetId: string;      // このノードに統合
      mergedSummary: string; // 統合後のsummary
    }
  | {
      op: 'REPARENT';
      nodeId: string;
      newParentId: string | null;
      newRelation: RelationType | null;
    }
  | {
      op: 'UPDATE_TYPE';
      nodeId: string;
      newType: NodeType;
    }
  | {
      op: 'UPDATE_LABEL';
      nodeId: string;
      newLabel: string;
    }
  | {
      op: 'DELETE';
      nodeId: string;
      reason: string;
    }
  | {
      op: 'UPDATE_SUMMARY';
      nodeId: string;
      newSummary: string;
    };

export interface T2Response {
  operations: T2Operation[];
  summary: string; // T2実行の概要説明
}

// ------- Debug Log -------
export interface DebugEntry {
  id: string;
  timestamp: number;
  phase: 'T1' | 'T2' | 'Consolidation';
  utterance?: string;
  request: unknown;
  response: unknown;
  error?: string;
}
