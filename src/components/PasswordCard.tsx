import type { PasswordEntry } from '../domain/types';
import { StrengthBadge } from './StrengthBadge';

interface PasswordCardProps {
  entry: PasswordEntry;
  repeatedCount?: number;
  onOpen: (entryId: string) => void;
}

export function PasswordCard({ entry, repeatedCount = 0, onOpen }: PasswordCardProps) {
  return (
    <button type="button" className="password-card" onClick={() => onOpen(entry.id)}>
      <div>
        <h3>{entry.title}</h3>
        <p>{entry.username || entry.website || 'Sin usuario'}</p>
        {repeatedCount > 1 && <span className="inline-warning">Repetida en {repeatedCount} registros</span>}
      </div>
      <div className="card-meta">
        <span>{entry.category}</span>
        <StrengthBadge strength={entry.strength} />
      </div>
    </button>
  );
}
