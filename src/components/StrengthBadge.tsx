import { getStrengthLabel } from '../domain/passwordStrength';
import type { PasswordStrength } from '../domain/types';

interface StrengthBadgeProps {
  strength: PasswordStrength;
}

export function StrengthBadge({ strength }: StrengthBadgeProps) {
  return <span className={`strength-badge ${strength}`}>{getStrengthLabel(strength)}</span>;
}
