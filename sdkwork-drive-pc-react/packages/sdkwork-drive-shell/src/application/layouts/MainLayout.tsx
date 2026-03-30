import { Outlet } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader.tsx';
import { AppSidebar } from '../../components/AppSidebar.tsx';

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_38%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_28%,#f8fafc_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,#09090b_0%,#111827_40%,#09090b_100%)] dark:text-zinc-50">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
