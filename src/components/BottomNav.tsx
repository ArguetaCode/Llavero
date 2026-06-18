import type { AppView } from '../domain/types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const items: Array<{ view: AppView; label: string; icon: string }> = [
  { view: 'vault', label: 'Bóveda', icon: '⌂' },
  { view: 'add', label: 'Agregar', icon: '+' },
  { view: 'security', label: 'Seguridad', icon: '◌' },
];

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map((item) => (
        <button
          className={currentView === item.view ? 'nav-item active' : 'nav-item'}
          key={item.view}
          type="button"
          onClick={() => onNavigate(item.view)}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
