import { useEffect, useRef, useState } from 'react';
import type { BackupImportPreview, LocalVaultProfile } from '../domain/types';

interface VaultSelectorPageProps {
  profiles: LocalVaultProfile[];
  pendingImportPreview: BackupImportPreview | null;
  onGoHome: () => void;
  onUseAnotherAccount: () => void;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [deleteVaultId, setDeleteVaultId] = useState('');
  const [deleteMasterPassword, setDeleteMasterPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function handleImport(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage('');

    if (!file || !masterPassword) {
      setMessage('Selecciona un respaldo e ingresa su contraseña maestra.');
      return;
    }

    setIsWorking(true);
    try {
      await onImportBackup(file, masterPassword);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo importar el respaldo.');
    } finally {
      setIsWorking(false);
    }
  }

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

  function resetImport(): void {
    setFile(null);
    setMasterPassword('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onCancelImport();
  }

  return (
    <main className="auth-screen selector-screen">
      <section className="auth-panel selector-panel">
        <div className="brand-mark">LS</div>
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
        <button className="ghost-button" type="button" onClick={onUseAnotherAccount}>
          Usar otra cuenta
        </button>

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

        <button className="link-button" type="button" onClick={() => setShowImportForm((current) => !current)}>
          {showImportForm ? 'Ocultar importación' : 'Importar un respaldo existente'}
        </button>

        {showImportForm && (
          <form className="form-stack import-form" autoComplete="off" onSubmit={handleImport}>
            <label className="field" htmlFor="selectorBackupFile">
              <span>Archivo de respaldo cifrado</span>
              <input
                ref={fileInputRef}
                id="selectorBackupFile"
                type="file"
                accept="application/json,.json"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="field" htmlFor="selectorBackupPassword">
              <span>Contraseña maestra del respaldo</span>
              <input
                id="selectorBackupPassword"
                type="password"
                value={masterPassword}
                autoComplete="off"
                onChange={(event) => setMasterPassword(event.target.value)}
              />
            </label>
            <button className="secondary-button full" type="submit" disabled={isWorking}>
              Validar respaldo
            </button>
          </form>
        )}

        {message && <p className="form-error">{message}</p>}
      </section>

      {pendingImportPreview && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="selectorImportTitle">
          <div className="modal-panel">
            <h2 id="selectorImportTitle">Importar como nueva bóveda</h2>
            <p>Se creará una bóveda local separada. No se reemplazará ninguna bóveda existente.</p>
            <div className="modal-summary">
              <span>Nombre: {pendingImportPreview.displayName ?? 'Bóveda importada'}</span>
              <span>Elementos: {pendingImportPreview.itemCount}</span>
              <span>Exportado: {new Date(pendingImportPreview.exportedAt).toLocaleString()}</span>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={resetImport}>
                Cancelar
              </button>
              <button className="primary-button" type="button" onClick={onConfirmImportAsNew}>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

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
