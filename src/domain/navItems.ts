import type { AppView } from './types';

export interface NavItem {
  view: AppView;
  label: string;
  icon: string;
}

export const navItems: NavItem[] = [
  { view: 'vault', label: 'Inicio', icon: '⌂' },
  { view: 'add', label: 'Nueva', icon: '+' },
  { view: 'security', label: 'Seguridad', icon: '✓' },
];
