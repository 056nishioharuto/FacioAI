'use client';

import { useMapStore } from '@/map/mapStore';
import { getNodeStyle, NODE_STYLES } from '@/components/Node/nodeStyles';
import { NodeType, RelationType, NODE_TYPES } from '@/ai/schema/types';
import { useState } from 'react';

export default function NodeDetail() {
  const { session, selectedNodeId, setSelectedNode, deleteNode, manualAddNode } = useMapStore();
  const [addLabel, setAddLabel] = useState('');
  const [addType, setAddType] = useState<NodeType>('idea');
  const [showAddForm, setShowAddForm] = useState(false);

  const selectedNode = selectedNodeId && session ? session.nodes[selectedNodeId] : null;
  const parentNode = selectedNode?.parentId ? session?.nodes[selectedNode.parentId] : null;
  const childNodes = session
    ? Object.values(session.nodes).filter((n) => n.parentId === selectedNodeId)
    : [];

  const handleAddChild = () => {
    if (!addLabel.trim() || !selectedNodeId) return;
    manualAddNode(addLabel.trim(), addType, selectedNodeId);
    setAddLabel('');
    setShowAddForm(false);
  };

  const handleAddRoot = () => {
    if (!addLabel.trim()) return;
    manualAddNode(addLabel.trim(), addType, null);
    setAddLabel('');
    setShowAddForm(false);
  };

  // ノード詳細表示
  if (selectedNode) {
    const style = getNodeStyle(selectedNode.type);
    return (
      <div className="p-4 space-y-3 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div
            className="flex-1 text-sm font-bold text-slate-800 leading-tight"
            style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}
          >
            {selectedNode.label}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-slate-400 hover:text-slate-600 text-xs ml-2"
          >
            ✕
          </button>
        </div>

        {/* type バッジ */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            background: style.badge,
            color: style.badgeText,
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: '5px',
          }}
        >
          {style.icon} {style.label}
        </div>

        {/* relation */}
        {selectedNode.relation && (
          <div className="text-xs">
            <span className="text-slate-400">接続関係：</span>
            <span className="text-slate-700 font-medium">{selectedNode.relation}</span>
          </div>
        )}

        {/* 親ノード */}
        {parentNode && (
          <div className="text-xs">
            <span className="text-slate-400">親ノード：</span>
            <span className="text-slate-700 font-medium">{parentNode.label}</span>
          </div>
        )}

        {/* summary */}
        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 leading-relaxed"
          style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}>
          {selectedNode.summary}
        </div>

        {/* 元発言 */}
        <div className="text-xs">
          <div className="text-slate-400 mb-1">元の発言</div>
          <div className="text-slate-600 italic bg-blue-50 rounded p-2"
            style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}>
            「{selectedNode.sourceUtterance}」
          </div>
        </div>

        {/* 子ノード一覧 */}
        {childNodes.length > 0 && (
          <div className="text-xs">
            <div className="text-slate-400 mb-1">子ノード ({childNodes.length})</div>
            <div className="space-y-1">
              {childNodes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedNode(c.id)}
                  className="text-slate-600 bg-slate-50 rounded px-2 py-1 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 子ノード追加 */}
        {showAddForm ? (
          <div className="space-y-2 border-t border-slate-100 pt-2">
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
              placeholder="ノード名"
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
            />
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as NodeType)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              {NODE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {NODE_STYLES[t].icon} {NODE_STYLES[t].label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAddChild}
                className="flex-1 text-xs bg-slate-800 text-white rounded px-2 py-1 hover:bg-slate-700"
              >
                追加
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg py-1.5 hover:border-slate-400 hover:text-slate-600 transition-colors"
          >
            + 子ノードを追加
          </button>
        )}

        {/* 削除ボタン */}
        <button
          onClick={() => {
            deleteNode(selectedNodeId!);
            setSelectedNode(null);
          }}
          className="w-full text-xs text-red-400 hover:text-red-600 transition-colors py-1"
        >
          このノードを削除
        </button>
      </div>
    );
  }

  // 選択なし → ノード追加フォーム
  return (
    <div className="p-4 space-y-3">
      <div className="text-xs text-slate-400">ノードを選択すると詳細を表示します</div>
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <div className="text-xs font-medium text-slate-600">手動でノードを追加</div>
        <input
          type="text"
          value={addLabel}
          onChange={(e) => setAddLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddRoot()}
          placeholder="ノード名"
          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
        />
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as NodeType)}
          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none"
        >
          {NODE_TYPES.map((t) => (
            <option key={t} value={t}>
              {NODE_STYLES[t].icon} {NODE_STYLES[t].label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddRoot}
          disabled={!addLabel.trim() || !session}
          className="w-full text-xs bg-slate-800 text-white rounded-lg px-3 py-1.5 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          追加
        </button>
      </div>
    </div>
  );
}
