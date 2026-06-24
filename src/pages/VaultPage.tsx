import { useMemo, useState } from 'react';
import { PasswordCard } from '../components/PasswordCard';
import { EmptyState } from '../components/EmptyState';
import type { PasswordCategory, PasswordEntry } from '../domain/types';

const categories: Array<'Todos' | PasswordCategory> = ['Todos', 'Personal', 'Trabajo', 'Estudio', 'Banco', 'Redes'];
type SortMode = 'recent' | 'alphabetical' | 'strength';
type StatusFilter = 'all' | 'strong' | 'weak' | 'repeated';

const strengthRank = { weak: 0, medium: 1, strong: 2 };

interface VaultPageProps {
  entries: PasswordEntry[];
  repeatedCountsByEntryId: Record<string, number>;
  onAdd: () => void;
  onOpenEntry: (entryId: string) => void;
}

export function VaultPage({ entries, repeatedCountsByEntryId, onAdd, onOpenEntry }: VaultPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Todos' | PasswordCategory>('Todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesCategory = category === 'Todos' || entry.category === category;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'strong' && entry.strength === 'strong') ||
        (statusFilter === 'weak' && entry.strength === 'weak') ||
        (statusFilter === 'repeated' && (repeatedCountsByEntryId[entry.id] ?? 0) > 1);
      const matchesQuery =
        !normalizedQuery ||
        [entry.title, entry.website, entry.username, entry.category].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesCategory && matchesStatus && matchesQuery;
    }).sort((first, second) => {
      if (sortMode === 'alphabetical') return first.title.localeCompare(second.title);
      if (sortMode === 'strength') return strengthRank[first.strength] - strengthRank[second.strength];
      return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
    });
  }, [category, entries, query, repeatedCountsByEntryId, sortMode, statusFilter]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bóveda local</p>
          <h1>Mi llavero</h1>
        </div>
        <div className="vault-header-actions">
          <span className="counter" aria-label={`${entries.length} credenciales`}>{entries.length}</span>
          <span className="profile-avatar" aria-label="Perfil de usuario" role="img">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="8" r="3.25" />
              <path d="M5.5 19c.6-3.2 3-5.2 6.5-5.2s5.9 2 6.5 5.2" />
            </svg>
          </span>
        </div>
      </header>
      <label className="search-field" htmlFor="vaultSearch">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.5 15.5 4.2 4.2" />
        </svg>
        <input
          id="vaultSearch"
          type="search"
          aria-label="Buscar credenciales"
          value={query}
          placeholder="Buscar por sitio, usuario o categoría"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="category-row" aria-label="Filtros por categoría">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? 'chip active' : 'chip'}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="vault-selectors">
        <label className="field" htmlFor="sortMode">
          <span>Orden</span>
          <select id="sortMode" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="recent">Reciente</option>
            <option value="alphabetical">Alfabético</option>
            <option value="strength">Fortaleza</option>
          </select>
        </label>
        <label className="field" htmlFor="statusFilter">
          <span>Estado</span>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="strong">Fuertes</option>
            <option value="weak">Débiles</option>
            <option value="repeated">Repetidas</option>
          </select>
        </label>
      </div>
      <div className="password-list">
        {filteredEntries.map((entry) => (
          <PasswordCard
            key={entry.id}
            entry={entry}
            repeatedCount={repeatedCountsByEntryId[entry.id] ?? 0}
            onOpen={onOpenEntry}
          />
        ))}
        {!filteredEntries.length && (
          <EmptyState
            title={entries.length ? 'Sin resultados' : 'Bóveda vacía'}
            description={
              entries.length
                ? 'No hay coincidencias con la búsqueda o categoría actual.'
                : 'Agrega tu primera credencial para guardarla dentro de la bóveda cifrada.'
            }
            actionLabel={entries.length ? undefined : 'Guardar mi primera contraseña'}
            onAction={entries.length ? undefined : onAdd}
          />
        )}
      </div>
      <button className="fab" type="button" aria-label="Agregar contraseña" onClick={onAdd}>
        +
      </button>
    </section>
  );
}
