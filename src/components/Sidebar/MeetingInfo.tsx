'use client';

import { useMapStore } from '@/map/mapStore';
import { NODE_STYLES } from '@/components/Node/nodeStyles';
import { NodeType } from '@/ai/schema/types';

export default function MeetingInfo() {
  const { session } = useMapStore();

  if (!session) return null;

  const nodes = Object.values(session.nodes);
  const typeCount = nodes.reduce<Partial<Record<NodeType, number>>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 border-b border-slate-100 space-y-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">統計</div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-slate-800">{nodes.length}</div>
          <div className="text-xs text-slate-400">ノード数</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-slate-800">{session.utteranceCount}</div>
          <div className="text-xs text-slate-400">発言数</div>
        </div>
      </div>

      {/* type別内訳 */}
      {Object.entries(typeCount).length > 0 && (
        <div className="space-y-1">
          {(Object.entries(typeCount) as [NodeType, number][]).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-slate-600">
                <span>{NODE_STYLES[type]?.icon}</span>
                <span>{NODE_STYLES[type]?.label}</span>
              </span>
              <span className="font-medium text-slate-700">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
