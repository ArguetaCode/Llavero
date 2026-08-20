import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { SetupPage } from './pages/SetupPage';
import { UnlockPage } from './pages/UnlockPage';
import { VaultPage } from './pages/VaultPage';
import { AddPasswordPage } from './pages/AddPasswordPage';
import { PasswordDetailPage } from './pages/PasswordDetailPage';
import { SecurityPage } from './pages/SecurityPage';
import { VaultSelectorPage } from './pages/VaultSelectorPage';
import {
  cloneProfileAsNewVault,
  createLocalVaultProfile,
} from './storage/vaultProfileHelpers';
import {
  deleteVaultProfile,
  listVaultProfiles,
  saveVaultProfile,
  touchVaultProfile,
} from './storage/vaultStorage';
import { Toast, type ToastMessage } from './components/Toast';
import { createBackupFileName, createVaultBackup, parseVaultBackupJson } from './backup/vaultBackup';
import { createExcelFileName, createExcelWorkbook, createVaultCredentialRows } from './backup/vaultExcel';
import { CURRENT_CRYPTO_METADATA } from './crypto/cryptoMetadata';
import { decryptVault, deriveKey, encryptVault, generateSalt } from './crypto/cryptoService';
import { getStoredJsonFileHandle, saveJsonFileHandle, type JsonFileHandle } from './storage/jsonFileHandle';
import { auditVault } from './domain/vaultAudit';
import type { AppView, BackupImportPreview, LocalVaultProfile, PasswordEntry, VaultData } from './domain/types';

const DEFAULT_AUTO_LOCK_MINUTES = 2;
const INSTALL_PROMPT_DISMISSED_KEY = 'llavero.installPromptDismissed';

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options?: { types?: Array<{ accept: Record<string, string[]> }>; multiple?: boolean }) => Promise<JsonFileHandle[]>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const emptyVault = (): VaultData => ({
  entries: [],
  updatedAt: new Date().toISOString(),
});

function isRunningStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function shouldShowIosInstallHint(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIos && !isRunningStandalone();
}

function App() {
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [profiles, setProfiles] = useState<LocalVaultProfile[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [isCreatingVault, setIsCreatingVault] = useState(false);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [view, setView] = useState<AppView>('vault');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState('');
  const [autoLockMinutes, setAutoLockMinutes] = useState(DEFAULT_AUTO_LOCK_MINUTES);
  const [appToast, setAppToast] = useState<ToastMessage | null>(null);
  const [busyMessage, setBusyMessage] = useState('');
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosInstallHintVisible, setIsIosInstallHintVisible] = useState(false);
  const [pendingBackupImport, setPendingBackupImport] = useState<{
    profile: LocalVaultProfile;
    vault: VaultData;
    key: CryptoKey;
    preview: BackupImportPreview;
  } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.vaultId === selectedVaultId) ?? null,
    [profiles, selectedVaultId],
  );
  const selectedEntry = useMemo(
    () => vault?.entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [selectedEntryId, vault],
  );
  const audit = useMemo(() => (vault ? auditVault(vault) : null), [vault]);

  useEffect(() => {
    refreshProfiles().finally(() => setIsCheckingStorage(false));
  }, []);

  useEffect(() => {
    if (localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === 'true' || isRunningStandalone()) return undefined;

    setIsIosInstallHintVisible(shouldShowIosInstallHint());

    function handleBeforeInstallPrompt(event: Event): void {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setIsIosInstallHintVisible(false);
    }

    function handleAppInstalled(): void {
      setInstallPromptEvent(null);
      setIsIosInstallHintVisible(false);
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
      showToast('Llavero Seguro instalado.');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);


  useEffect(() => {
    function handleUpdateAvailable(): void {
      setIsUpdateAvailable(true);
    }

    window.addEventListener('llavero:update-available', handleUpdateAvailable);
    return () => window.removeEventListener('llavero:update-available', handleUpdateAvailable);
  }, []);

  useEffect(() => {
    if (!vault) return undefined;

    let timeoutId = window.setTimeout(handleLock, autoLockMinutes * 60 * 1000);

    function resetTimer(): void {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleLock, autoLockMinutes * 60 * 1000);
    }

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [autoLockMinutes, vault]);

  useEffect(() => {
    if (selectedVaultId && !activeProfile) {
      setSelectedVaultId(null);
      clearUnlockedState();
    }
  }, [activeProfile, selectedVaultId]);


  async function refreshProfiles(autoSelectSingleProfile = true): Promise<LocalVaultProfile[]> {
    try {
      const nextProfiles = await listVaultProfiles();
      const sortedProfiles = nextProfiles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProfiles(sortedProfiles);
      if (autoSelectSingleProfile && sortedProfiles.length === 1) {
        setSelectedVaultId((current) => current ?? sortedProfiles[0].vaultId);
      }
      return sortedProfiles;
    } catch {
      setStorageError('No se pudo abrir el almacenamiento local.');
      return [];
    }
  }

  function showToast(message: string, type: ToastMessage['type'] = 'success'): void {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setAppToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => {
      setAppToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  }

  function handleApplyUpdate(): void {
    navigator.serviceWorker?.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  }

  async function handleInstallApp(): Promise<void> {
    if (!installPromptEvent) return;

    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      setInstallPromptEvent(null);
      if (choice.outcome === 'accepted') {
        localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
        showToast('Instalando Llavero Seguro.');
      }
    } catch {
      setInstallPromptEvent(null);
    }
  }

  function handleDismissInstallPrompt(): void {
    setInstallPromptEvent(null);
    setIsIosInstallHintVisible(false);
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
  }

  async function persistVault(
    nextVault: VaultData,
    key = cryptoKey,
  ): Promise<'local'> {
    if (!key || !activeProfile) throw new Error('La bóveda debe estar desbloqueada.');

    const encrypted = await encryptVault(nextVault, key);
    const nextProfile: LocalVaultProfile = {
      ...activeProfile,
      ...CURRENT_CRYPTO_METADATA,
      iv: encrypted.iv,
      encryptedVault: encrypted.encryptedVault,
      updatedAt: nextVault.updatedAt,
    };
    await saveVaultProfile(nextProfile);
    setVault(nextVault);
    setProfiles((current) => current.map((profile) => (profile.vaultId === nextProfile.vaultId ? nextProfile : profile)));
    return 'local';
  }

  async function handleCreateVault(displayName: string, masterPassword: string): Promise<void> {
    setBusyMessage('Creando bóveda cifrada...');
    try {
      const salt = generateSalt();
      const key = await deriveKey(masterPassword, salt);
      const initialVault = emptyVault();
      const encrypted = await encryptVault(initialVault, key);
      const profile = createLocalVaultProfile({
        displayName,
        salt,
        iv: encrypted.iv,
        encryptedVault: encrypted.encryptedVault,
        updatedAt: initialVault.updatedAt,
      });

      await saveVaultProfile(profile);
      await refreshProfiles();
      setSelectedVaultId(profile.vaultId);
      setCryptoKey(key);
      setVault(initialVault);
      setIsCreatingVault(false);
      setView('vault');
      showToast('Bóveda local creada.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleUnlock(unlockedVault: VaultData, key: CryptoKey): Promise<void> {
    if (!selectedVaultId) return;
    await touchVaultProfile(selectedVaultId);
    await refreshProfiles();
    setVault(unlockedVault);
    setCryptoKey(key);
    setView('vault');
  }

  async function handleAddEntry(entry: PasswordEntry): Promise<void> {
    const nextVault: VaultData = {
      entries: [entry, ...(vault?.entries ?? [])],
      updatedAt: new Date().toISOString(),
    };
    await persistVault(nextVault);
    setSelectedEntryId(null);
    setView('vault');
    showToast('Nueva contraseña creada.');
  }

  async function handleUpdateEntry(updatedEntry: PasswordEntry): Promise<void> {
    if (!vault) return;
    const nextVault: VaultData = {
      entries: vault.entries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
      updatedAt: new Date().toISOString(),
    };
    await persistVault(nextVault);
    setSelectedEntryId(null);
    setView('vault');
    showToast('Contraseña actualizada.');
  }

  async function handleDeleteEntry(entryId: string, masterPassword: string): Promise<void> {
    if (!vault || !activeProfile) return;
    if (!masterPassword) throw new Error('Ingresa la contraseña maestra para eliminar esta contraseña.');

    try {
      const verificationKey = await deriveKey(masterPassword, activeProfile.salt);
      await decryptVault(activeProfile.encryptedVault, verificationKey, activeProfile.iv);
    } catch {
      throw new Error('La contraseña maestra no es correcta.');
    }

    const nextVault: VaultData = {
      entries: vault.entries.filter((entry) => entry.id !== entryId),
      updatedAt: new Date().toISOString(),
    };
    await persistVault(nextVault);
    setSelectedEntryId(null);
    setView('vault');
    showToast('Contraseña eliminada. La bóveda fue re-cifrada.');
  }

  async function handleChangeMasterPassword(currentPassword: string, nextPassword: string): Promise<void> {
    if (!vault || !activeProfile) throw new Error('La bóveda debe estar desbloqueada.');

    try {
      const currentKey = await deriveKey(currentPassword, activeProfile.salt);
      await decryptVault(activeProfile.encryptedVault, currentKey, activeProfile.iv);
    } catch {
      throw new Error('La contraseña maestra actual no es correcta.');
    }

    const newSalt = generateSalt();
    const newKey = await deriveKey(nextPassword, newSalt);
    const nextVault = { ...vault, updatedAt: new Date().toISOString() };
    const encrypted = await encryptVault(nextVault, newKey);
    const nextProfile: LocalVaultProfile = {
      ...activeProfile,
      ...CURRENT_CRYPTO_METADATA,
      salt: newSalt,
      iv: encrypted.iv,
      encryptedVault: encrypted.encryptedVault,
      updatedAt: nextVault.updatedAt,
    };

    await saveVaultProfile(nextProfile);
    await refreshProfiles();
    setCryptoKey(newKey);
    setVault(nextVault);
    showToast('Contraseña maestra cambiada. La bóveda fue re-cifrada.');
  }

  function clearUnlockedState(): void {
    setVault((currentVault) => {
      if (currentVault) {
        currentVault.entries.forEach((entry) => {
          entry.password = '';
          entry.username = '';
          entry.notes = '';
        });
        currentVault.entries = [];
        currentVault.updatedAt = '';
      }
      return null;
    });
    setCryptoKey(null);
    setSelectedEntryId(null);
    setPendingBackupImport(null);
    setView('vault');
  }

  function handleLock(): void {
    clearUnlockedState();
  }

  function handleSwitchVault(): void {
    clearUnlockedState();
    setSelectedVaultId(null);
    setIsCreatingVault(false);
  }

  async function handleExportBackup(format: 'json' | 'xls'): Promise<void> {
    if (!activeProfile) throw new Error('No existe una bóveda local para exportar.');
    const backup = createVaultBackup(activeProfile);
    const credentialRows = createVaultCredentialRows(activeProfile.displayName, vault ?? { entries: [], updatedAt: backup.updatedAt });
    const fileName = format === 'json' ? createBackupFileName() : createExcelFileName();
    const blob = format === 'json'
      ? new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      : createExcelWorkbook(credentialRows);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleUpdateJsonBackup(): Promise<void> {
    if (!activeProfile) throw new Error('No existe una bóveda local para actualizar.');
    const picker = (window as FilePickerWindow).showOpenFilePicker;
    if (!picker) {
      throw new Error('Este navegador no permite sobrescribir archivos directamente. Usa Exportar respaldo en formato JSON.');
    }

    let fileHandle = await getStoredJsonFileHandle();
    let permission = await fileHandle?.queryPermission?.({ mode: 'readwrite' });
    if (fileHandle && permission !== 'granted') permission = await fileHandle.requestPermission?.({ mode: 'readwrite' });
    if (!fileHandle || permission !== 'granted') {
      [fileHandle] = await picker({
        multiple: false,
        types: [{ accept: { 'application/json': ['.json'] } }],
      });
      if (fileHandle) await saveJsonFileHandle(fileHandle);
    }
    if (!fileHandle) throw new Error('No se seleccionó ningún archivo JSON.');

    const backup = createVaultBackup(activeProfile);
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(JSON.stringify(backup, null, 2));
    } finally {
      await writable.close();
    }
  }

  async function validateBackupImport(file: File, masterPassword: string): Promise<BackupImportPreview> {
    const fileContents = await file.text();
    const { backup, errors } = parseVaultBackupJson(fileContents);
    if (errors.length) throw new Error(errors[0]);

    const key = await deriveKey(masterPassword, backup.salt);
    let importedVault: VaultData;
    try {
      importedVault = await decryptVault(backup.encryptedVault, key, backup.iv);
    } catch {
      throw new Error('No se pudo descifrar el respaldo. Revisa la contraseña maestra.');
    }
    if (!Array.isArray(importedVault.entries) || typeof importedVault.updatedAt !== 'string') {
      throw new Error('El respaldo descifrado no tiene una bóveda válida.');
    }

    const profile = createLocalVaultProfile({
      vaultId: backup.vaultId,
      displayName: backup.displayName ?? 'Bóveda importada',
      salt: backup.salt,
      iv: backup.iv,
      encryptedVault: backup.encryptedVault,
      createdAt: backup.createdAt,
      updatedAt: backup.updatedAt,
    });

    const preview: BackupImportPreview = {
      exportedAt: backup.exportedAt,
      itemCount: importedVault.entries.length,
      schemaVersion: backup.schemaVersion,
      displayName: profile.displayName,
      source: 'file',
    };

    setPendingBackupImport({
      profile,
      vault: importedVault,
      key,
      preview,
    });

    return preview;
  }

  async function handleValidateBackupImport(file: File, masterPassword: string): Promise<BackupImportPreview> {
    return validateBackupImport(file, masterPassword);
  }

  async function handleConfirmBackupImport(mode: 'replace-current' | 'new' = 'replace-current'): Promise<void> {
    if (!pendingBackupImport) throw new Error('No hay un respaldo validado para importar.');
    const profile =
      mode === 'new'
        ? cloneProfileAsNewVault(pendingBackupImport.profile)
        : {
            ...pendingBackupImport.profile,
            vaultId: activeProfile?.vaultId ?? pendingBackupImport.profile.vaultId,
            displayName: activeProfile?.displayName ?? pendingBackupImport.profile.displayName,
          };
    await saveVaultProfile(profile);
    await refreshProfiles();
    setSelectedVaultId(profile.vaultId);
    setVault(pendingBackupImport.vault);
    setCryptoKey(pendingBackupImport.key);
    setSelectedEntryId(null);
    setPendingBackupImport(null);
    setIsCreatingVault(false);
    setView('vault');
    showToast(mode === 'replace-current' ? 'Respaldo importado correctamente.' : 'Respaldo importado como nueva bóveda.');
  }

  function handleCancelBackupImport(): void {
    setPendingBackupImport(null);
  }

  async function handleDeleteLocalVault(vaultId: string, masterPassword: string): Promise<void> {
    if (!masterPassword) throw new Error('Ingresa la contraseña maestra para eliminar la bóveda.');
    const profile = profiles.find((candidate) => candidate.vaultId === vaultId);
    if (!profile) throw new Error('No se encontró la bóveda local.');

    try {
      const key = await deriveKey(masterPassword, profile.salt);
      await decryptVault(profile.encryptedVault, key, profile.iv);
    } catch {
      throw new Error('La contraseña maestra no es correcta.');
    }

    await deleteVaultProfile(vaultId);
    const nextProfiles = await refreshProfiles(false);
    if (selectedVaultId === vaultId) {
      clearUnlockedState();
      setSelectedVaultId(null);
    }
    if (nextProfiles.length === 0) {
      clearUnlockedState();
      setSelectedVaultId(null);
      setIsCreatingVault(true);
    }
    showToast('Bóveda local eliminada correctamente.');
  }

  function handleBackFromSetup(): void {
    handleCancelBackupImport();
    setIsCreatingVault(false);
    if (profiles.length > 0) {
      setSelectedVaultId(null);
      return;
    }
  }

  if (isCheckingStorage) return <div className="boot-screen">Abriendo Llavero Seguro...</div>;
  if (storageError) return <div className="boot-screen">{storageError}</div>;

  const updateBanner = isUpdateAvailable ? (
    <div className="update-banner">
      <span>Hay una nueva versión disponible. Recarga para actualizar.</span>
      <button type="button" onClick={handleApplyUpdate}>
        Recargar
      </button>
    </div>
  ) : null;
  const installBanner = !isUpdateAvailable && !busyMessage && (installPromptEvent || isIosInstallHintVisible) ? (
    <div className="install-banner" role="region" aria-label="Instalar aplicación">
      <span>
        {installPromptEvent
          ? 'Instala Llavero Seguro para abrirlo más rápido desde este dispositivo.'
          : 'Instala Llavero Seguro desde Compartir > Agregar a inicio.'}
      </span>
      <div className="install-banner-actions">
        {installPromptEvent && (
          <button type="button" onClick={handleInstallApp}>
            Instalar
          </button>
        )}
        <button className="ghost-install-button" type="button" onClick={handleDismissInstallPrompt} aria-label="Ocultar sugerencia de instalación">
          Ahora no
        </button>
      </div>
    </div>
  ) : null;

  if (isCreatingVault || profiles.length === 0) {
    return (
      <>
        {busyMessage && <div className="busy-banner">{busyMessage}</div>}
        {updateBanner}
        {installBanner}
        <SetupPage
          pendingImportPreview={pendingBackupImport?.preview ?? null}
          onBack={handleBackFromSetup}
          onCreateVault={handleCreateVault}
          onImportBackup={validateBackupImport}
          onCancelImport={handleCancelBackupImport}
          onConfirmImportAsNew={() => handleConfirmBackupImport('new')}
        />
        <Toast toast={appToast} />
      </>
    );
  }

  if (!selectedVaultId) {
    return (
      <>
        {updateBanner}
        {installBanner}
        <VaultSelectorPage
          profiles={profiles}
          pendingImportPreview={pendingBackupImport?.preview ?? null}
          onGoHome={() => setSelectedVaultId(profiles[0]?.vaultId ?? null)}
          onCreateNew={() => setIsCreatingVault(true)}
          onDeleteProfile={handleDeleteLocalVault}
          onImportBackup={validateBackupImport}
          onCancelImport={handleCancelBackupImport}
          onConfirmImportAsNew={() => handleConfirmBackupImport('new')}
          onSelectProfile={setSelectedVaultId}
        />
        <Toast toast={appToast} />
      </>
    );
  }

  if (!vault) {
    const profile = activeProfile;
    if (!profile) {
      return <div className="boot-screen">Cargando bóveda local...</div>;
    }
    return (
      <>
        {updateBanner}
        {installBanner}
        <UnlockPage
          profile={profile}
          onBack={() => setSelectedVaultId(null)}
          onCreateNewVault={() => {
            clearUnlockedState();
            setSelectedVaultId(null);
            setIsCreatingVault(true);
          }}
          onUnlock={handleUnlock}
        />
        <Toast toast={appToast} />
      </>
    );
  }

  return (
    <AppShell currentView={view} onNavigate={setView}>
      {busyMessage && <div className="busy-banner">{busyMessage}</div>}
      {updateBanner}
      {installBanner}
      {(view === 'vault' || view === 'add' || (view === 'detail' && selectedEntry)) && (
        <VaultPage
          entries={vault.entries}
          repeatedCountsByEntryId={audit?.repeatedCountsByEntryId ?? {}}
          onAdd={() => setView('add')}
          onOpenEntry={(entryId) => {
            setSelectedEntryId(entryId);
            setView('detail');
          }}
        />
      )}
      {view === 'add' && <AddPasswordPage onBack={() => setView('vault')} onSave={handleAddEntry} />}
      {view === 'detail' && selectedEntry && (
        <PasswordDetailPage
          entry={selectedEntry}
          repeatedCount={audit?.repeatedCountsByEntryId[selectedEntry.id] ?? 0}
          onBack={() => setView('vault')}
          onDelete={handleDeleteEntry}
          onSave={handleUpdateEntry}
        />
      )}
      {view === 'detail' && !selectedEntry && (
        <VaultPage
          entries={vault.entries}
          repeatedCountsByEntryId={audit?.repeatedCountsByEntryId ?? {}}
          onAdd={() => setView('add')}
          onOpenEntry={(entryId) => {
            setSelectedEntryId(entryId);
            setView('detail');
          }}
        />
      )}
      {view === 'security' && (
        <SecurityPage
          autoLockMinutes={autoLockMinutes}
          audit={audit}
          entries={vault.entries}
          pendingImportPreview={pendingBackupImport?.preview ?? null}
          vaultUpdatedAt={vault.updatedAt}
          activeProfileName={activeProfile?.displayName ?? 'Bóveda local'}
          activeProfileUpdatedAt={activeProfile?.updatedAt ?? vault.updatedAt}
          onAutoLockChange={setAutoLockMinutes}
          onCancelBackupImport={handleCancelBackupImport}
          onConfirmBackupImport={(mode) => handleConfirmBackupImport(mode)}
          onDeleteLocalVault={(confirmation) =>
            activeProfile ? handleDeleteLocalVault(activeProfile.vaultId, confirmation) : Promise.resolve()
          }
          onExportBackup={handleExportBackup}
          onUpdateJsonBackup={handleUpdateJsonBackup}
          onChangeMasterPassword={handleChangeMasterPassword}
          onValidateBackupImport={handleValidateBackupImport}
          onSwitchVault={handleSwitchVault}
          onLock={handleLock}
        />
      )}
      <Toast toast={appToast} />
    </AppShell>
  );
}

export default App;
