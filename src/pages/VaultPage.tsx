import { useMemo, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { PasswordCard } from '../components/PasswordCard';
import { EmptyState } from '../components/EmptyState';
import type { PasswordCategory, PasswordEntry } from '../domain/types';

const categories: Array<'Todos' | PasswordCategory> = ['Todos', 'Personal', 'Trabajo', 'Estudio', 'Banco', 'Redes'];
type QuickFilter = 'Todos' | 'Débiles' | 'Repetidas';

const quickFilters: QuickFilter[] = ['Todos', 'Débiles', 'Repetidas'];

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

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries
      .filter((entry) => {
        const matchesCategory = category === 'Todos' || entry.category === category;
        const matchesQuickFilter =
          quickFilter === 'Todos' ||
          (quickFilter === 'Débiles' && entry.strength === 'weak') ||
          (quickFilter === 'Repetidas' && (repeatedCountsByEntryId[entry.id] ?? 0) > 1);
        const matchesQuery =
          !normalizedQuery ||
          [entry.title, entry.website, entry.username, entry.category].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          );

        return matchesCategory && matchesQuickFilter && matchesQuery;
      })
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
  }, [category, entries, query, quickFilter, repeatedCountsByEntryId]);

  return (
    <section className="page vault-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bóveda local</p>
          <h1>Mi llavero</h1>
        </div>
        <BrandLogo className="header-brand-mark" />
      </header>
      <input
        className="search-input"
        type="search"
        value={query}
        placeholder="Buscar por sitio, usuario o categoría"
        autoComplete="off"
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
