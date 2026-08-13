import type { AppView } from '../domain/types';
import { navItems } from '../domain/navItems';
import { NavigationIcon } from './NavigationIcon';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {navItems.map((item) => (
        <button
          className={currentView === item.view ? 'nav-item active' : 'nav-item'}
          key={item.view}
          type="button"
          onClick={() => onNavigate(item.view)}
        >
          <NavigationIcon name={item.icon} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
