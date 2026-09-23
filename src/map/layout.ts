// ============================================================
// Dagreレイアウト計算
// - ノードの位置をDAG（有向非巡回グラフ）として計算
// - 意味的な親子関係を階層として視覚化
// ============================================================

import dagre from '@dagrejs/dagre';
import { MapNode } from '@/ai/schema/types';
import { Node, Edge } from 'reactflow';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const RANK_SEP = 100; // 階層間の縦距離
const NODE_SEP = 60;  // 同階層のノード間距離

export function computeDagreLayout(
  nodes: Record<string, MapNode>
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',    // Top → Bottom
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 60,
    marginy: 60,
  });

  // ノードを追加
  for (const node of Object.values(nodes)) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // エッジを追加（親子関係）
  for (const node of Object.values(nodes)) {
    if (node.parentId && nodes[node.parentId]) {
      g.setEdge(node.parentId, node.id);
    }
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of Object.values(nodes)) {
    const pos = g.node(node.id);
    if (pos) {
      positions[node.id] = {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      };
    } else {
      positions[node.id] = { x: 0, y: 0 };
    }
  }

  return positions;
}

// ------- MapNode → React Flow Node/Edge 変換 -------
export function toReactFlowElements(nodes: Record<string, MapNode>): {
  rfNodes: Node[];
  rfEdges: Edge[];
} {
  const positions = computeDagreLayout(nodes);

  const rfNodes: Node[] = Object.values(nodes).map((node) => ({
    id: node.id,
    type: 'meetingNode',
    position: positions[node.id] ?? node.position,
    data: {
      label: node.label,
      type: node.type,
      relation: node.relation,
      summary: node.summary,
      insights: node.insights ?? [],
      confidence: node.confidence,
      sourceUtterance: node.sourceUtterance,
    },
    draggable: true,
  }));

  const rfEdges: Edge[] = Object.values(nodes)
    .filter((node) => node.parentId && nodes[node.parentId])
    .map((node) => ({
      id: `edge_${node.parentId}_${node.id}`,
      source: node.parentId!,
      target: node.id,
      label: node.relation ?? undefined,
      type: 'smoothstep',
      style: getEdgeStyle(node.relation),
      labelStyle: { fontSize: 10, fill: '#888', fontFamily: 'sans-serif' },
      labelBgStyle: { fill: 'transparent' },
    }));

  return { rfNodes, rfEdges };
}

function getEdgeStyle(relation: string | null): React.CSSProperties {
  if (!relation) return { stroke: '#CBD5E1', strokeWidth: 1.5 };

  switch (relation) {
    case '反対':
    case '懸念':
    case 'リスク':
      return { stroke: '#FCA5A5', strokeWidth: 1.5, strokeDasharray: '5,4' };
    case '解決策':
    case '決定':
      return { stroke: '#6EE7B7', strokeWidth: 2 };
    case '問題':
      return { stroke: '#FCA5A5', strokeWidth: 1.5 };
    default:
      return { stroke: '#CBD5E1', strokeWidth: 1.5 };
  }
}
