// ============================================================
// ノードのtype別スタイル定義
// - 淡いパステルカラー、角丸、細いボーダー
// ============================================================

import { NodeType } from '@/ai/schema/types';

export interface NodeStyle {
  background: string;
  border: string;
  borderColor: string;
  textColor: string;
  badge: string;          // type表示バッジの背景色
  badgeText: string;      // type表示バッジのテキスト色
  icon: string;           // 絵文字アイコン
  label: string;          // 日本語ラベル
}

export const NODE_STYLES: Record<NodeType, NodeStyle> = {
  topic: {
    background: '#FFFBEB',
    border: '1.5px solid #F0C14B',
    borderColor: '#F0C14B',
    textColor: '#78350F',
    badge: '#FEF3C7',
    badgeText: '#92400E',
    icon: '🎯',
    label: 'テーマ',
  },
  idea: {
    background: '#EFF6FF',
    border: '1.5px solid #93C5FD',
    borderColor: '#93C5FD',
    textColor: '#1E3A5F',
    badge: '#DBEAFE',
    badgeText: '#1E40AF',
    icon: '💡',
    label: 'アイデア',
  },
  issue: {
    background: '#FFF1F2',
    border: '1.5px solid #FCA5A5',
    borderColor: '#FCA5A5',
    textColor: '#7F1D1D',
    badge: '#FEE2E2',
    badgeText: '#991B1B',
    icon: '⚠️',
    label: '課題',
  },
  example: {
    background: '#F0FDF4',
    border: '1.5px solid #86EFAC',
    borderColor: '#86EFAC',
    textColor: '#14532D',
    badge: '#DCFCE7',
    badgeText: '#166534',
    icon: '📝',
    label: '具体例',
  },
  action: {
    background: '#F5F3FF',
    border: '1.5px solid #C4B5FD',
    borderColor: '#C4B5FD',
    textColor: '#3B0764',
    badge: '#EDE9FE',
    badgeText: '#5B21B6',
    icon: '✅',
    label: 'アクション',
  },
  decision: {
    background: '#FFF7ED',
    border: '1.5px solid #FDBA74',
    borderColor: '#FDBA74',
    textColor: '#7C2D12',
    badge: '#FFEDD5',
    badgeText: '#C2410C',
    icon: '🔒',
    label: '決定事項',
  },
  question: {
    background: '#F8FAFC',
    border: '1.5px solid #CBD5E1',
    borderColor: '#CBD5E1',
    textColor: '#334155',
    badge: '#F1F5F9',
    badgeText: '#475569',
    icon: '❓',
    label: '質問',
  },
  risk: {
    background: '#FDF4FF',
    border: '1.5px solid #E879F9',
    borderColor: '#E879F9',
    textColor: '#581C87',
    badge: '#FAE8FF',
    badgeText: '#7E22CE',
    icon: '🔴',
    label: 'リスク',
  },
};

export function getNodeStyle(type: NodeType): NodeStyle {
  return NODE_STYLES[type] ?? NODE_STYLES.idea;
}
