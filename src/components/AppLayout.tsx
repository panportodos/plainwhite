// 전체 앱 레이아웃 (사이드바 + 본문)

import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* 좌측 고정 사이드바 */}
      <Sidebar />

      {/* 본문 영역 (사이드바 폭만큼 왼쪽 패딩) */}
      <main className="flex-1 ml-[220px]">
        {children}
      </main>
    </div>
  );
}
