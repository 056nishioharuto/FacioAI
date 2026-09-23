// ============================================================
// FaciliAI — Core Type Definitions
// ============================================================

export const NODE_TYPES = ['topic','idea','issue','example','action','decision','question','risk'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const RELATION_TYPES = ['具体化','派生','支持','反対','問題','解決策','具体例','根拠','アクション','決定','関連'] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const INSIGHT_TYPES = ['support','concern','counter','detail','condition','evidence'] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

export interface NodeInsight {
  id: string;
  text: string;
  type: InsightType;
  sourceUtterance: string;
  createdAt: number;
}

export interface MapNode {
  id: string;
  label: string;
  type: NodeType;
  parentId: string | null;
  relation: RelationType | null;
  summary: string;
  insights: NodeInsight[];
  sourceUtterance: string;
  confidence: number;
  createdAt: number;
  updatedAt: number;
  position: { x: number; y: number };
}

export interface Utterance {
  id: string;
  text: string;
  timestamp: number;
  processed: boolean;
  source?: 'text' | 'speech';
}

export interface MeetingSession {
  id: string;
  theme: string;
  nodes: Record<string, MapNode>;
  utterances: Utterance[];
  utteranceCount: number;
  t2Threshold: number;
  status: 'idle' | 'active' | 'consolidating' | 'done';
  createdAt: number;
}

export type T1Action =
  | { action: 'CREATE'; node: { label: string; type: NodeType; parentId: string | null; relation: RelationType | null; summary: string; confidence: number; } }
  | { action: 'UPDATE'; targetNodeId: string; update: { label?: string; summary?: string; type?: NodeType; relation?: RelationType; insight?: { text: string; type: InsightType; }; } }
  | { action: 'IGNORE'; reason?: string; };

export type T2Operation =
  | { op: 'MERGE'; sourceId: string; targetId: string; mergedSummary: string; }
  | { op: 'REPARENT'; nodeId: string; newParentId: string | null; newRelation: RelationType | null; }
  | { op: 'UPDATE_TYPE'; nodeId: string; newType: NodeType; }
  | { op: 'UPDATE_LABEL'; nodeId: string; newLabel: string; }
  | { op: 'DELETE'; nodeId: string; reason: string; }
  | { op: 'UPDATE_SUMMARY'; nodeId: string; newSummary: string; };

export interface T2Response {
  operations: T2Operation[];
  summary: string;
}

export interface DebugEntry {
  id: string;
  timestamp: number;
  phase: 'T1' | 'T2' | 'Consolidation';
  utterance?: string;
  request: unknown;
  response: unknown;
  error?: string;
}
