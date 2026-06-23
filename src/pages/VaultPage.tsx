import { useMemo, useState } from 'react';
import { PasswordCard } from '../components/PasswordCard';
import { EmptyState } from '../components/EmptyState';
import type { PasswordCategory, PasswordEntry } from '../domain/types';

const categories: Array<'Todos' | PasswordCategory> = ['Todos', 'Personal', 'Trabajo', 'Estudio', 'Banco', 'Redes'];
type QuickFilter = 'Todos' | 'Favoritos' | 'Débiles' | 'Repetidas';
type SortMode = 'recent' | 'alphabetical' | 'strength';

const quickFilters: QuickFilter[] = ['Todos', 'Favoritos', 'Débiles', 'Repetidas'];
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
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('Todos');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesCategory = category === 'Todos' || entry.category === category;
      const matchesQuickFilter =
        quickFilter === 'Todos' ||
        (quickFilter === 'Favoritos' && entry.favorite) ||
        (quickFilter === 'Débiles' && entry.strength === 'weak') ||
        (quickFilter === 'Repetidas' && (repeatedCountsByEntryId[entry.id] ?? 0) > 1);
      const matchesQuery =
        !normalizedQuery ||
        [entry.title, entry.website, entry.username, entry.category].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesCategory && matchesQuickFilter && matchesQuery;
    }).sort((first, second) => {
      if (sortMode === 'alphabetical') return first.title.localeCompare(second.title);
      if (sortMode === 'strength') return strengthRank[first.strength] - strengthRank[second.strength];
      return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
    });
  }, [category, entries, query, quickFilter, repeatedCountsByEntryId, sortMode]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bóveda local</p>
          <h1>Mi llavero</h1>
        </div>
        <span className="counter">{entries.length}</span>
      </header>
      <input
        className="search-input"
        type="search"
        value={query}
        placeholder="Buscar por sitio, usuario o categoría"
        onChange={(event) => setQuery(event.target.value)}
      />
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
      <div className="category-row" aria-label="Filtros rápidos">
        {quickFilters.map((item) => (
          <button
            key={item}
            type="button"
            className={quickFilter === item ? 'chip active' : 'chip'}
            onClick={() => setQuickFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <label className="field compact-field" htmlFor="sortMode">
        <span>Orden</span>
        <select id="sortMode" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="recent">Reciente</option>
          <option value="alphabetical">Alfabético</option>
          <option value="strength">Fortaleza</option>
        </select>
      </label>
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
