'use client';

// ============================================================
// カスタム React Flow ノードコンポーネント
// - type バッジ・label・insights（複数蓄積）を表示
// - isRecentlyUpdated フラグで pulse アニメーション
// ============================================================

import { memo, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType, NodeInsight, InsightType } from '@/ai/schema/types';
import { getNodeStyle } from '@/components/Node/nodeStyles';

export interface MeetingNodeData {
  label: string;
  type: NodeType;
  relation: string | null;
  summary: string;
  insights: NodeInsight[];
  confidence: number;
  sourceUtterance: string;
  isRecentlyUpdated?: boolean;
}

// InsightType ごとの表示設定
const INSIGHT_STYLE: Record<InsightType, { icon: string; color: string }> = {
  support:   { icon: '✅', color: '#16A34A' },
  concern:   { icon: '⚠️', color: '#D97706' },
  counter:   { icon: '❌', color: '#DC2626' },
  detail:    { icon: '💬', color: '#2563EB' },
  condition: { icon: '🔀', color: '#7C3AED' },
  evidence:  { icon: '📊', color: '#0F766E' },
};

function MeetingNode({ data, selected }: NodeProps<MeetingNodeData>) {
  const style = getNodeStyle(data.type);
  const nodeRef = useRef<HTMLDivElement>(null);

  // UPDATE時: pulse アニメーションを再トリガー
  useEffect(() => {
    if (data.isRecentlyUpdated && nodeRef.current) {
      const el = nodeRef.current;
      el.classList.remove('node-update-pulse');
      void el.offsetWidth; // reflow でアニメーションリセット
      el.classList.add('node-update-pulse');
    }
  }, [data.isRecentlyUpdated, data.insights?.length]);

  const insights = data.insights ?? [];

  return (
    <div
      ref={nodeRef}
      className={data.isRecentlyUpdated ? 'node-update-pulse' : ''}
      style={{
        background: style.background,
        border: selected
          ? `2px solid ${style.borderColor}`
          : `1.5px solid ${style.border}`,
        borderRadius: 10,
        padding: '8px 12px',
        minWidth: 160,
        maxWidth: 220,
        boxShadow: selected
          ? `0 0 0 3px ${style.borderColor}33`
          : '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'border 0.15s, box-shadow 0.15s',
        fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif',
      }}
    >
      {/* 上側ハンドル（親から接続を受ける） */}
      <Handle type="target" position={Position.Top} />

      {/* タイプバッジ */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: style.badge,
          color: style.textColor,
          borderRadius: 4,
          padding: '1px 6px',
          fontSize: 10,
          fontWeight: 600,
          marginBottom: 4,
          opacity: 0.85,
        }}
      >
        <span>{style.icon}</span>
        <span>{style.label}</span>
      </div>

      {/* ラベル（概念名） */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1E293B',
          lineHeight: 1.4,
          wordBreak: 'break-all',
        }}
      >
        {data.label}
      </div>

      {/* insights: UPDATE で蓄積される補足情報一覧 */}
      {insights.length > 0 && (
        <div
          style={{
            marginTop: 6,
            paddingTop: 5,
            borderTop: `1px dashed ${style.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {insights.map((ins) => {
            const insStyle = INSIGHT_STYLE[ins.type] ?? INSIGHT_STYLE.detail;
            return (
              <div
                key={ins.id}
                style={{
                  display: 'flex',
                  gap: 4,
                  alignItems: 'flex-start',
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: insStyle.color,
                }}
              >
                <span style={{ flexShrink: 0, fontSize: 10 }}>{insStyle.icon}</span>
                <span style={{ color: '#374151', wordBreak: 'break-all' }}>{ins.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 信頼度が低いときのみ表示 */}
      {data.confidence < 0.7 && (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span>▲</span>
          <span>要確認</span>
        </div>
      )}

      {/* 下側ハンドル（子への接続） */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(MeetingNode);
