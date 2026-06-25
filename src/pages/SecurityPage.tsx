import { useEffect, useMemo, useRef, useState } from 'react';
import type { BackupImportPreview, PasswordEntry } from '../domain/types';
import type { VaultAudit } from '../domain/vaultAudit';
import { Toast, type ToastMessage } from '../components/Toast';
import type { ChangeRemotePasswordInput, LoginRemoteInput, RegisterRemoteInput, RemoteUser } from '../api/authApi';
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
  isRemoteSyncAvailable: boolean;
  lastManualDownloadAt: string | null;
  lastManualUploadAt: string | null;
  pendingImportPreview: BackupImportPreview | null;
  remoteUser: RemoteUser | null;
  remoteVaults: RemoteVault[];
  vaultUpdatedAt: string;
  onAutoLockChange: (minutes: number) => void;
  onChangeMasterPassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  onChangeRemotePassword: (input: ChangeRemotePasswordInput) => Promise<void>;
  onCancelBackupImport: () => void;
  onConfirmBackupImport: (mode: 'replace-current' | 'new') => Promise<void>;
  onDeleteLocalVault: (masterPassword: string) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onFetchRemoteMe: () => Promise<void>;
  onListRemoteVaults: () => Promise<RemoteVault[]>;
  onLoginRemote: (input: LoginRemoteInput) => Promise<void>;
  onLogoutRemote: () => void;
  onRegisterRemote: (input: RegisterRemoteInput) => Promise<void>;
  onLock: () => void;
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
  isRemoteSyncAvailable,
  lastManualDownloadAt,
  lastManualUploadAt,
  pendingImportPreview,
  remoteUser,
  remoteVaults,
  vaultUpdatedAt,
  onAutoLockChange,
  onChangeMasterPassword,
  onChangeRemotePassword,
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
  const [deleteMasterPassword, setDeleteMasterPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [currentMasterPassword, setCurrentMasterPassword] = useState('');
  const [nextMasterPassword, setNextMasterPassword] = useState('');
  const [nextMasterPasswordConfirmation, setNextMasterPasswordConfirmation] = useState('');
  const [masterPasswordMessage, setMasterPasswordMessage] = useState<ToastMessage | null>(null);
  const [remoteMode, setRemoteMode] = useState<'login' | 'register'>('login');
  const [remoteEmail, setRemoteEmail] = useState('');
  const [remoteDisplayName, setRemoteDisplayName] = useState('');
  const [remotePassword, setRemotePassword] = useState('');
  const [currentRemotePassword, setCurrentRemotePassword] = useState('');
  const [nextRemotePassword, setNextRemotePassword] = useState('');
  const [nextRemotePasswordConfirmation, setNextRemotePasswordConfirmation] = useState('');
  const [remotePasswordMessage, setRemotePasswordMessage] = useState<ToastMessage | null>(null);
  const [remoteMessage, setRemoteMessage] = useState<ToastMessage | null>(null);
  const [selectedRemoteVaultId, setSelectedRemoteVaultId] = useState('');
  const [remoteMasterPassword, setRemoteMasterPassword] = useState('');
  const [replaceConfirmation, setReplaceConfirmation] = useState('');
  const [activeSecurityModal, setActiveSecurityModal] = useState<
    'master-password' | 'remote-account' | 'sync' | 'backup' | 'local-data' | null
  >(null);

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
    updatedAt: vaultUpdatedAt,
    repeatedCountsByEntryId: {},
  };

  useEffect(() => {
    if (!backupMessage && !masterPasswordMessage && !remotePasswordMessage && !remoteMessage) return undefined;
    const timeoutId = window.setTimeout(() => {
      setBackupMessage(null);
      setMasterPasswordMessage(null);
      setRemotePasswordMessage(null);
      setRemoteMessage(null);
    }, 4000);
    return () => window.clearTimeout(timeoutId);
  }, [backupMessage, masterPasswordMessage, remotePasswordMessage, remoteMessage]);

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
      await onDeleteLocalVault(deleteMasterPassword);
      setDeleteMasterPassword('');
      setDeleteError('');
      setIsDeleteModalOpen(false);
      setBackupMessage({ type: 'success', message: 'Bóveda local eliminada correctamente.' });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudo eliminar la bóveda local.');
    } finally {
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

  async function handleChangeRemotePassword(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRemotePasswordMessage(null);

    if (!currentRemotePassword || !nextRemotePassword || !nextRemotePasswordConfirmation) {
      setRemotePasswordMessage({ type: 'error', message: 'Completa las tres contraseñas de cuenta.' });
      return;
    }
    if (nextRemotePassword.length < 10 || nextRemotePassword.length > 128) {
      setRemotePasswordMessage({ type: 'error', message: 'La nueva contraseña debe tener entre 10 y 128 caracteres.' });
      return;
    }
    if (nextRemotePassword !== nextRemotePasswordConfirmation) {
      setRemotePasswordMessage({ type: 'error', message: 'La confirmación no coincide con la nueva contraseña.' });
      return;
    }
    if (currentRemotePassword === nextRemotePassword) {
      setRemotePasswordMessage({ type: 'error', message: 'La nueva contraseña debe ser diferente de la actual.' });
      return;
    }

    setIsWorking(true);
    try {
      await onChangeRemotePassword({ currentPassword: currentRemotePassword, newPassword: nextRemotePassword });
      setCurrentRemotePassword('');
      setNextRemotePassword('');
      setNextRemotePasswordConfirmation('');
      setRemotePasswordMessage({ type: 'success', message: 'Contraseña de cuenta actualizada.' });
    } catch (error) {
      setRemotePasswordMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña de cuenta.',
      });
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
  const securityIssueCount = displayedAudit.weak + displayedAudit.repeated + displayedAudit.missingWebsite;
  const securityStatusLabel = securityIssueCount > 0 ? `${securityIssueCount} por revisar` : 'Todo en orden';

  return (
    <section className="page security-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Estado general</p>
          <h1>Seguridad</h1>
        </div>
      </header>

      <section className="settings-panel settings-section security-overview">
        <div className="security-summary">
          <div>
            <p className="eyebrow">Bóveda activa</p>
            <h2>{activeProfileName}</h2>
            <span>Actualizada {new Date(displayedAudit.updatedAt || vaultUpdatedAt).toLocaleString()}</span>
          </div>
          <span className={securityIssueCount > 0 ? 'status-pill attention' : 'status-pill'}>
            {securityStatusLabel}
          </span>
        </div>

        <div className="security-stats">
          <div className="security-total">
            <span>Total</span>
            <strong>{displayedAudit.total}</strong>
            <small>credencial{displayedAudit.total === 1 ? '' : 'es'} guardada{displayedAudit.total === 1 ? '' : 's'}</small>
          </div>
          <div className="security-stat-list" aria-label="Resumen de auditoría">
            <div className="security-stat warning">
              <span>Débiles</span>
              <strong>{displayedAudit.weak}</strong>
            </div>
            <div className="security-stat danger">
              <span>Repetidas</span>
              <strong>{displayedAudit.repeated}</strong>
            </div>
            <div className="security-stat">
              <span>Fuertes</span>
              <strong>{displayedAudit.strong}</strong>
            </div>
            <div className="security-stat">
              <span>Medias</span>
              <strong>{displayedAudit.medium}</strong>
            </div>
            <div className="security-stat warning">
              <span>Sin sitio</span>
              <strong>{displayedAudit.missingWebsite}</strong>
            </div>
          </div>
        </div>

        <div className="security-recommendations">
          {displayedAudit.weak > 0 && <p>Cambia las contraseñas débiles.</p>}
          {displayedAudit.repeated > 0 && <p>Evita reutilizar la misma contraseña.</p>}
          {displayedAudit.missingWebsite > 0 && <p>Completa los sitios faltantes para reconocer tus accesos.</p>}
          <p>Exporta un respaldo cifrado regularmente.</p>
        </div>

        <div className="security-controls">
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
          <div className="security-action-row">
            <button className="secondary-button full" type="button" onClick={onLock}>
              Bloquear
            </button>
            <button className="secondary-button full" type="button" onClick={onSwitchVault}>
              Cambiar bóveda
            </button>
          </div>
        </div>
      </section>

      <section className="settings-panel settings-section security-actions-panel">
        <div className="section-heading">
          <h2>Herramientas</h2>
          <span className="status-pill">{isRemoteAuthenticated ? 'Remoto activo' : 'Local'}</span>
        </div>
        <div className="security-action-list">
          <button className="security-menu-button" type="button" onClick={() => setActiveSecurityModal('master-password')}>
            <span>Cambiar contraseña maestra</span>
            <small>Re-cifra la bóveda local</small>
          </button>
          {isRemoteSyncAvailable && (
            <button className="security-menu-button" type="button" onClick={() => setActiveSecurityModal('remote-account')}>
              <span>Cuenta remota</span>
              <small>{remoteUser ? remoteUser.email : 'Iniciar sesión o crear cuenta'}</small>
            </button>
          )}
          {isRemoteSyncAvailable && (
            <button className="security-menu-button" type="button" onClick={() => setActiveSecurityModal('sync')}>
              <span>Sincronización cifrada</span>
              <small>{activeProfileRemoteDisplayName ?? activeProfileRemoteVaultId ?? 'Sin vínculo remoto'}</small>
            </button>
          )}
          <button className="security-menu-button" type="button" onClick={() => setActiveSecurityModal('backup')}>
            <span>Respaldo</span>
            <small>Exportar o importar archivo cifrado</small>
          </button>
          <button className="security-menu-button" type="button" onClick={() => setActiveSecurityModal('local-data')}>
            <span>Datos locales</span>
            <small>Eliminar la bóveda de este navegador</small>
          </button>
        </div>
      </section>

      {activeSecurityModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-panel settings-modal">
            <div className="modal-title-row">
              <h2>
                {activeSecurityModal === 'master-password' && 'Cambiar contraseña maestra'}
                {activeSecurityModal === 'remote-account' && 'Cuenta remota'}
                {activeSecurityModal === 'sync' && 'Sincronización cifrada'}
                {activeSecurityModal === 'backup' && 'Respaldo'}
                {activeSecurityModal === 'local-data' && 'Datos locales'}
              </h2>
              <button className="sheet-close-button" type="button" onClick={() => setActiveSecurityModal(null)}>
                ×
              </button>
            </div>

            {activeSecurityModal === 'master-password' && (
              <>
                <p>Esto re-cifra toda la bóveda con un nuevo salt e IV. La bóveda seguirá desbloqueada si el cambio termina bien.</p>
                <form className="form-stack" autoComplete="off" onSubmit={handleChangeMasterPassword}>
                  <label className="field" htmlFor="currentMasterPassword">
                    <span>Contraseña actual</span>
                    <input
                      id="currentMasterPassword"
                      type="password"
                      value={currentMasterPassword}
                      autoComplete="off"
                      onChange={(event) => setCurrentMasterPassword(event.target.value)}
                    />
                  </label>
                  <label className="field" htmlFor="nextMasterPassword">
                    <span>Nueva contraseña</span>
                    <input
                      id="nextMasterPassword"
                      type="password"
                      value={nextMasterPassword}
                      autoComplete="off"
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
                      autoComplete="off"
                      onChange={(event) => setNextMasterPasswordConfirmation(event.target.value)}
                    />
                  </label>
                  <button className="primary-button" type="submit" disabled={isWorking}>
                    Cambiar contraseña maestra
                  </button>
                </form>
              </>
            )}

            {activeSecurityModal === 'remote-account' && (
              <>
                <div className="section-heading">
                  <p className="muted">La contraseña remota no es tu contraseña maestra. Tu contraseña maestra nunca se envía al servidor.</p>
                  <span className="status-pill">{isRemoteAuthenticated ? 'Conectado' : 'Modo local'}</span>
                </div>
                {remoteUser ? (
                  <div className="modal-summary">
                    <span>Conectado como: {remoteUser.email}</span>
                    <span>Nombre: {remoteUser.displayName}</span>
                    <span>La sesión permanece activa en este dispositivo hasta cerrar sesión o vencer.</span>
                  </div>
                ) : (
                  <form className="form-stack" autoComplete="off" onSubmit={handleRemoteAuth}>
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
                          autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                  <form className="form-stack" autoComplete="off" onSubmit={handleChangeRemotePassword}>
                    <h3>Cambiar contraseña de cuenta</h3>
                    <p className="field-hint">No cambia la contraseña maestra ni vuelve a cifrar la bóveda.</p>
                    <label className="field" htmlFor="currentRemoteAccountPassword">
                      <span>Contraseña actual de la cuenta</span>
                      <input
                        id="currentRemoteAccountPassword"
                        type="password"
                        value={currentRemotePassword}
                        autoComplete="current-password"
                        onChange={(event) => setCurrentRemotePassword(event.target.value)}
                      />
                    </label>
                    <label className="field" htmlFor="nextRemoteAccountPassword">
                      <span>Nueva contraseña de la cuenta</span>
                      <input
                        id="nextRemoteAccountPassword"
                        type="password"
                        value={nextRemotePassword}
                        minLength={10}
                        maxLength={128}
                        autoComplete="new-password"
                        onChange={(event) => setNextRemotePassword(event.target.value)}
                      />
                    </label>
                    <label className="field" htmlFor="confirmRemoteAccountPassword">
                      <span>Confirmar nueva contraseña</span>
                      <input
                        id="confirmRemoteAccountPassword"
                        type="password"
                        value={nextRemotePasswordConfirmation}
                        minLength={10}
                        maxLength={128}
                        autoComplete="new-password"
                        onChange={(event) => setNextRemotePasswordConfirmation(event.target.value)}
                      />
                    </label>
                    <button className="primary-button" type="submit" disabled={isWorking}>
                      {isWorking ? 'Actualizando...' : 'Cambiar contraseña de cuenta'}
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
              </>
            )}

            {activeSecurityModal === 'sync' && (
              <>
                <div className="section-heading">
                  <p className="muted">
                    Tu cuenta mantiene una sola bóveda. Al iniciar sesión se compara con este dispositivo y cada cambio posterior se respalda automáticamente.
                  </p>
                  <span className="status-pill">{isRemoteAuthenticated ? 'Automática' : 'No conectado'}</span>
                </div>
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
                  <form className="form-stack import-form" autoComplete="off" onSubmit={handleValidateRemoteImport}>
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
                        autoComplete="off"
                        onChange={(event) => setRemoteMasterPassword(event.target.value)}
                      />
                    </label>
                    <button className="secondary-button full" type="submit" disabled={isWorking || !isRemoteAuthenticated}>
                      Descargar bóveda remota
                    </button>
                  </form>
                )}
              </>
            )}

            {activeSecurityModal === 'backup' && (
              <div className="backup-modal-content">
                <div className="backup-summary">
                  <div>
                    <p className="eyebrow">Bóveda activa</p>
                    <h3>{activeProfileName}</h3>
                    <span>{entries.length} elemento{entries.length === 1 ? '' : 's'} cifrado{entries.length === 1 ? '' : 's'}</span>
                  </div>
                  <span className="status-pill">{entries.length} elementos</span>
                </div>

                <section className="backup-card">
                  <div>
                    <h3>Exportar</h3>
                    <p>Descarga una copia cifrada de esta bóveda para guardarla fuera del navegador.</p>
                  </div>
                  <button className="primary-button" type="button" disabled={isWorking} onClick={handleExportBackup}>
                    Exportar respaldo
                  </button>
                </section>

                <form className="backup-card import-form" autoComplete="off" onSubmit={handleValidateImport}>
                  <div>
                    <h3>Importar</h3>
                    <p>Selecciona un archivo `.json` y usa la contraseña maestra con la que fue creado.</p>
                  </div>
                  <label className="backup-file-picker" htmlFor="backupFile">
                    <input
                      ref={fileInputRef}
                      id="backupFile"
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    />
                    <span>{selectedFile ? selectedFile.name : 'Seleccionar archivo de respaldo'}</span>
                    <small>{selectedFile ? 'Archivo listo para validar' : 'Formato JSON cifrado'}</small>
                  </label>
                  <label className="field" htmlFor="backupPassword">
                    <span>Contraseña maestra del respaldo</span>
                    <input
                      id="backupPassword"
                      type="password"
                      value={backupPassword}
                      autoComplete="off"
                      onChange={(event) => setBackupPassword(event.target.value)}
                    />
                  </label>
                  <button className="secondary-button full" type="submit" disabled={isWorking}>
                    Validar e importar
                  </button>
                </form>
              </div>
            )}

            {activeSecurityModal === 'local-data' && (
              <>
                <p>Esto eliminará únicamente la bóveda local activa de este navegador. Las demás bóvedas locales no serán afectadas.</p>
                <button
                  className="danger-button full"
                  type="button"
                  onClick={() => {
                    setActiveSecurityModal(null);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  Eliminar bóveda local
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {pendingImportPreview && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="importTitle">
          <div className="modal-panel">
            <h2 id="importTitle">Importar respaldo cifrado</h2>
            <p>
              {pendingImportPreview.existingLocalVaultId
                ? 'El respaldo corresponde a una bóveda local existente. Puedes actualizarla sin crear un duplicado o reemplazar la bóveda activa.'
                : 'El respaldo fue descifrado correctamente. Puedes reemplazar la bóveda activa o importarlo como bóveda local separada.'}
            </p>
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
                {pendingImportPreview.existingLocalVaultId ? 'Actualizar existente' : 'Importar nueva'}
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
              Esta acción no se puede deshacer. Para continuar, confirma tu contraseña maestra de esta bóveda.
            </p>
            <label className="field" htmlFor="deleteMasterPassword">
              <span>Contraseña maestra</span>
              <input
                id="deleteMasterPassword"
                type="password"
                value={deleteMasterPassword}
                autoComplete="off"
                onChange={(event) => setDeleteMasterPassword(event.target.value)}
              />
            </label>
            {deleteError && <p className="form-error">{deleteError}</p>}
            <div className="modal-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={isWorking}
                onClick={() => {
                  setDeleteMasterPassword('');
                  setDeleteError('');
                  setIsDeleteModalOpen(false);
                }}
              >
                Cancelar
              </button>
              <button className="danger-button" type="button" disabled={isWorking} onClick={handleDeleteLocalVault}>
                {isWorking ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={backupMessage ?? masterPasswordMessage ?? remotePasswordMessage ?? remoteMessage} />
    </section>
  );
}
