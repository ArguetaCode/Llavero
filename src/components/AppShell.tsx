import type { AppView } from '../domain/types';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export function AppShell({ children, currentView, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="app-content">{children}</main>
      <BottomNav currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
}
