// 좌측 사이드바 컴포넌트

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings
} from 'lucide-react';

const menuItems = [
  { path: '/', label: '대시보드', icon: LayoutDashboard },
  { path: '/patients', label: '환자 관리', icon: Users },
  { path: '/analytics', label: '데이터 분석', icon: BarChart3 },
  { path: '/settings', label: '설정', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[220px] bg-white border-r border-border h-screen flex flex-col fixed left-0 top-0">
      {/* 로고 영역 */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          {/* PW 원형 로고 */}
          <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center">
            <span className="text-white font-medium text-sm">PW</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-navy">PlainWhite</span>
            <span className="text-xs text-muted">단백질 관리 시스템</span>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-apricot text-apricot-ink font-medium'
                      : 'text-muted hover:text-ink hover:bg-surface'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 하단 한의원 정보 */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted">
          <p className="font-medium text-ink mb-1">서울 한의원</p>
          <p>김한의 원장</p>
        </div>
      </div>
    </aside>
  );
}
