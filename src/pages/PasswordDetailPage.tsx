import { useState } from 'react';
import { SecureField } from '../components/SecureField';
import { StrengthBadge } from '../components/StrengthBadge';
import { DangerModal } from '../components/DangerModal';
import { evaluatePasswordStrength } from '../domain/passwordStrength';
import { generatePassword } from '../domain/passwordGenerator';
import type { PasswordCategory, PasswordEntry, PasswordFormValues } from '../domain/types';
import { type FieldErrors, isValidOptionalWebsite } from '../domain/validation';

const categories: PasswordCategory[] = ['Personal', 'Trabajo', 'Estudio', 'Banco', 'Redes'];

interface PasswordDetailPageProps {
  entry: PasswordEntry;
  repeatedCount: number;
  onBack: () => void;
  onSave: (entry: PasswordEntry) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}

export function PasswordDetailPage({ entry, repeatedCount, onBack, onSave, onDelete }: PasswordDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errors, setErrors] = useState<FieldErrors<'title' | 'website' | 'username' | 'password' | 'form'>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [values, setValues] = useState<PasswordFormValues>({
    title: entry.title,
    website: entry.website,
    username: entry.username,
    password: entry.password,
    category: entry.category,
    notes: entry.notes,
  });

  function updateValue<K extends keyof PasswordFormValues>(key: K, value: PasswordFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function copyToClipboard(value: string, label: string): Promise<void> {
    if (!value) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(value);
      setIsPasswordVisible(false);
      setToast({
        type: 'success',
        message:
          label === 'Contraseña'
            ? 'Contraseña copiada. Limpia el portapapeles manualmente cuando termines.'
            : `${label} copiado.`,
      });
    } catch {
      setToast({ type: 'error', message: 'No se pudo copiar. Revisa los permisos del navegador.' });
    }

    window.setTimeout(() => setToast(null), 2600);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors: FieldErrors<'title' | 'website' | 'username' | 'password' | 'form'> = {};

    if (!values.title.trim()) nextErrors.title = 'El título es obligatorio.';
    if (!values.username.trim()) nextErrors.username = 'El usuario es obligatorio.';
    if (!values.password) nextErrors.password = 'La contraseña es obligatoria.';
    if (!isValidOptionalWebsite(values.website)) nextErrors.website = 'Ingresa una URL válida.';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    try {
      await onSave({
        ...entry,
        title: values.title.trim(),
        website: values.website.trim(),
        username: values.username.trim(),
        password: values.password,
        category: values.category,
        notes: values.notes.trim(),
        updatedAt: new Date().toISOString(),
        strength: evaluatePasswordStrength(values.password),
      });
      setIsEditing(false);
    } catch {
      setErrors({ form: 'No se pudo actualizar el registro.' });
    }
  }

  if (isEditing) {
    return (
      <div className="credential-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="editCredentialTitle">
        <section className="credential-modal">
          <div className="sheet-handle" aria-hidden="true" />
          <header className="credential-modal-header">
            <div>
              <p className="eyebrow">Editar credencial</p>
              <h1 id="editCredentialTitle">Editar</h1>
            </div>
            <button className="sheet-close-button" type="button" aria-label="Cerrar" onClick={onBack}>
              ×
            </button>
        </header>
          <form className="form-stack credential-form" onSubmit={handleSave}>
          <label className="field" htmlFor="editTitle">
            <span>Título</span>
            <input id="editTitle" value={values.title} onChange={(event) => updateValue('title', event.target.value)} />
          </label>
          {errors.title && <p className="field-error">{errors.title}</p>}
          <label className="field" htmlFor="editWebsite">
            <span>Sitio web</span>
            <input id="editWebsite" value={values.website} onChange={(event) => updateValue('website', event.target.value)} />
          </label>
          {errors.website && <p className="field-error">{errors.website}</p>}
          <label className="field" htmlFor="editUsername">
            <span>Usuario</span>
            <input id="editUsername" value={values.username} onChange={(event) => updateValue('username', event.target.value)} />
          </label>
          {errors.username && <p className="field-error">{errors.username}</p>}
          <SecureField
            id="editPassword"
            label="Contraseña"
            value={values.password}
            placeholder="Escribe o genera una contraseña"
            onChange={(value) => updateValue('password', value)}
          />
          <p className="field-hint">Recomendado: 12+ caracteres, con mayúsculas, números y símbolos.</p>
          {errors.password && <p className="field-error">{errors.password}</p>}
          <button className="secondary-button full" type="button" onClick={() => updateValue('password', generatePassword())}>
            Regenerar contraseña
          </button>
          <label className="field" htmlFor="editCategory">
            <span>Categoría</span>
            <select
              id="editCategory"
              value={values.category}
              onChange={(event) => updateValue('category', event.target.value as PasswordCategory)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="editNotes">
            <span>Notas</span>
            <textarea id="editNotes" value={values.notes} onChange={(event) => updateValue('notes', event.target.value)} />
          </label>
          {errors.form && <p className="form-error">{errors.form}</p>}
            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={() => setIsEditing(false)}>
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                Guardar
              </button>
            </div>
        </form>
        </section>
      </div>
    );
  }

  return (
    <div className="credential-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="credentialDetailTitle">
      <section className="credential-modal detail-sheet">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="credential-modal-header">
          <div>
            <p className="eyebrow">Detalle</p>
            <h1 id="credentialDetailTitle">{entry.title}</h1>
          </div>
          <button className="sheet-close-button" type="button" aria-label="Cerrar" onClick={onBack}>
            ×
          </button>
        </header>
      <article className="detail-panel detail-sheet-content">
        <div className="detail-title">
          <div>
            <p className="eyebrow">{entry.category}</p>
            <h2>{entry.title}</h2>
            <p>{entry.website || 'Sin sitio web'}</p>
          </div>
          <StrengthBadge strength={entry.strength} />
        </div>
        <div className="detail-row action-detail-row">
          <div>
            <span>Usuario</span>
            <strong>{entry.username || 'Sin usuario'}</strong>
          </div>
          {entry.username && (
            <button className="mini-button" type="button" onClick={() => copyToClipboard(entry.username, 'Usuario')}>
              Copiar
            </button>
          )}
        </div>
        <div className="warning-list">
          {entry.strength === 'weak' && <p className="inline-warning block">Contraseña débil.</p>}
          {repeatedCount > 1 && <p className="inline-warning block">Esta contraseña se repite en {repeatedCount} registros.</p>}
          {!entry.website.trim() && <p className="inline-warning block">Este registro no tiene sitio web.</p>}
        </div>
        <div className="detail-row action-detail-row">
          <div>
            <span>Contraseña</span>
            <strong>{isPasswordVisible ? entry.password : '••••••••••••'}</strong>
          </div>
          <div className="mini-actions">
            <button className="mini-button" type="button" onClick={() => setIsPasswordVisible((current) => !current)}>
              {isPasswordVisible ? 'Ocultar' : 'Ver'}
            </button>
            <button className="mini-button" type="button" onClick={() => copyToClipboard(entry.password, 'Contraseña')}>
              Copiar
            </button>
          </div>
        </div>
        {entry.notes && (
          <div className="notes-box">
            <span>Notas</span>
            <p>{entry.notes}</p>
          </div>
        )}
        <p className="muted small">Actualizada: {new Date(entry.updatedAt).toLocaleString()}</p>
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => setIsEditing(true)}>
            Editar registro
          </button>
          <button className="danger-button" type="button" onClick={() => setIsDeleteModalOpen(true)}>
            Eliminar
          </button>
        </div>
      </article>
      {isDeleteModalOpen && (
        <DangerModal
          title="Eliminar contraseña"
          description="Esta acción no se puede deshacer. Se eliminará este registro y la bóveda se volverá a cifrar."
          confirmLabel="Eliminar"
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => onDelete(entry.id)}
        />
      )}
      </section>
    </div>
  );
}
