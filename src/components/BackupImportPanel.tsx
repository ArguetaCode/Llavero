import { useEffect, useRef, useState } from 'react';
import type { BackupImportPreview } from '../domain/types';

interface BackupImportPanelProps {
  pendingImportPreview: BackupImportPreview | null;
  onImportBackup: (file: File, masterPassword: string) => Promise<BackupImportPreview>;
  onCancelImport: () => void;
  onConfirmImportAsNew: () => Promise<void>;
  showToggle?: boolean;
  submitLabel?: string;
}

export function BackupImportPanel({
  pendingImportPreview,
  onImportBackup,
  onCancelImport,
  onConfirmImportAsNew,
  showToggle = true,
  submitLabel = 'Validar respaldo',
}: BackupImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [showImportForm, setShowImportForm] = useState(!showToggle);

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

  function resetImport(): void {
    setFile(null);
    setMasterPassword('');
    setMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onCancelImport();
  }

  return (
    <>
      <section className="import-panel" aria-label="Importar bóveda existente">
        {showToggle && (
          <>
            <button className="secondary-button full" type="button" onClick={() => setShowImportForm((current) => !current)}>
              {showImportForm ? 'Ocultar importación' : 'Importar bóveda'}
            </button>
            <p className="field-hint">Restaura un respaldo cifrado de Llavero Seguro.</p>
          </>
        )}

        {showImportForm && (
          <form className="form-stack import-form" autoComplete="off" onSubmit={handleImport}>
            <label className="backup-file-picker" htmlFor="backupImportFile">
              <span>{file ? file.name : 'Seleccionar respaldo cifrado'}</span>
              <small>{file ? 'Archivo listo para validar' : 'Formato .json exportado desde Llavero Seguro'}</small>
              <input
                ref={fileInputRef}
                id="backupImportFile"
                type="file"
                accept="application/json,.json"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="field" htmlFor="backupImportPassword">
              <span>Contraseña maestra del respaldo</span>
              <input
                id="backupImportPassword"
                type="password"
                value={masterPassword}
                autoComplete="off"
                onChange={(event) => setMasterPassword(event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit" disabled={isWorking}>
              {isWorking ? 'Validando...' : submitLabel}
            </button>
          </form>
        )}

        {message && <p className="form-error">{message}</p>}
      </section>

      {pendingImportPreview && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="backupImportTitle">
          <div className="modal-panel">
            <h2 id="backupImportTitle">Importar como nueva bóveda</h2>
            <p>Se creará una bóveda local separada. No se reemplazará ninguna bóveda existente.</p>
            <div className="modal-summary">
              <span>Nombre: {pendingImportPreview.displayName ?? 'Bóveda importada'}</span>
              <span>Elementos: {pendingImportPreview.itemCount}</span>
              <span>Exportado: {new Date(pendingImportPreview.exportedAt).toLocaleString()}</span>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" type="button" disabled={isWorking} onClick={resetImport}>
                Cancelar
              </button>
              <button className="primary-button" type="button" disabled={isWorking} onClick={onConfirmImportAsNew}>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
