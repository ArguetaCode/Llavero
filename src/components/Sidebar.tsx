import type { AppView } from '../domain/types';
import { navItems } from '../domain/navItems';
import { BrandLogo } from './BrandLogo';
import { NavigationIcon } from './NavigationIcon';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Navegación principal">
      <BrandLogo className="sidebar-brand" />
      <div className="sidebar-nav">
        {navItems.map((item) => (
          <button
            className={currentView === item.view ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            <NavigationIcon name={item.icon} />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
