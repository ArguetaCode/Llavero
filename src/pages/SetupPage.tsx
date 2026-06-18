import { useState } from 'react';
import { SecureField } from '../components/SecureField';
import type { FieldErrors } from '../domain/validation';

interface SetupPageProps {
  onCreateVault: (displayName: string, masterPassword: string) => Promise<void>;
  onBack?: () => void;
}

export function SetupPage({ onCreateVault, onBack }: SetupPageProps) {
  const [displayName, setDisplayName] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'displayName' | 'masterPassword' | 'confirmation' | 'form'>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors: FieldErrors<'displayName' | 'masterPassword' | 'confirmation' | 'form'> = {};

    if (!displayName.trim()) {
      nextErrors.displayName = 'Escribe un nombre para esta bóveda local.';
    }

    if (masterPassword.length < 10) {
      nextErrors.masterPassword = 'Usa una contraseña maestra de al menos 10 caracteres.';
    }

    if (!confirmation) {
      nextErrors.confirmation = 'Confirma la contraseña maestra.';
    } else if (masterPassword !== confirmation) {
      nextErrors.confirmation = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await onCreateVault(displayName, masterPassword);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'No se pudo crear la bóveda.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-mark">LS</div>
        <h1>Llavero Seguro</h1>
        <p className="muted">
          Tu contraseña maestra abre una bóveda cifrada guardada solo en este navegador. No podemos recuperarla si la pierdes.
        </p>
        <ul className="onboarding-checklist">
          <li>Recuerda una contraseña maestra de al menos 10 caracteres.</li>
          <li>Guarda tus datos cifrados localmente en este dispositivo.</li>
          <li>Exporta respaldos cifrados regularmente desde Seguridad.</li>
        </ul>
        <form className="form-stack" onSubmit={handleSubmit}>
          {onBack && (
            <button className="ghost-button" type="button" onClick={onBack}>
              Volver
            </button>
          )}
          <label className="field" htmlFor="displayName">
            <span>Nombre de bóveda local</span>
            <input
              id="displayName"
              value={displayName}
              placeholder="Personal, Trabajo, Familia"
              autoComplete="off"
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          {errors.displayName && <p className="field-error">{errors.displayName}</p>}
          <SecureField
            id="masterPassword"
            label="Contraseña maestra"
            value={masterPassword}
            autoComplete="new-password"
            onChange={setMasterPassword}
          />
          {errors.masterPassword && <p className="field-error">{errors.masterPassword}</p>}
          <SecureField
            id="confirmation"
            label="Confirmar contraseña"
            value={confirmation}
            autoComplete="new-password"
            onChange={setConfirmation}
          />
          {errors.confirmation && <p className="field-error">{errors.confirmation}</p>}
          {errors.form && <p className="form-error">{errors.form}</p>}
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Creando...' : 'Crear bóveda local'}
          </button>
        </form>
      </section>
    </main>
  );
}
