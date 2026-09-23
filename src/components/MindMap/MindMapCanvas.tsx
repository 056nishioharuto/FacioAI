'use client';

// ============================================================
// マインドマップキャンバス
// - React Flow ベース
// - Dagreレイアウト自動計算
// - Zoom / Pan / Drag 対応
// - ノードクリックで詳細パネル表示
// ============================================================

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import MeetingNode from '@/components/Node/MeetingNode';
import { useMapStore } from '@/map/mapStore';
import { toReactFlowElements } from '@/map/layout';
import { NODE_STYLES } from '@/components/Node/nodeStyles';
import { NodeType } from '@/ai/schema/types';

const nodeTypes = {
  meetingNode: MeetingNode,
};

function MindMapInner() {
  const { session, selectedNodeId, recentlyUpdatedNodeId, setSelectedNode, updateNodePosition } = useMapStore();
  const { fitView } = useReactFlow();

  // MapNode → React Flow Node/Edge に変換
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!session) return { rfNodes: [], rfEdges: [] };
    return toReactFlowElements(session.nodes);
  }, [session?.nodes]);

  // ノード数が変わったら自動フィット
  useEffect(() => {
    if (rfNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 100);
    }
  }, [rfNodes.length, fitView]);

  // ノードドラッグ後の位置保存
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  // ノードクリックで選択
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id === selectedNodeId ? null : node.id);
    },
    [selectedNodeId, setSelectedNode]
  );

  // 背景クリックで選択解除
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // 選択状態・UPDATE アニメーションフラグを React Flow のノードに反映
  const nodesWithSelection = useMemo(
    () =>
      rfNodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
        data: {
          ...n.data,
          isRecentlyUpdated: n.id === recentlyUpdatedNodeId,
        },
      })),
    [rfNodes, selectedNodeId, recentlyUpdatedNodeId]
  );

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-3">🗺️</div>
          <div className="text-sm font-medium">会議テーマを入力して開始してください</div>
        </div>
      </div>
    );
  }

  if (rfNodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-3">💬</div>
          <div className="text-sm font-medium">発言を入力するとマップが構築されます</div>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodesWithSelection}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={2.5}
      defaultEdgeOptions={{
        type: 'smoothstep',
        animated: false,
      }}
      proOptions={{ hideAttribution: true }}
      style={{ background: '#FAFAFA' }}
    >
      {/* ドットグリッド背景 */}
      <Background
        color="#E2E8F0"
        gap={24}
        size={1.5}
        variant={'dots' as Parameters<typeof Background>[0]['variant']}
      />

      {/* ズームコントロール */}
      <Controls
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      />

      {/* ミニマップ */}
      <MiniMap
        nodeColor={(node) => {
          const type = node.data?.type as NodeType;
          return NODE_STYLES[type]?.borderColor ?? '#CBD5E1';
        }}
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
        }}
        maskColor="rgba(241,245,249,0.7)"
      />
    </ReactFlow>
  );
}

export default function MindMapCanvas() {
  return (
    <ReactFlowProvider>
      <div className="flex-1 relative overflow-hidden">
        <MindMapInner />
      </div>
    </ReactFlowProvider>
  );
}
