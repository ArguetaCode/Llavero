import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { SetupPage } from './pages/SetupPage';
import { UnlockPage } from './pages/UnlockPage';
import { VaultPage } from './pages/VaultPage';
import { AddPasswordPage } from './pages/AddPasswordPage';
import { PasswordDetailPage } from './pages/PasswordDetailPage';
import { SecurityPage } from './pages/SecurityPage';
import { VaultSelectorPage } from './pages/VaultSelectorPage';
import { Toast, type ToastMessage } from './components/Toast';
import { createBackupFileName, createVaultBackup, parseVaultBackupJson } from './backup/vaultBackup';
import { CURRENT_CRYPTO_METADATA } from './crypto/cryptoMetadata';
import { decryptVault, deriveKey, encryptVault, generateSalt } from './crypto/cryptoService';
import { createLocalVaultProfile, cloneProfileAsNewVault } from './storage/vaultProfileHelpers';
import { deleteVaultProfile, listVaultProfiles, saveVaultProfile, touchVaultProfile } from './storage/vaultStorage';
import { auditVault } from './domain/vaultAudit';
import type { AppView, BackupImportPreview, LocalVaultProfile, PasswordEntry, VaultData } from './domain/types';

const DEFAULT_AUTO_LOCK_MINUTES = 2;

const emptyVault = (): VaultData => ({
  entries: [],
  updatedAt: new Date().toISOString(),
});

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
  const [pendingBackupImport, setPendingBackupImport] = useState<{
    profile: LocalVaultProfile;
    vault: VaultData;
    key: CryptoKey;
    preview: BackupImportPreview;
  } | null>(null);

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

  async function refreshProfiles(): Promise<void> {
    try {
      const nextProfiles = await listVaultProfiles();
      setProfiles(nextProfiles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch {
      setStorageError('No se pudo abrir el almacenamiento local.');
    }
  }

  function showToast(message: string, type: ToastMessage['type'] = 'success'): void {
    setAppToast({ type, message });
    window.setTimeout(() => setAppToast(null), 2600);
  }

  function handleApplyUpdate(): void {
    navigator.serviceWorker?.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  }

  async function persistVault(nextVault: VaultData, key = cryptoKey): Promise<void> {
    if (!key || !activeProfile) throw new Error('La bóveda debe estar desbloqueada.');

    setBusyMessage('Guardando bóveda cifrada...');
    try {
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
    } finally {
      setBusyMessage('');
    }
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
    setSelectedEntryId(entry.id);
    setView('detail');
    showToast('Contraseña guardada.');
  }

  async function handleUpdateEntry(updatedEntry: PasswordEntry): Promise<void> {
    if (!vault) return;
    const nextVault: VaultData = {
      entries: vault.entries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
      updatedAt: new Date().toISOString(),
    };
    await persistVault(nextVault);
    setSelectedEntryId(updatedEntry.id);
    setView('detail');
    showToast('Contraseña actualizada.');
  }

  async function handleDeleteEntry(entryId: string): Promise<void> {
    if (!vault) return;
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

  async function handleExportBackup(): Promise<void> {
    if (!activeProfile) throw new Error('No existe una bóveda local para exportar.');
    const backup = createVaultBackup(activeProfile);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = createBackupFileName();
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
    showToast(mode === 'new' ? 'Respaldo importado como nueva bóveda.' : 'Respaldo importado correctamente.');
  }

  function handleCancelBackupImport(): void {
    setPendingBackupImport(null);
  }

  async function handleDeleteLocalVault(vaultId: string, confirmation: string): Promise<void> {
    if (confirmation !== 'ELIMINAR') throw new Error('Escribe ELIMINAR para confirmar.');
    await deleteVaultProfile(vaultId);
    await refreshProfiles();
    if (selectedVaultId === vaultId) {
      clearUnlockedState();
      setSelectedVaultId(null);
    }
    showToast('Bóveda local eliminada.');
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

  if (isCreatingVault || profiles.length === 0) {
    return (
      <>
        {busyMessage && <div className="busy-banner">{busyMessage}</div>}
        {updateBanner}
        <SetupPage onCreateVault={handleCreateVault} onBack={profiles.length ? () => setIsCreatingVault(false) : undefined} />
        <Toast toast={appToast} />
      </>
    );
  }

  if (!selectedVaultId) {
    return (
      <>
        {updateBanner}
        <VaultSelectorPage
          profiles={profiles}
          pendingImportPreview={pendingBackupImport?.preview ?? null}
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
        <UnlockPage profile={profile} onBack={() => setSelectedVaultId(null)} onUnlock={handleUnlock} />
      </>
    );
  }

  return (
    <AppShell currentView={view} onNavigate={setView}>
      {busyMessage && <div className="busy-banner">{busyMessage}</div>}
      {updateBanner}
      {view === 'vault' && (
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
          onAutoLockChange={setAutoLockMinutes}
          onCancelBackupImport={handleCancelBackupImport}
          onConfirmBackupImport={(mode) => handleConfirmBackupImport(mode)}
          onDeleteLocalVault={(confirmation) =>
            activeProfile ? handleDeleteLocalVault(activeProfile.vaultId, confirmation) : Promise.resolve()
          }
          onExportBackup={handleExportBackup}
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
