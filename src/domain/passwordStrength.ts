import type { PasswordStrength } from './types';

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) {
    return 'weak';
  }

  let score = 0;

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 3) {
    return 'weak';
  }

  if (score <= 5) {
    return 'medium';
  }

  return 'strong';
}

export function getStrengthLabel(strength: PasswordStrength): string {
  const labels: Record<PasswordStrength, string> = {
    weak: 'Débil',
    medium: 'Media',
    strong: 'Fuerte',
  };

  return labels[strength];
}
