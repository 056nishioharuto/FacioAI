// ============================================================
// Zustand — 会議セッション全体の状態管理
// ============================================================

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { MapNode, Utterance, MeetingSession, DebugEntry } from '@/ai/schema/types';
import { T1ResponseValidated, T2ResponseValidated } from '@/ai/schema/zodSchemas';
import { applyT1Action, applyT2Operations, validateTree } from '@/map/nodeManager';

const DEFAULT_T2_THRESHOLD = 20;

interface MapState {
  session: MeetingSession | null;
  debugLog: DebugEntry[];
  selectedNodeId: string | null;
  recentlyUpdatedNodeId: string | null; // UPDATEアニメーション用
  isT1Loading: boolean;
  isT2Loading: boolean;
  isConsolidating: boolean;

  // --- アクション ---
  initSession: (theme: string) => void;
  addUtterance: (text: string) => string; // utterance IDを返す
  markUtteranceProcessed: (id: string) => void;
  applyT1: (utteranceText: string, action: T1ResponseValidated) => void;
  clearRecentlyUpdated: () => void;
  applyT2: (response: T2ResponseValidated) => void;
  applyConsolidation: (response: T2ResponseValidated) => void;
  setStatus: (status: MeetingSession['status']) => void;
  setSelectedNode: (id: string | null) => void;
  setT1Loading: (v: boolean) => void;
  setT2Loading: (v: boolean) => void;
  setConsolidating: (v: boolean) => void;
  addDebugEntry: (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => void;
  manualAddNode: (label: string, type: MapNode['type'], parentId: string | null) => void;
  deleteNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  shouldRunT2: () => boolean;
  resetSession: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  session: null,
  debugLog: [],
  selectedNodeId: null,
  recentlyUpdatedNodeId: null,
  isT1Loading: false,
  isT2Loading: false,
  isConsolidating: false,

  // ---- 会議セッション初期化 ----
  initSession: (theme: string) => {
    set({
      session: {
        id: nanoid(),
        theme,
        nodes: {},
        utterances: [],
        utteranceCount: 0,
        t2Threshold: DEFAULT_T2_THRESHOLD,
        status: 'active',
        createdAt: Date.now(),
      },
      debugLog: [],
      selectedNodeId: null,
    });
  },

  // ---- 発言追加 ----
  addUtterance: (text: string) => {
    const id = nanoid();
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          utterances: [
            ...state.session.utterances,
            { id, text, timestamp: Date.now(), processed: false },
          ],
        },
      };
    });
    return id;
  },

  markUtteranceProcessed: (id: string) => {
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          utterances: state.session.utterances.map((u) =>
            u.id === id ? { ...u, processed: true } : u
          ),
          utteranceCount: state.session.utteranceCount + 1,
        },
      };
    });
  },

  // ---- T1アクション適用 ----
  applyT1: (utteranceText: string, action: T1ResponseValidated) => {
    set((state) => {
      if (!state.session) return state;
      const { nodes, updatedId } = applyT1Action(state.session.nodes, action, utteranceText);
      const validatedNodes = validateTree(nodes);
      return {
        session: { ...state.session, nodes: validatedNodes },
        recentlyUpdatedNodeId: updatedId ?? state.recentlyUpdatedNodeId,
      };
    });
    // UPDATEの場合、2秒後にハイライトをクリア
    if (action.action === 'UPDATE') {
      setTimeout(() => {
        set({ recentlyUpdatedNodeId: null });
      }, 2000);
    }
  },

  clearRecentlyUpdated: () => set({ recentlyUpdatedNodeId: null }),

  // ---- T2操作適用 ----
  applyT2: (response: T2ResponseValidated) => {
    set((state) => {
      if (!state.session) return state;
      const nodes = applyT2Operations(state.session.nodes, response);
      const validatedNodes = validateTree(nodes);
      return {
        session: { ...state.session, nodes: validatedNodes },
      };
    });
  },

  // ---- Consolidation適用（T2と同じ操作セット）----
  applyConsolidation: (response: T2ResponseValidated) => {
    set((state) => {
      if (!state.session) return state;
      const nodes = applyT2Operations(state.session.nodes, response);
      const validatedNodes = validateTree(nodes);
      return {
        session: {
          ...state.session,
          nodes: validatedNodes,
          status: 'done',
        },
      };
    });
  },

  setStatus: (status) => {
    set((state) => {
      if (!state.session) return state;
      return { session: { ...state.session, status } };
    });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setT1Loading: (v) => set({ isT1Loading: v }),
  setT2Loading: (v) => set({ isT2Loading: v }),
  setConsolidating: (v) => set({ isConsolidating: v }),

  addDebugEntry: (entry) => {
    const full: DebugEntry = { ...entry, id: nanoid(), timestamp: Date.now() };
    set((state) => ({
      debugLog: [full, ...state.debugLog].slice(0, 50), // 最新50件
    }));
  },

  // ---- 手動ノード追加 ----
  manualAddNode: (label, type, parentId) => {
    const id = `node_${nanoid(8)}`;
    const now = Date.now();
    set((state) => {
      if (!state.session) return state;
      const newNode: MapNode = {
        id,
        label,
        type,
        parentId: parentId && state.session.nodes[parentId] ? parentId : null,
        relation: null,
        summary: label,
        insights: [],
        sourceUtterance: '(手動追加)',
        confidence: 1.0,
        createdAt: now,
        updatedAt: now,
        position: { x: 0, y: 0 },
      };
      return {
        session: {
          ...state.session,
          nodes: { ...state.session.nodes, [id]: newNode },
        },
      };
    });
  },

  // ---- ノード削除 ----
  deleteNode: (id) => {
    set((state) => {
      if (!state.session) return state;
      const nodes = { ...state.session.nodes };
      // 子ノードを親に繋ぎ替え
      const node = nodes[id];
      if (node) {
        for (const n of Object.values(nodes)) {
          if (n.parentId === id) {
            nodes[n.id] = { ...n, parentId: node.parentId };
          }
        }
        delete nodes[id];
      }
      return {
        session: { ...state.session, nodes },
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      };
    });
  },

  // ---- ドラッグ後の位置更新 ----
  updateNodePosition: (id, position) => {
    set((state) => {
      if (!state.session) return state;
      const node = state.session.nodes[id];
      if (!node) return state;
      return {
        session: {
          ...state.session,
          nodes: {
            ...state.session.nodes,
            [id]: { ...node, position },
          },
        },
      };
    });
  },

  // ---- T2トリガー判定 ----
  // 将来：発言数 + マップ複雑度などの複合条件に拡張可能
  shouldRunT2: () => {
    const { session } = get();
    if (!session) return false;
    const { utteranceCount, t2Threshold } = session;
    return utteranceCount > 0 && utteranceCount % t2Threshold === 0;
  },

  resetSession: () => {
    set({ session: null, debugLog: [], selectedNodeId: null });
  },
}));
