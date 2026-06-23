import { useState } from 'react';
import { SecureField } from '../components/SecureField';
import { StrengthBadge } from '../components/StrengthBadge';
import { generateRandomId } from '../crypto/cryptoService';
import { evaluatePasswordStrength } from '../domain/passwordStrength';
import { generatePassword } from '../domain/passwordGenerator';
import type { PasswordCategory, PasswordEntry, PasswordFormValues } from '../domain/types';
import { type FieldErrors, isValidOptionalWebsite } from '../domain/validation';

const categories: PasswordCategory[] = ['Personal', 'Trabajo', 'Estudio', 'Banco', 'Redes'];

const initialValues: PasswordFormValues = {
  title: '',
  website: '',
  username: '',
  password: '',
  category: 'Personal',
  notes: '',
};

interface AddPasswordPageProps {
  onBack: () => void;
  onSave: (entry: PasswordEntry) => Promise<void>;
}

export function AddPasswordPage({ onBack, onSave }: AddPasswordPageProps) {
  const [values, setValues] = useState<PasswordFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<'title' | 'website' | 'username' | 'password' | 'form'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const strength = evaluatePasswordStrength(values.password);

  function updateValue<K extends keyof PasswordFormValues>(key: K, value: PasswordFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
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
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      await onSave({
        id: generateRandomId(),
        title: values.title.trim(),
        website: values.website.trim(),
        username: values.username.trim(),
        password: values.password,
        category: values.category,
        notes: values.notes.trim(),
        createdAt: now,
        updatedAt: now,
        favorite: false,
        strength,
      });
    } catch {
      setErrors({ form: 'No se pudo guardar la contraseña.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header inline">
        <button className="ghost-button" type="button" onClick={onBack}>
          ← Inicio
        </button>
        <div>
          <p className="eyebrow">Nueva credencial</p>
          <h1>Guardar contraseña</h1>
        </div>
      </header>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor="title">
          <span>Título</span>
          <input id="title" value={values.title} placeholder="Ej. Correo personal" onChange={(event) => updateValue('title', event.target.value)} />
        </label>
        {errors.title && <p className="field-error">{errors.title}</p>}
        <label className="field" htmlFor="website">
          <span>Sitio web</span>
          <input id="website" value={values.website} placeholder="https://ejemplo.com (opcional)" inputMode="url" onChange={(event) => updateValue('website', event.target.value)} />
        </label>
        {errors.website && <p className="field-error">{errors.website}</p>}
        <label className="field" htmlFor="username">
          <span>Usuario</span>
          <input id="username" value={values.username} placeholder="usuario@ejemplo.com" autoComplete="off" onChange={(event) => updateValue('username', event.target.value)} />
        </label>
        {errors.username && <p className="field-error">{errors.username}</p>}
        <SecureField id="password" label="Contraseña" value={values.password} onChange={(value) => updateValue('password', value)} />
        {errors.password && <p className="field-error">{errors.password}</p>}
        <div className="action-row">
          <StrengthBadge strength={strength} />
          <button className="secondary-button" type="button" onClick={() => updateValue('password', generatePassword())}>
            Generar segura
          </button>
        </div>
        <label className="field" htmlFor="category">
          <span>Categoría</span>
          <select
            id="category"
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
        <label className="field" htmlFor="notes">
          <span>Notas</span>
          <textarea id="notes" value={values.notes} onChange={(event) => updateValue('notes', event.target.value)} />
        </label>
        {errors.form && <p className="form-error">{errors.form}</p>}
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Guardando de forma segura...' : 'Guardar en mi bóveda'}
        </button>
      </form>
    </section>
  );
}
