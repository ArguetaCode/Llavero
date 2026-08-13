import { useMemo, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { PasswordCard } from '../components/PasswordCard';
import { EmptyState } from '../components/EmptyState';
import { NavigationIcon } from '../components/NavigationIcon';
import type { PasswordCategory, PasswordEntry } from '../domain/types';

const categories: Array<'Todos' | PasswordCategory> = ['Todos', 'Personal', 'Trabajo', 'Estudio', 'Banco', 'Redes'];

interface VaultPageProps {
  entries: PasswordEntry[];
  repeatedCountsByEntryId: Record<string, number>;
  onAdd: () => void;
  onOpenEntry: (entryId: string) => void;
}

export function VaultPage({ entries, repeatedCountsByEntryId, onAdd, onOpenEntry }: VaultPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Todos' | PasswordCategory>('Todos');

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries
      .filter((entry) => {
        const matchesCategory = category === 'Todos' || entry.category === category;
        const matchesQuery =
          !normalizedQuery ||
          [entry.title, entry.website, entry.username, entry.category].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          );

        return matchesCategory && matchesQuery;
      })
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime());
  }, [category, entries, query]);

  return (
    <section className="page vault-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bóveda local</p>
          <h1>Mi llavero</h1>
        </div>
        <div className="vault-header-actions">
          <button className="primary-button header-add-button" type="button" onClick={onAdd}>
            + Nueva contraseña
          </button>
          <BrandLogo className="header-brand-mark" />
        </div>
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
        <NavigationIcon name="add" />
      </button>
    </section>
  );
}
