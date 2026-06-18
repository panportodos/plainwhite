// 상단바 컴포넌트

import { Bell } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode; // 우측 버튼 등 추가 요소
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="bg-white border-b border-border px-8 py-4">
      {/* 상단 라인: 한의원명·원장 / 알림·유저 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>서울 한의원</span>
          <span>·</span>
          <span>김한의 원장</span>
        </div>

        <div className="flex items-center gap-4">
          {/* 알림 벨 */}
          <button className="relative p-2 hover:bg-surface rounded-lg transition-colors">
            <Bell size={18} className="text-muted" />
            {/* 읽지 않은 알림 뱃지 */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-pink rounded-full" />
          </button>

          {/* 로그인 사용자 */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-medium">
              김
            </div>
            <span className="text-sm text-ink">김한의 원장</span>
          </div>
        </div>
      </div>

      {/* 페이지 제목 라인 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
