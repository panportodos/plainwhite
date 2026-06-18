// 체질 한자 원형 뱃지 컴포넌트

import { CONSTITUTION_MAP } from '../lib/constants';
import type { Constitution } from '../lib/types';

interface ConstitutionBadgeProps {
  constitution: Constitution;
  showLabel?: boolean; // 체질명도 함께 표시할지
}

export function ConstitutionBadge({ constitution, showLabel = false }: ConstitutionBadgeProps) {
  const info = CONSTITUTION_MAP[constitution];

  return (
    <div className="flex items-center gap-2">
      {/* 한자 원형 */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${info.color}15` }}
      >
        <span
          className="text-lg font-medium"
          style={{ color: info.color }}
        >
          {info.hanja}
        </span>
      </div>

      {/* 체질명 + 제품명 (옵션) */}
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-ink">{constitution}</span>
          <span className="text-xs text-muted">{info.productName}</span>
        </div>
      )}
    </div>
  );
}
