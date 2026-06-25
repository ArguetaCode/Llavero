import { useEffect, useState } from 'react';
import { BackupImportPanel } from '../components/BackupImportPanel';
import { BrandLogo } from '../components/BrandLogo';
import type { BackupImportPreview, LocalVaultProfile } from '../domain/types';

interface VaultSelectorPageProps {
  profiles: LocalVaultProfile[];
  pendingImportPreview: BackupImportPreview | null;
  onGoHome: () => void;
  onUseAnotherAccount?: () => void;
  onCreateNew: () => void;
  onDeleteProfile: (vaultId: string, masterPassword: string) => Promise<void>;
  onImportBackup: (file: File, masterPassword: string) => Promise<BackupImportPreview>;
  onCancelImport: () => void;
  onConfirmImportAsNew: () => Promise<void>;
  onSelectProfile: (vaultId: string) => void;
}

export function VaultSelectorPage({
  profiles,
  pendingImportPreview,
  onGoHome,
  onUseAnotherAccount,
  onCreateNew,
  onDeleteProfile,
  onImportBackup,
  onCancelImport,
  onConfirmImportAsNew,
  onSelectProfile,
}: VaultSelectorPageProps) {
  const [deleteVaultId, setDeleteVaultId] = useState('');
  const [deleteMasterPassword, setDeleteMasterPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function handleDelete(): Promise<void> {
    if (!deleteVaultId) return;
    setIsWorking(true);
    try {
      await onDeleteProfile(deleteVaultId, deleteMasterPassword);
      setDeleteVaultId('');
      setDeleteMasterPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la bóveda local.');
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <main className="auth-screen selector-screen">
      <section className="auth-panel selector-panel">
        <BrandLogo />
        <div className="selector-heading">
          <div>
            <p className="eyebrow">Elige dónde entrar</p>
            <h1>Bóvedas locales</h1>
          </div>
          <button className="ghost-button" type="button" onClick={onGoHome}>
            ← Inicio
          </button>
        </div>
        <p className="muted">Cada bóveda local tiene su propia contraseña maestra y datos cifrados separados.</p>
        {onUseAnotherAccount && (
          <button className="ghost-button" type="button" onClick={onUseAnotherAccount}>
            Usar otra cuenta
          </button>
        )}

        <div className="profile-list">
          {profiles.map((profile) => (
            <article className="profile-card" key={profile.vaultId}>
              <button type="button" onClick={() => onSelectProfile(profile.vaultId)}>
                <strong>{profile.displayName}</strong>
                <span>Actualizada: {new Date(profile.updatedAt).toLocaleString()}</span>
                {profile.lastUnlockedAt && <span>Último acceso: {new Date(profile.lastUnlockedAt).toLocaleString()}</span>}
                <span className="profile-open-label">Abrir bóveda →</span>
              </button>
              <button className="danger-button" type="button" onClick={() => setDeleteVaultId(profile.vaultId)}>
                Eliminar
              </button>
            </article>
          ))}
          {!profiles.length && (
            <div className="empty-state">
              <h2>No hay bóvedas locales</h2>
              <p>Crea una bóveda local o importa un respaldo cifrado para empezar.</p>
            </div>
          )}
        </div>

        {!profiles.length && (
          <button className="primary-button" type="button" onClick={onCreateNew}>
            Crear mi bóveda
          </button>
        )}

        <BackupImportPanel
          pendingImportPreview={pendingImportPreview}
          onImportBackup={onImportBackup}
          onCancelImport={onCancelImport}
          onConfirmImportAsNew={onConfirmImportAsNew}
        />

        {message && <p className="form-error">{message}</p>}
      </section>

      {deleteVaultId && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="selectorDeleteTitle">
          <div className="modal-panel">
            <h2 id="selectorDeleteTitle">Eliminar bóveda local</h2>
            <p>Esta acción no se puede deshacer. Ingresa la contraseña maestra de esta bóveda para eliminarla.</p>
            <label className="field" htmlFor="selectorDeleteMasterPassword">
              <span>Contraseña maestra</span>
              <input
                id="selectorDeleteMasterPassword"
                type="password"
                value={deleteMasterPassword}
                autoComplete="off"
                onChange={(event) => setDeleteMasterPassword(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setDeleteVaultId('');
                  setDeleteMasterPassword('');
                }}
              >
                Cancelar
              </button>
              <button className="danger-button" type="button" disabled={isWorking} onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
