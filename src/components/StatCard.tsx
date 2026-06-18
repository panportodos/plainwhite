// 통계 카드 컴포넌트

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  highlightColor?: string;
}

export function StatCard({ label, value, unit, trend, highlightColor }: StatCardProps) {
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <div className="text-sm text-muted mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-medium"
          style={{ color: highlightColor || '#2C2C2A' }}
        >
          {value}
        </span>
        {unit && <span className="text-lg text-muted">{unit}</span>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 ${
          trend === 'up' ? 'text-green-600' :
          trend === 'down' ? 'text-red-600' :
          'text-muted'
        }`}>
          {trend === 'up' && '↑ 증가'}
          {trend === 'down' && '↓ 감소'}
          {trend === 'neutral' && '- 유지'}
        </div>
      )}
    </div>
  );
}
