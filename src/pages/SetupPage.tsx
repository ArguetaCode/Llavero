import { useEffect, useState } from 'react';
import { BackupImportPanel } from '../components/BackupImportPanel';
import { BrandLogo } from '../components/BrandLogo';
import { SecureField } from '../components/SecureField';
import type { BackupImportPreview } from '../domain/types';
import type { FieldErrors } from '../domain/validation';

interface SetupPageProps {
  onCreateVault: (displayName: string, masterPassword: string) => Promise<void>;
  onBack?: () => void;
  pendingImportPreview: BackupImportPreview | null;
  onImportBackup: (file: File, masterPassword: string) => Promise<BackupImportPreview>;
  onCancelImport: () => void;
  onConfirmImportAsNew: () => Promise<void>;
}

export function SetupPage({
  onCreateVault,
  onBack,
  pendingImportPreview,
  onImportBackup,
  onCancelImport,
  onConfirmImportAsNew,
}: SetupPageProps) {
  const [mode, setMode] = useState<'create' | 'import'>('create');
  const [displayName, setDisplayName] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'displayName' | 'masterPassword' | 'confirmation' | 'form'>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!Object.keys(errors).length) return undefined;
    const timeoutId = window.setTimeout(() => setErrors({}), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [errors]);

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
        <div className="setup-topbar">
          <BrandLogo />
          {onBack && (
            <button className="ghost-button back-button" type="button" onClick={onBack}>
              ← Volver
            </button>
          )}
        </div>
        <p className="eyebrow">Bóveda local</p>
        <h1>{mode === 'create' ? 'Crea tu bóveda' : 'Importa tu bóveda'}</h1>
        <p className="muted">
          {mode === 'create'
            ? 'Elige un nombre y una contraseña maestra para proteger tu llavero en este dispositivo.'
            : 'Selecciona un respaldo cifrado y usa su contraseña maestra para abrirlo aquí.'}
        </p>
        <div className="auth-mode-switch" role="group" aria-label="Modo de bóveda local">
          <button className={mode === 'create' ? 'chip active' : 'chip'} type="button" onClick={() => setMode('create')}>
            Crear bóveda
          </button>
          <button className={mode === 'import' ? 'chip active' : 'chip'} type="button" onClick={() => setMode('import')}>
            Importar bóveda
          </button>
        </div>
        {mode === 'create' ? (
          <form className="form-stack" autoComplete="off" onSubmit={handleSubmit}>
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
              onChange={setMasterPassword}
            />
            <p className="field-hint">Mínimo 10 caracteres. Si la olvidas, no se puede recuperar.</p>
            {errors.masterPassword && <p className="field-error">{errors.masterPassword}</p>}
            <SecureField
              id="confirmation"
              label="Confirmar contraseña"
              value={confirmation}
              onChange={setConfirmation}
            />
            {errors.confirmation && <p className="field-error">{errors.confirmation}</p>}
            {errors.form && <p className="form-error">{errors.form}</p>}
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Protegiendo tu bóveda...' : 'Crear mi bóveda'}
            </button>
          </form>
        ) : (
          <BackupImportPanel
            pendingImportPreview={pendingImportPreview}
            onImportBackup={onImportBackup}
            onCancelImport={onCancelImport}
            onConfirmImportAsNew={onConfirmImportAsNew}
            showToggle={false}
            submitLabel="Importar bóveda"
          />
        )}
      </section>
    </main>
  );
}
