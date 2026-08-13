type NavigationIconName = 'home' | 'add' | 'settings';

interface NavigationIconProps {
  name: NavigationIconName;
}

export function NavigationIcon({ name }: NavigationIconProps) {
  if (name === 'home') {
    return (
      <svg className="navigation-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.4 12 3.5l8.5 6.9v9.1a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z" />
      </svg>
    );
  }

  if (name === 'settings') {
    return (
      <svg className="navigation-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.7 3.2h4.6l.7 2.2c.5.2.9.4 1.3.7l2.2-.6 2.3 4-1.6 1.6a7 7 0 0 1 0 1.8l1.6 1.6-2.3 4-2.2-.6c-.4.3-.8.5-1.3.7l-.7 2.2H9.7L9 18.6a7 7 0 0 1-1.3-.7l-2.2.6-2.3-4 1.6-1.6a7 7 0 0 1 0-1.8L3.2 9.5l2.3-4 2.2.6c.4-.3.8-.5 1.3-.7Z" />
        <circle cx="12" cy="12" r="3.1" />
      </svg>
    );
  }

  return (
    <svg className="navigation-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5v9M7.5 12h9" />
    </svg>
  );
}
