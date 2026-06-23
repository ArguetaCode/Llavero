import { useMemo, useRef, useState } from 'react';
import type { BackupImportPreview, PasswordEntry } from '../domain/types';
import type { VaultAudit } from '../domain/vaultAudit';
import { Toast, type ToastMessage } from '../components/Toast';
import { APP_VERSION } from '../app/appInfo';
import type { LoginRemoteInput, RegisterRemoteInput, RemoteUser } from '../api/authApi';
import type { RemoteVault } from '../api/vaultSyncApi';

interface SecurityPageProps {
  autoLockMinutes: number;
  audit: VaultAudit | null;
  activeProfileName: string;
  activeProfileVaultId: string;
  activeProfileUpdatedAt: string;
  activeProfileRemoteVaultId?: string;
  activeProfileRemoteDisplayName?: string;
  activeProfileLastRemoteSyncAt?: string;
  activeProfileLastRemoteUploadAt?: string;
  activeProfileLastRemoteDownloadAt?: string;
  entries: PasswordEntry[];
  isRemoteAuthenticated: boolean;
  lastManualDownloadAt: string | null;
  lastManualUploadAt: string | null;
  pendingImportPreview: BackupImportPreview | null;
  remoteUser: RemoteUser | null;
  remoteVaults: RemoteVault[];
  vaultUpdatedAt: string;
  onAutoLockChange: (minutes: number) => void;
  onChangeMasterPassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  onCancelBackupImport: () => void;
  onConfirmBackupImport: (mode: 'replace-current' | 'new') => Promise<void>;
  onDeleteLocalVault: (confirmation: string) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onFetchRemoteMe: () => Promise<void>;
  onListRemoteVaults: () => Promise<RemoteVault[]>;
  onLoginRemote: (input: LoginRemoteInput) => Promise<void>;
  onLogoutRemote: () => void;
  onRegisterRemote: (input: RegisterRemoteInput) => Promise<void>;
  onLock: () => void;
  onHome: () => void;
  onSwitchVault: () => void;
  onValidateRemoteVaultImport: (remoteVaultId: string, masterPassword: string) => Promise<BackupImportPreview>;
  onValidateBackupImport: (file: File, masterPassword: string) => Promise<BackupImportPreview>;
}

export function SecurityPage({
  autoLockMinutes,
  audit,
  activeProfileName,
  activeProfileVaultId,
  activeProfileUpdatedAt,
  activeProfileRemoteVaultId,
  activeProfileRemoteDisplayName,
  activeProfileLastRemoteSyncAt,
  activeProfileLastRemoteUploadAt,
  activeProfileLastRemoteDownloadAt,
  entries,
  isRemoteAuthenticated,
  lastManualDownloadAt,
  lastManualUploadAt,
  pendingImportPreview,
  remoteUser,
  remoteVaults,
  vaultUpdatedAt,
  onAutoLockChange,
  onChangeMasterPassword,
  onCancelBackupImport,
  onConfirmBackupImport,
  onDeleteLocalVault,
  onExportBackup,
  onFetchRemoteMe,
  onListRemoteVaults,
  onLoginRemote,
  onLogoutRemote,
  onRegisterRemote,
  onLock,
  onHome,
  onSwitchVault,
  onValidateRemoteVaultImport,
  onValidateBackupImport,
}: SecurityPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupMessage, setBackupMessage] = useState<ToastMessage | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [currentMasterPassword, setCurrentMasterPassword] = useState('');
  const [nextMasterPassword, setNextMasterPassword] = useState('');
  const [nextMasterPasswordConfirmation, setNextMasterPasswordConfirmation] = useState('');
  const [masterPasswordMessage, setMasterPasswordMessage] = useState<ToastMessage | null>(null);
  const [remoteMode, setRemoteMode] = useState<'login' | 'register'>('login');
  const [remoteEmail, setRemoteEmail] = useState('');
  const [remoteDisplayName, setRemoteDisplayName] = useState('');
  const [remotePassword, setRemotePassword] = useState('');
  const [remoteMessage, setRemoteMessage] = useState<ToastMessage | null>(null);
  const [selectedRemoteVaultId, setSelectedRemoteVaultId] = useState('');
  const [remoteMasterPassword, setRemoteMasterPassword] = useState('');
  const [replaceConfirmation, setReplaceConfirmation] = useState('');

  const stats = useMemo(() => {
    const passwordCounts = new Map<string, number>();
    entries.forEach((entry) => {
      passwordCounts.set(entry.password, (passwordCounts.get(entry.password) ?? 0) + 1);
    });

    return {
      total: entries.length,
      weak: entries.filter((entry) => entry.strength === 'weak').length,
      repeated: entries.filter((entry) => (passwordCounts.get(entry.password) ?? 0) > 1).length,
    };
  }, [entries]);
  const displayedAudit = audit ?? {
    total: stats.total,
    weak: stats.weak,
    medium: 0,
    strong: 0,
    repeated: stats.repeated,
    missingWebsite: 0,
    favorites: 0,
    updatedAt: vaultUpdatedAt,
    repeatedCountsByEntryId: {},
  };

  async function handleExportBackup(): Promise<void> {
    setBackupMessage(null);
    setIsWorking(true);

    try {
      await onExportBackup();
      setBackupMessage({ type: 'success', message: 'Respaldo cifrado descargado.' });
    } catch (error) {
      setBackupMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo exportar el respaldo.',
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleValidateImport(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBackupMessage(null);

    if (!selectedFile) {
      setBackupMessage({ type: 'error', message: 'Selecciona un archivo de respaldo.' });
      return;
    }

    if (!backupPassword) {
      setBackupMessage({ type: 'error', message: 'Ingresa la contraseña maestra del respaldo.' });
      return;
    }

    setIsWorking(true);
    try {
      await onValidateBackupImport(selectedFile, backupPassword);
      setBackupMessage({ type: 'success', message: 'Respaldo validado. Confirma el reemplazo para importarlo.' });
    } catch (error) {
      setBackupMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo validar el respaldo.',
      });
    } finally {
      setIsWorking(false);
    }
  }

  function handleCancelImport(): void {
    onCancelBackupImport();
    setBackupPassword('');
    setSelectedFile(null);
    setReplaceConfirmation('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleConfirmImport(mode: 'replace-current' | 'new'): Promise<void> {
    setBackupMessage(null);
    setRemoteMessage(null);

    if (mode === 'replace-current' && replaceConfirmation !== 'REEMPLAZAR') {
      setBackupMessage({ type: 'error', message: 'Escribe REEMPLAZAR para confirmar el reemplazo.' });
      return;
    }

    setIsWorking(true);
    try {
      await onConfirmBackupImport(mode);
      setReplaceConfirmation('');
      setBackupPassword('');
      setSelectedFile(null);
      setRemoteMasterPassword('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setBackupMessage({
        type: 'success',
        message: mode === 'new' ? 'Bóveda importada como perfil local separado.' : 'Bóveda activa reemplazada.',
      });
    } catch (error) {
      setBackupMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo confirmar la importación.',
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDeleteLocalVault(): Promise<void> {
    setDeleteError('');
    setIsWorking(true);

    try {
      await onDeleteLocalVault(deleteConfirmation);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudo eliminar la bóveda local.');
      setIsWorking(false);
    }
  }

  async function handleChangeMasterPassword(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMasterPasswordMessage(null);

    if (!currentMasterPassword) {
      setMasterPasswordMessage({ type: 'error', message: 'Ingresa la contraseña maestra actual.' });
      return;
    }

    if (nextMasterPassword.length < 10) {
      setMasterPasswordMessage({ type: 'error', message: 'La nueva contraseña maestra debe tener al menos 10 caracteres.' });
      return;
    }

    if (nextMasterPassword !== nextMasterPasswordConfirmation) {
      setMasterPasswordMessage({ type: 'error', message: 'La confirmación no coincide.' });
      return;
    }

    setIsWorking(true);
    try {
      await onChangeMasterPassword(currentMasterPassword, nextMasterPassword);
      setCurrentMasterPassword('');
      setNextMasterPassword('');
      setNextMasterPasswordConfirmation('');
      setMasterPasswordMessage({ type: 'success', message: 'Contraseña maestra cambiada. La bóveda fue re-cifrada.' });
    } catch (error) {
      setMasterPasswordMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña maestra.',
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleRemoteAuth(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRemoteMessage(null);

    if (!remoteEmail.trim() || !remotePassword) {
      setRemoteMessage({ type: 'error', message: 'Ingresa email y contraseña de cuenta remota.' });
      return;
    }
    if (remoteMode === 'register' && !remoteDisplayName.trim()) {
      setRemoteMessage({ type: 'error', message: 'Ingresa un nombre para la cuenta remota.' });
      return;
    }
    if (remoteMode === 'register' && remotePassword.length < 10) {
      setRemoteMessage({ type: 'error', message: 'La contraseña de cuenta remota debe tener al menos 10 caracteres.' });
      return;
    }

    setIsWorking(true);
    try {
      if (remoteMode === 'register') {
        await onRegisterRemote({ email: remoteEmail, displayName: remoteDisplayName, password: remotePassword });
        setRemoteDisplayName('');
      } else {
        await onLoginRemote({ email: remoteEmail, password: remotePassword });
      }
      setRemotePassword('');
      setRemoteMessage({ type: 'success', message: remoteMode === 'register' ? 'Cuenta remota creada.' : 'Sesión remota iniciada.' });
    } catch (error) {
      setRemoteMessage({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo completar la autenticación remota.' });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleRefreshRemoteSession(): Promise<void> {
    setRemoteMessage(null);
    setIsWorking(true);
    try {
      await onFetchRemoteMe();
      setRemoteMessage({ type: 'success', message: 'Sesión remota vigente.' });
    } catch (error) {
      setRemoteMessage({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo validar la sesión remota.' });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleListRemoteVaults(): Promise<void> {
    setRemoteMessage(null);
    setIsWorking(true);
    try {
      const vaults = await onListRemoteVaults();
      setRemoteMessage({ type: 'success', message: vaults.length ? 'Bóvedas remotas actualizadas.' : 'No hay bóvedas remotas todavía.' });
    } catch (error) {
      setRemoteMessage({ type: 'error', message: error instanceof Error ? error.message : 'No se pudieron listar las bóvedas remotas.' });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleValidateRemoteImport(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRemoteMessage(null);

    if (!selectedRemoteVaultId || !remoteMasterPassword) {
      setRemoteMessage({ type: 'error', message: 'Selecciona una bóveda remota e ingresa su contraseña maestra.' });
      return;
    }

    setIsWorking(true);
    try {
      await onValidateRemoteVaultImport(selectedRemoteVaultId, remoteMasterPassword);
      setRemoteMasterPassword('');
      setRemoteMessage({ type: 'success', message: 'Bóveda remota descifrada localmente. Confirma cómo importarla.' });
    } catch (error) {
      setRemoteMessage({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo descifrar la bóveda remota.' });
    } finally {
      setIsWorking(false);
    }
  }

  function formatOptionalDate(value: string | null): string {
    return value ? new Date(value).toLocaleString() : 'Pendiente';
  }

  const selectedRemoteVault = remoteVaults.find((remoteVault) => remoteVault.id === selectedRemoteVaultId) ?? null;
  const pendingRemoteDisplayName = pendingImportPreview?.remoteDisplayName ?? pendingImportPreview?.displayName ?? 'Bóveda importada';
  const hasPotentialConflict =
    selectedRemoteVault && activeProfileUpdatedAt && selectedRemoteVault.updatedAt !== activeProfileUpdatedAt;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Estado general</p>
          <h1>Seguridad</h1>
        </div>
        <button className="ghost-button" type="button" onClick={onHome}>
          ← Inicio
        </button>
      </header>

      <section className="settings-panel settings-section">
        <div className="section-heading">
          <h2>Seguridad</h2>
          <span className="status-pill">Auto: {autoLockMinutes} min</span>
        </div>
        <p className="muted small">Bóveda activa: {activeProfileName}</p>
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total</span>
            <strong>{displayedAudit.total}</strong>
          </div>
          <div className="stat-card warning">
            <span>Débiles</span>
            <strong>{displayedAudit.weak}</strong>
          </div>
          <div className="stat-card danger">
            <span>Repetidas</span>
            <strong>{displayedAudit.repeated}</strong>
          </div>
          <div className="stat-card">
            <span>Medias</span>
            <strong>{displayedAudit.medium}</strong>
          </div>
          <div className="stat-card">
            <span>Fuertes</span>
            <strong>{displayedAudit.strong}</strong>
          </div>
          <div className="stat-card warning">
            <span>Sin sitio</span>
            <strong>{displayedAudit.missingWebsite}</strong>
          </div>
          <div className="stat-card">
            <span>Favoritos</span>
            <strong>{displayedAudit.favorites}</strong>
          </div>
        </div>
        <p className="muted small">Última actualización: {new Date(displayedAudit.updatedAt || vaultUpdatedAt).toLocaleString()}</p>
        <div className="recommendation-list">
          {displayedAudit.weak > 0 && <p>Cambia las contraseñas débiles.</p>}
          {displayedAudit.repeated > 0 && <p>Evita reutilizar la misma contraseña.</p>}
          <p>Exporta un respaldo cifrado regularmente.</p>
        </div>
        <label className="field" htmlFor="autoLock">
          <span>Bloqueo automático</span>
          <select
            id="autoLock"
            value={String(autoLockMinutes)}
            onChange={(event) => onAutoLockChange(Number(event.target.value))}
          >
            <option value="1">1 minuto</option>
            <option value="2">2 minutos</option>
            <option value="5">5 minutos</option>
            <option value="15">15 minutos</option>
            <option value="30">30 minutos</option>
          </select>
        </label>
        <button className="secondary-button full" type="button" onClick={onLock}>
          Bloquear bóveda
        </button>
        <button className="secondary-button full" type="button" onClick={onSwitchVault}>
          Cambiar bóveda
        </button>
      </section>

      <section className="settings-panel settings-section">
        <h2>Cambiar contraseña maestra</h2>
        <p className="muted">Esto re-cifra toda la bóveda con un nuevo salt e IV. La bóveda seguirá desbloqueada si el cambio termina bien.</p>
        <form className="form-stack" onSubmit={handleChangeMasterPassword}>
          <label className="field" htmlFor="currentMasterPassword">
            <span>Contraseña actual</span>
            <input
              id="currentMasterPassword"
              type="password"
              value={currentMasterPassword}
              autoComplete="current-password"
              onChange={(event) => setCurrentMasterPassword(event.target.value)}
            />
          </label>
          <label className="field" htmlFor="nextMasterPassword">
            <span>Nueva contraseña</span>
            <input
              id="nextMasterPassword"
              type="password"
              value={nextMasterPassword}
              autoComplete="new-password"
              onChange={(event) => setNextMasterPassword(event.target.value)}
            />
            <small className="field-hint">Mínimo 10 caracteres. Esta contraseña abre tu bóveda local.</small>
          </label>
          <label className="field" htmlFor="nextMasterPasswordConfirmation">
            <span>Confirmar nueva contraseña</span>
            <input
              id="nextMasterPasswordConfirmation"
              type="password"
              value={nextMasterPasswordConfirmation}
              autoComplete="new-password"
              onChange={(event) => setNextMasterPasswordConfirmation(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={isWorking}>
            Cambiar contraseña maestra
          </button>
        </form>
      </section>

      <section className="settings-panel settings-section">
        <div className="section-heading">
          <h2>Cuenta remota</h2>
          <span className="status-pill">{isRemoteAuthenticated ? 'Conectado' : 'Modo local'}</span>
        </div>
        <p className="muted">
          Esta contraseña es para tu cuenta remota, no es tu contraseña maestra. Tu contraseña maestra nunca se envía al servidor.
        </p>
        {remoteUser ? (
          <div className="modal-summary">
            <span>Conectado como: {remoteUser.email}</span>
            <span>Nombre: {remoteUser.displayName}</span>
            <span>La sesión permanece activa en este dispositivo hasta cerrar sesión o vencer.</span>
          </div>
        ) : (
          <form className="form-stack" onSubmit={handleRemoteAuth}>
            <label className="field" htmlFor="remoteMode">
              <span>Acción</span>
              <select id="remoteMode" value={remoteMode} onChange={(event) => setRemoteMode(event.target.value as 'login' | 'register')}>
                <option value="login">Iniciar sesión</option>
                <option value="register">Crear cuenta remota</option>
              </select>
            </label>
            {remoteMode === 'register' && (
              <label className="field" htmlFor="remoteDisplayName">
                <span>Nombre remoto</span>
                <input
                  id="remoteDisplayName"
                  value={remoteDisplayName}
                  autoComplete="name"
                  onChange={(event) => setRemoteDisplayName(event.target.value)}
                />
              </label>
            )}
            <label className="field" htmlFor="remoteEmail">
              <span>Email</span>
              <input
                id="remoteEmail"
                type="email"
                value={remoteEmail}
                autoComplete="email"
                onChange={(event) => setRemoteEmail(event.target.value)}
              />
            </label>
            <label className="field" htmlFor="remotePassword">
              <span>Contraseña de cuenta remota</span>
              <input
                id="remotePassword"
                type="password"
                value={remotePassword}
                minLength={remoteMode === 'register' ? 10 : undefined}
                autoComplete={remoteMode === 'register' ? 'new-password' : 'current-password'}
                onChange={(event) => setRemotePassword(event.target.value)}
              />
              {remoteMode === 'register' && (
                <small className="field-hint">Mínimo 10 caracteres. No es la contraseña maestra de tu bóveda.</small>
              )}
            </label>
            <button className="primary-button" type="submit" disabled={isWorking}>
              {remoteMode === 'register' ? 'Crear cuenta remota' : 'Iniciar sesión remota'}
            </button>
          </form>
        )}
        {remoteUser && (
          <div className="modal-actions">
            <button className="secondary-button" type="button" disabled={isWorking} onClick={handleRefreshRemoteSession}>
              Verificar sesión
            </button>
            <button className="ghost-button" type="button" onClick={onLogoutRemote}>
              Cerrar sesión
            </button>
          </div>
        )}
      </section>

      <section className="settings-panel settings-section">
        <div className="section-heading">
          <h2>Sincronización cifrada</h2>
          <span className="status-pill">{isRemoteAuthenticated ? 'Automática' : 'No conectado'}</span>
        </div>
        <p className="muted">
          Tu cuenta mantiene una sola bóveda. Al iniciar sesión se compara con este dispositivo y cada cambio posterior se respalda automáticamente.
        </p>
        <div className="modal-summary">
          <span>Estado: {remoteUser ? `Conectado como ${remoteUser.email}` : 'Modo local'}</span>
          <span>Remota vinculada: {activeProfileRemoteDisplayName ?? activeProfileRemoteVaultId ?? 'Sin vínculo remoto'}</span>
          <span>Última sync local: {formatOptionalDate(activeProfileLastRemoteSyncAt ?? null)}</span>
          <span>Última subida local: {formatOptionalDate(activeProfileLastRemoteUploadAt ?? lastManualUploadAt)}</span>
          <span>Última descarga local: {formatOptionalDate(activeProfileLastRemoteDownloadAt ?? lastManualDownloadAt)}</span>
        </div>
        <button className="secondary-button full" type="button" disabled={isWorking || !isRemoteAuthenticated} onClick={handleListRemoteVaults}>
          Comprobar estado remoto
        </button>
        {remoteVaults.length > 0 && (
          <form className="form-stack import-form" onSubmit={handleValidateRemoteImport}>
            <label className="field" htmlFor="remoteVault">
              <span>Bóveda remota</span>
              <select id="remoteVault" value={selectedRemoteVaultId} onChange={(event) => setSelectedRemoteVaultId(event.target.value)}>
                <option value="">Seleccionar</option>
                {remoteVaults.map((remoteVault) => (
                  <option key={remoteVault.id} value={remoteVault.id}>
                    {remoteVault.displayName} - v{remoteVault.payloadVersion}
                  </option>
                ))}
              </select>
            </label>
            <div className="remote-vault-list">
              {remoteVaults.map((remoteVault) => {
                const matchesActiveVault =
                  remoteVault.id === activeProfileRemoteVaultId || remoteVault.clientVaultId === activeProfileVaultId;
                return (
                  <article className="remote-vault-item" key={remoteVault.id}>
                    <strong>{remoteVault.displayName}</strong>
                    <span>Actualizada: {new Date(remoteVault.updatedAt).toLocaleString()}</span>
                    <span>Payload: v{remoteVault.payloadVersion}</span>
                    <span>{matchesActiveVault ? 'Coincide con la bóveda local activa' : 'Perfil remoto separado'}</span>
                  </article>
                );
              })}
            </div>
            {hasPotentialConflict && (
              <p className="form-error">Puede existir una versión más reciente. Revisa antes de reemplazar.</p>
            )}
            <label className="field" htmlFor="remoteMasterPassword">
              <span>Contraseña maestra de esa bóveda</span>
              <input
                id="remoteMasterPassword"
                type="password"
                value={remoteMasterPassword}
                autoComplete="current-password"
                onChange={(event) => setRemoteMasterPassword(event.target.value)}
              />
            </label>
            <button className="secondary-button full" type="submit" disabled={isWorking || !isRemoteAuthenticated}>
              Descargar bóveda remota
            </button>
          </form>
        )}
      </section>

      <section className="settings-panel settings-section">
        <div className="section-heading">
          <h2>Respaldo</h2>
          <span className="status-pill">{entries.length} elementos</span>
        </div>
        <p className="muted">
          Exporta o importa únicamente la bóveda activa. El archivo usa nombre con fecha y nunca contiene contraseñas en texto plano.
        </p>
        <button className="primary-button" type="button" disabled={isWorking} onClick={handleExportBackup}>
          Exportar respaldo cifrado
        </button>
        <form className="form-stack import-form" onSubmit={handleValidateImport}>
          <label className="field" htmlFor="backupFile">
            <span>Archivo de respaldo</span>
            <input
              ref={fileInputRef}
              id="backupFile"
              type="file"
              accept="application/json,.json"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="field" htmlFor="backupPassword">
            <span>Contraseña maestra del respaldo</span>
            <input
              id="backupPassword"
              type="password"
              value={backupPassword}
              autoComplete="current-password"
              onChange={(event) => setBackupPassword(event.target.value)}
            />
          </label>
          <button className="secondary-button full" type="submit" disabled={isWorking}>
            Importar respaldo cifrado
          </button>
        </form>
      </section>

      <section className="settings-panel settings-section">
        <h2>Datos locales</h2>
        <p className="muted">
          Esto eliminará únicamente la bóveda local activa de este navegador. Las demás bóvedas locales no serán afectadas.
        </p>
        <button className="danger-button full" type="button" onClick={() => setIsDeleteModalOpen(true)}>
          Eliminar bóveda local
        </button>
      </section>

      <section className="settings-panel settings-section">
        <h2>Limitaciones</h2>
        <ul className="plain-list">
          <li>La sincronización remota es manual y opcional.</li>
          <li>Sin contraseña maestra no se puede recuperar la bóveda ni un respaldo.</li>
          <li>La limpieza de memoria en JavaScript depende del navegador.</li>
        </ul>
      </section>

      <section className="settings-panel settings-section">
        <div className="section-heading">
          <h2>Acerca de</h2>
          <span className="status-pill">v{APP_VERSION}</span>
        </div>
        <div className="modal-summary">
          <span>App: Llavero Seguro</span>
          <span>Estado: MVP local</span>
          <span>No es una app auditada para producción.</span>
        </div>
        <ul className="plain-list">
          <li>No autocompleta en otras apps.</li>
          <li>La sincronización automática requiere una sesión remota activa.</li>
          <li>No recupera la contraseña maestra.</li>
          <li>El backend solo guarda blobs cifrados.</li>
        </ul>
      </section>

      {pendingImportPreview && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="importTitle">
          <div className="modal-panel">
            <h2 id="importTitle">Importar respaldo cifrado</h2>
            <p>El respaldo fue descifrado correctamente. Puedes reemplazar la bóveda activa o importarlo como bóveda local separada.</p>
            <div className="modal-summary">
              <span>Bóveda local actual: {activeProfileName}</span>
              <span>Fecha local: {new Date(activeProfileUpdatedAt).toLocaleString()}</span>
              <span>Bóveda a importar: {pendingRemoteDisplayName}</span>
              {pendingImportPreview.remoteUpdatedAt && (
                <span>Fecha remota: {new Date(pendingImportPreview.remoteUpdatedAt).toLocaleString()}</span>
              )}
              <span>Elementos: {pendingImportPreview.itemCount}</span>
              <span>Exportado: {new Date(pendingImportPreview.exportedAt).toLocaleString()}</span>
              <span>Esquema: {pendingImportPreview.schemaVersion}</span>
            </div>
            <p className="form-error">
              Reemplazar sobrescribe la bóveda local activa en este navegador. Si cancelas, no se cambia nada.
            </p>
            <label className="field" htmlFor="replaceConfirmation">
              <span>Escribe REEMPLAZAR para reemplazar la bóveda activa</span>
              <input
                id="replaceConfirmation"
                value={replaceConfirmation}
                autoComplete="off"
                onChange={(event) => setReplaceConfirmation(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button className="ghost-button" type="button" disabled={isWorking} onClick={handleCancelImport}>
                Cancelar
              </button>
              <button className="secondary-button" type="button" disabled={isWorking} onClick={() => handleConfirmImport('new')}>
                Importar nueva
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={isWorking || replaceConfirmation !== 'REEMPLAZAR'}
                onClick={() => handleConfirmImport('replace-current')}
              >
                Reemplazar actual
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
          <div className="modal-panel">
            <h2 id="deleteTitle">Eliminar bóveda local</h2>
            <p>
              Esta acción no se puede deshacer. Escribe ELIMINAR para borrar únicamente la bóveda local activa de este
              navegador.
            </p>
            <label className="field" htmlFor="deleteConfirmation">
              <span>Confirmación</span>
              <input
                id="deleteConfirmation"
                value={deleteConfirmation}
                autoComplete="off"
                onChange={(event) => setDeleteConfirmation(event.target.value)}
              />
            </label>
            {deleteError && <p className="form-error">{deleteError}</p>}
            <div className="modal-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={isWorking}
                onClick={() => {
                  setDeleteConfirmation('');
                  setDeleteError('');
                  setIsDeleteModalOpen(false);
                }}
              >
                Cancelar
              </button>
              <button className="danger-button" type="button" disabled={isWorking} onClick={handleDeleteLocalVault}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={backupMessage ?? masterPasswordMessage ?? remoteMessage} />
    </section>
  );
}
