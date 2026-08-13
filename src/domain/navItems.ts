import type { AppView } from './types';

export interface NavItem {
  view: AppView;
  label: string;
  icon: 'home' | 'add' | 'settings';
}

export const navItems: NavItem[] = [
  { view: 'vault', label: 'Inicio', icon: 'home' },
  { view: 'add', label: 'Nueva', icon: 'add' },
  { view: 'security', label: 'Ajustes', icon: 'settings' },
];
