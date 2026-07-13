import type { AppView } from '../domain/types';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export function AppShell({ children, currentView, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />
      <main className="app-content">{children}</main>
      <BottomNav currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
}
