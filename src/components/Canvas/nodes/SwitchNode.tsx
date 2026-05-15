import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Network } from 'lucide-react';

interface SwitchNodeData {
  name: string;
  interfaces: { id: string; name: string; status: string }[];
}

const HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  border: '2px solid #0f172a',
  cursor: 'crosshair',
};

function SwitchNode({ data, selected }: NodeProps) {
  const d = data as unknown as SwitchNodeData;
  const interfaces = d.interfaces || [];

  return (
    <div className={`
      bg-slate-800 border-2 rounded-lg px-4 py-3 min-w-[180px]
      ${selected ? 'border-blue-400' : 'border-purple-600'}
    `}>
      <div className="flex items-center gap-2 mb-1.5">
        <Network className="w-5 h-5 text-purple-400" />
        <span className="font-medium text-sm text-slate-200">{d.name}</span>
        <span className="w-2 h-2 rounded-full bg-green-400 ml-auto" />
      </div>
      <div className="space-y-0.5">
        {interfaces.map((intf, index: number) => {
          const top = 32 + index * 20;
          return (
            <div key={intf.id} className="flex items-center justify-between text-xs h-[18px]">
              <Handle
                type="target"
                position={Position.Left}
                id={intf.id}
                style={{ ...HANDLE_STYLE, top, background: '#a78bfa' }}
                title={intf.name}
              />
              <span className="text-[10px] text-slate-500">{intf.name}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={intf.id}
                style={{ ...HANDLE_STYLE, top, background: '#a78bfa' }}
                title={intf.name}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(SwitchNode);
