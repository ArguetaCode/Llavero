import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { SetupPage } from './pages/SetupPage';
import { UnlockPage } from './pages/UnlockPage';
import { VaultPage } from './pages/VaultPage';
import { AddPasswordPage } from './pages/AddPasswordPage';
import { PasswordDetailPage } from './pages/PasswordDetailPage';
import { SecurityPage } from './pages/SecurityPage';
import { VaultSelectorPage } from './pages/VaultSelectorPage';
import { RemoteOnboardingPage } from './pages/RemoteOnboardingPage';
import { Toast, type ToastMessage } from './components/Toast';
import { createBackupFileName, createVaultBackup, parseVaultBackupJson } from './backup/vaultBackup';
import { createExcelFileName, createExcelWorkbook, createVaultCredentialRows } from './backup/vaultExcel';
import { CURRENT_CRYPTO_METADATA } from './crypto/cryptoMetadata';
import { decryptVault, deriveKey, encryptVault, generateSalt } from './crypto/cryptoService';
import {
  cloneProfileAsNewVault,
  createLocalVaultProfile,
  findLocalProfileForRemoteImport,
  findLocalProfilesForRemoteImport,
  prepareRemoteProfileImport,
} from './storage/vaultProfileHelpers';
import {
  deleteVaultProfile,
  listVaultProfiles,
  saveVaultProfile,
  saveVaultProfileReplacingDuplicates,
  touchVaultProfile,
} from './storage/vaultStorage';
import { getStoredJsonFileHandle, saveJsonFileHandle, type JsonFileHandle } from './storage/jsonFileHandle';
import { auditVault } from './domain/vaultAudit';
import {
  fetchRemoteMe,
  loginRemote,
  registerRemote,
  type LoginRemoteInput,
  type RegisterRemoteInput,
  type RemoteUser,
} from './api/authApi';
import { ApiError, isRemoteApiConfigured } from './api/apiClient';
import { createRemoteVault, exportRemoteVaultExcel, listRemoteVaults, updateRemoteVault, type RemoteVault } from './api/vaultSyncApi';
import { createRemoteVaultUploadPayload, findExistingRemoteVault, parseRemoteEncryptedPayload } from './sync/vaultSyncPayload';
import type { AppView, BackupImportPreview, LocalVaultProfile, PasswordEntry, VaultData } from './domain/types';

const DEFAULT_AUTO_LOCK_MINUTES = 2;
const REMOTE_TOKEN_STORAGE_KEY = 'llavero.remoteAccessToken';
const REMOTE_SYNC_INTERVAL_MS = 15_000;
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
  const [remoteUser, setRemoteUser] = useState<RemoteUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (!isRemoteApiConfigured) {
      localStorage.removeItem(REMOTE_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REMOTE_TOKEN_STORAGE_KEY);
      return null;
    }

    const existingToken = localStorage.getItem(REMOTE_TOKEN_STORAGE_KEY);
    const previousSessionToken = sessionStorage.getItem(REMOTE_TOKEN_STORAGE_KEY);
    if (!existingToken && previousSessionToken) {
      localStorage.setItem(REMOTE_TOKEN_STORAGE_KEY, previousSessionToken);
      sessionStorage.removeItem(REMOTE_TOKEN_STORAGE_KEY);
    }
    return existingToken ?? previousSessionToken;
  });
  const [remoteVaults, setRemoteVaults] = useState<RemoteVault[]>([]);
  const [lastManualUploadAt, setLastManualUploadAt] = useState<string | null>(null);
  const [lastManualDownloadAt, setLastManualDownloadAt] = useState<string | null>(null);
  const [hasPassedRemoteOnboarding, setHasPassedRemoteOnboarding] = useState(false);
  const [isSwitchingRemoteAccount, setIsSwitchingRemoteAccount] = useState(false);
  const [pendingBackupImport, setPendingBackupImport] = useState<{
    profile: LocalVaultProfile;
    vault: VaultData;
    key: CryptoKey;
    preview: BackupImportPreview;
  } | null>(null);
  const remoteSyncInFlightRef = useRef(false);
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
    if (!isRemoteApiConfigured || !accessToken) return;
    let isCancelled = false;

    Promise.all([fetchRemoteMe(accessToken), listRemoteVaults(accessToken)])
      .then(([user, vaults]) => {
        if (isCancelled) return;
        setRemoteUser(user);
        setRemoteVaults(vaults);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearRemoteSessionState();
        }
        // Una caída temporal del backend no debe cerrar la sesión local ni bloquear la bóveda.
      });

    return () => {
      isCancelled = true;
    };
  }, [accessToken]);

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

  useEffect(() => {
    if (!isRemoteApiConfigured || !accessToken || !activeProfile || !vault || !cryptoKey) return undefined;

    async function synchronize(): Promise<void> {
      if (remoteSyncInFlightRef.current) return;
      remoteSyncInFlightRef.current = true;
      try {
        const accountVaults = await listRemoteVaults(accessToken as string);
        setRemoteVaults(accountVaults);
        await reconcileUnlockedVaultAfterAuth(accessToken as string, accountVaults);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearRemoteSessionState();
        }
        // El guardado local sigue disponible; el próximo intervalo vuelve a intentarlo.
      } finally {
        remoteSyncInFlightRef.current = false;
      }
    }

    void synchronize();
    const intervalId = window.setInterval(synchronize, REMOTE_SYNC_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [accessToken, activeProfile?.updatedAt, cryptoKey, selectedVaultId, vault?.updatedAt]);

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

  function clearRemoteSessionState(): void {
    setRemoteUser(null);
    setAccessToken(null);
    setRemoteVaults([]);
    localStorage.removeItem(REMOTE_TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(REMOTE_TOKEN_STORAGE_KEY);
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

  async function handleOnboardingRegister(input: RegisterRemoteInput): Promise<RemoteVault[]> {
    const response = await registerRemote(input);
    const vaults = await listRemoteVaults(response.token);
    setRemoteUser(response.user);
    setAccessToken(response.token);
    localStorage.setItem(REMOTE_TOKEN_STORAGE_KEY, response.token);
    setRemoteVaults(vaults);
    showToast('Cuenta remota creada.');
    return vaults;
  }

  async function handleOnboardingLogin(input: LoginRemoteInput): Promise<RemoteVault[]> {
    const response = await loginRemote(input);
    const vaults = await listRemoteVaults(response.token);
    setRemoteUser(response.user);
    setAccessToken(response.token);
    localStorage.setItem(REMOTE_TOKEN_STORAGE_KEY, response.token);
    setRemoteVaults(vaults);
    return vaults;
  }

  function handleLogoutRemote(): void {
    clearRemoteSessionState();
    setLastManualUploadAt(null);
    setLastManualDownloadAt(null);
    setPendingBackupImport(null);
    clearUnlockedState();
    setSelectedVaultId(null);
    setIsCreatingVault(false);
    setIsSwitchingRemoteAccount(true);
    showToast('Sesión cerrada correctamente.');
  }

  function handleUseAnotherRemoteAccount(): void {
    clearRemoteSessionState();
    setLastManualUploadAt(null);
    setLastManualDownloadAt(null);
    setPendingBackupImport(null);
    setIsSwitchingRemoteAccount(true);
  }

  async function handleListRemoteVaults(): Promise<RemoteVault[]> {
    if (!accessToken) throw new Error('Inicia sesión remota primero.');
    const vaults = await listRemoteVaults(accessToken);
    setRemoteVaults(vaults);
    return vaults;
  }

  async function uploadProfileToRemote(storedProfile: LocalVaultProfile, token: string): Promise<LocalVaultProfile> {
    const payload = createRemoteVaultUploadPayload(storedProfile);
    const latestRemoteVaults = await listRemoteVaults(token);
    const existing = findExistingRemoteVault(storedProfile, latestRemoteVaults);
    const saved = existing
      ? await updateRemoteVault(token, existing.id, payload)
      : await createRemoteVault(token, payload);
    const nextVaults = existing
      ? latestRemoteVaults.map((remoteVault) => (remoteVault.id === saved.id ? saved : remoteVault))
      : [saved, ...latestRemoteVaults];

    const syncedAt = new Date().toISOString();
    const nextProfile: LocalVaultProfile = {
      ...storedProfile,
      remoteVaultId: saved.id,
      remoteDisplayName: saved.displayName,
      lastRemoteSyncAt: syncedAt,
      lastRemoteUploadAt: syncedAt,
    };
    await saveVaultProfile(nextProfile);
    setProfiles((current) => current.map((profile) => (profile.vaultId === nextProfile.vaultId ? nextProfile : profile)));
    setRemoteVaults(nextVaults);
    setLastManualUploadAt(syncedAt);
    return nextProfile;
  }

  async function reconcileUnlockedVaultAfterAuth(token: string, accountVaults: RemoteVault[]): Promise<void> {
    if (!activeProfile || !vault || !cryptoKey) return;

    const remoteVault = accountVaults[0];
    if (!remoteVault) {
      await uploadProfileToRemote(activeProfile, token);
      return;
    }

    const { backup, errors } = parseRemoteEncryptedPayload(remoteVault.encryptedPayload);
    if (errors.length) throw new Error(errors[0]);

    const localUpdatedAt = new Date(activeProfile.updatedAt).getTime();
    const remoteUpdatedAt = new Date(backup.updatedAt).getTime();
    if (remoteUpdatedAt < localUpdatedAt) {
      await uploadProfileToRemote({ ...activeProfile, remoteVaultId: remoteVault.id }, token);
      return;
    }

    if (remoteUpdatedAt === localUpdatedAt) {
      if (activeProfile.remoteVaultId !== remoteVault.id) {
        const linkedProfile = {
          ...activeProfile,
          remoteVaultId: remoteVault.id,
          remoteDisplayName: remoteVault.displayName,
        };
        await saveVaultProfile(linkedProfile);
        setProfiles((current) => current.map((profile) => (profile.vaultId === linkedProfile.vaultId ? linkedProfile : profile)));
      }
      return;
    }

    if (backup.salt !== activeProfile.salt) {
      throw new Error('La bóveda remota usa otra contraseña maestra. Descárgala ingresando esa contraseña.');
    }

    let remoteData: VaultData;
    try {
      remoteData = await decryptVault(backup.encryptedVault, cryptoKey, backup.iv);
    } catch {
      throw new Error('No se pudo aplicar la versión remota automáticamente. Descárgala con su contraseña maestra.');
    }

    const syncedAt = new Date().toISOString();
    const nextProfile: LocalVaultProfile = {
      ...activeProfile,
      ...CURRENT_CRYPTO_METADATA,
      displayName: backup.displayName ?? remoteVault.displayName,
      salt: backup.salt,
      iv: backup.iv,
      encryptedVault: backup.encryptedVault,
      updatedAt: backup.updatedAt,
      remoteVaultId: remoteVault.id,
      remoteDisplayName: remoteVault.displayName,
      lastRemoteSyncAt: syncedAt,
      lastRemoteDownloadAt: syncedAt,
    };
    await saveVaultProfile(nextProfile);
    setProfiles((current) => current.map((profile) => (profile.vaultId === nextProfile.vaultId ? nextProfile : profile)));
    setVault(remoteData);
    setLastManualDownloadAt(syncedAt);
  }

  async function handleValidateRemoteVaultImport(remoteVaultId: string, masterPassword: string): Promise<BackupImportPreview> {
    if (!accessToken) throw new Error('Inicia sesión remota primero.');
    const latestRemoteVaults = remoteVaults.length ? remoteVaults : await handleListRemoteVaults();
    const remoteVault = latestRemoteVaults.find((candidate) => candidate.id === remoteVaultId);
    if (!remoteVault) throw new Error('Selecciona una bóveda remota válida.');

    const { backup, errors } = parseRemoteEncryptedPayload(remoteVault.encryptedPayload);
    if (errors.length) throw new Error(errors[0]);

    const key = await deriveKey(masterPassword, backup.salt);
    let importedVault: VaultData;
    try {
      importedVault = await decryptVault(backup.encryptedVault, key, backup.iv);
    } catch {
      throw new Error('No se pudo descifrar. Verifica la contraseña maestra de esa bóveda.');
    }
    if (!Array.isArray(importedVault.entries) || typeof importedVault.updatedAt !== 'string') {
      throw new Error('La bóveda remota descifrada no tiene datos válidos.');
    }

    const profile = createLocalVaultProfile({
      vaultId: backup.vaultId,
      displayName: backup.displayName ?? remoteVault.displayName,
      salt: backup.salt,
      iv: backup.iv,
      encryptedVault: backup.encryptedVault,
      createdAt: backup.createdAt,
      updatedAt: backup.updatedAt,
    });
    const existingLocalProfile = findLocalProfileForRemoteImport(profiles, remoteVault.id, profile);
    const preview: BackupImportPreview = {
      exportedAt: backup.exportedAt,
      itemCount: importedVault.entries.length,
      schemaVersion: backup.schemaVersion,
      displayName: profile.displayName,
      source: 'remote',
      remoteVaultId: remoteVault.id,
      remoteDisplayName: remoteVault.displayName,
      remoteUpdatedAt: remoteVault.updatedAt,
      existingLocalVaultId: existingLocalProfile?.vaultId,
    };

    setPendingBackupImport({ profile, vault: importedVault, key, preview });
    return preview;
  }

  async function persistVault(
    nextVault: VaultData,
    key = cryptoKey,
  ): Promise<'local' | 'synced' | 'sync-failed'> {
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
    if (isRemoteApiConfigured && accessToken && nextProfile.remoteVaultId) {
      try {
        await uploadProfileToRemote(nextProfile, accessToken);
        return 'synced';
      } catch {
        return 'sync-failed';
      }
    }
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
      let syncFailed = false;
      if (isRemoteApiConfigured && accessToken) {
        try {
          await uploadProfileToRemote(profile, accessToken);
        } catch {
          syncFailed = true;
        }
      }
      await refreshProfiles();
      setSelectedVaultId(profile.vaultId);
      setCryptoKey(key);
      setVault(initialVault);
      setIsCreatingVault(false);
      setView('vault');
      showToast(
        syncFailed
          ? 'Bóveda creada localmente. La sincronización se reintentará al iniciar sesión.'
          : accessToken
            ? 'Bóveda creada y sincronizada.'
            : 'Bóveda local creada.',
        syncFailed ? 'error' : 'success',
      );
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
    const persistence = await persistVault(nextVault);
    setSelectedEntryId(null);
    setView('vault');
    showToast(
      persistence === 'synced'
        ? 'Nueva contraseña creada y sincronizada.'
        : persistence === 'sync-failed'
          ? 'Nueva contraseña creada localmente. No se pudo actualizar el respaldo remoto.'
          : 'Nueva contraseña creada.',
      persistence === 'sync-failed' ? 'error' : 'success',
    );
  }

  async function handleUpdateEntry(updatedEntry: PasswordEntry): Promise<void> {
    if (!vault) return;
    const nextVault: VaultData = {
      entries: vault.entries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
      updatedAt: new Date().toISOString(),
    };
    const persistence = await persistVault(nextVault);
    setSelectedEntryId(null);
    setView('vault');
    showToast(
      persistence === 'synced'
        ? 'Contraseña actualizada y sincronizada.'
        : persistence === 'sync-failed'
          ? 'Actualizada localmente. No se pudo actualizar el respaldo remoto.'
          : 'Contraseña actualizada.',
      persistence === 'sync-failed' ? 'error' : 'success',
    );
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
    const persistence = await persistVault(nextVault);
    setSelectedEntryId(null);
    setView('vault');
    showToast(
      persistence === 'synced'
        ? 'Contraseña eliminada y cambio sincronizado.'
        : persistence === 'sync-failed'
          ? 'Eliminada localmente. No se pudo actualizar el respaldo remoto.'
          : 'Contraseña eliminada. La bóveda fue re-cifrada.',
      persistence === 'sync-failed' ? 'error' : 'success',
    );
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
    if (isRemoteApiConfigured && accessToken && nextProfile.remoteVaultId) {
      try {
        await uploadProfileToRemote(nextProfile, accessToken);
        showToast('Contraseña maestra cambiada y bóveda sincronizada.');
      } catch {
        showToast('Contraseña maestra cambiada localmente. Actualiza el respaldo remoto desde Seguridad.', 'error');
      }
    } else {
      showToast('Contraseña maestra cambiada. La bóveda fue re-cifrada.');
    }
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
    let blob: Blob;
    if (format === 'xls' && accessToken && isRemoteApiConfigured) {
      try {
        blob = await exportRemoteVaultExcel(accessToken, credentialRows, fileName);
      } catch {
        // La exportación local mantiene disponible la descarga si el backend aún no fue actualizado.
        blob = createExcelWorkbook(credentialRows);
      }
    } else {
      blob = format === 'json'
        ? new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        : createExcelWorkbook(credentialRows);
    }
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
    const isRemoteImport = pendingBackupImport.preview.source === 'remote';
    const syncDownloadedAt = isRemoteImport ? new Date().toISOString() : undefined;
    const matchingRemoteProfiles = isRemoteImport && pendingBackupImport.preview.remoteVaultId
      ? findLocalProfilesForRemoteImport(
          profiles,
          pendingBackupImport.preview.remoteVaultId,
          pendingBackupImport.profile,
        )
      : [];
    const existingRemoteProfile = matchingRemoteProfiles[0];

    const profile =
      mode === 'new'
        ? isRemoteImport
          ? prepareRemoteProfileImport(pendingBackupImport.profile, existingRemoteProfile)
          : cloneProfileAsNewVault(pendingBackupImport.profile)
        : {
            ...pendingBackupImport.profile,
            vaultId: activeProfile?.vaultId ?? pendingBackupImport.profile.vaultId,
            displayName: activeProfile?.displayName ?? pendingBackupImport.profile.displayName,
          };
    const nextProfile: LocalVaultProfile = syncDownloadedAt
      ? {
          ...profile,
          remoteVaultId: pendingBackupImport.preview.remoteVaultId,
          remoteDisplayName: pendingBackupImport.preview.remoteDisplayName,
          lastRemoteSyncAt: syncDownloadedAt,
          lastRemoteDownloadAt: syncDownloadedAt,
        }
      : profile;

    if (isRemoteImport && mode === 'new') {
      await saveVaultProfileReplacingDuplicates(
        nextProfile,
        matchingRemoteProfiles.map((matchingProfile) => matchingProfile.vaultId),
      );
    } else {
      await saveVaultProfile(nextProfile);
    }
    await refreshProfiles();
    setSelectedVaultId(nextProfile.vaultId);
    setVault(pendingBackupImport.vault);
    setCryptoKey(pendingBackupImport.key);
    setSelectedEntryId(null);
    setPendingBackupImport(null);
    setIsCreatingVault(false);
    setIsSwitchingRemoteAccount(false);
    setView('vault');
    if (syncDownloadedAt) setLastManualDownloadAt(syncDownloadedAt);
    showToast(
      mode === 'replace-current'
        ? 'Respaldo importado correctamente.'
        : existingRemoteProfile
          ? 'Bóveda local actualizada desde el respaldo remoto.'
          : 'Respaldo importado como nueva bóveda.',
    );
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
      setHasPassedRemoteOnboarding(true);
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
    setHasPassedRemoteOnboarding(false);
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

  if (isRemoteApiConfigured && isSwitchingRemoteAccount) {
    return (
      <>
        {busyMessage && <div className="busy-banner">{busyMessage}</div>}
        {updateBanner}
        {installBanner}
        <RemoteOnboardingPage
          isRemoteApiConfigured={isRemoteApiConfigured}
          remoteUser={remoteUser}
          remoteVaults={remoteVaults}
          pendingImportPreview={pendingBackupImport?.preview ?? null}
          onLogin={handleOnboardingLogin}
          onRegister={handleOnboardingRegister}
          onUseAnotherAccount={handleUseAnotherRemoteAccount}
          onContinueWithNewVault={() => {
            setIsSwitchingRemoteAccount(false);
            setIsCreatingVault(true);
          }}
          onContinueLocally={() => setIsSwitchingRemoteAccount(false)}
          onValidateRemoteImport={handleValidateRemoteVaultImport}
          onConfirmRemoteImport={async () => {
            await handleConfirmBackupImport('new');
            setIsSwitchingRemoteAccount(false);
          }}
          onCancelRemoteImport={handleCancelBackupImport}
        />
        <Toast toast={appToast} />
      </>
    );
  }

  if (profiles.length === 0 && !hasPassedRemoteOnboarding && !isCreatingVault) {
    return (
      <>
        {busyMessage && <div className="busy-banner">{busyMessage}</div>}
        {updateBanner}
        {installBanner}
        <RemoteOnboardingPage
          isRemoteApiConfigured={isRemoteApiConfigured}
          remoteUser={remoteUser}
          remoteVaults={remoteVaults}
          pendingImportPreview={pendingBackupImport?.preview ?? null}
          onLogin={handleOnboardingLogin}
          onRegister={handleOnboardingRegister}
          onUseAnotherAccount={handleUseAnotherRemoteAccount}
          onContinueWithNewVault={() => {
            setHasPassedRemoteOnboarding(true);
            setIsCreatingVault(true);
          }}
          onContinueLocally={() => {
            setHasPassedRemoteOnboarding(true);
            setIsCreatingVault(true);
          }}
          onValidateRemoteImport={handleValidateRemoteVaultImport}
          onConfirmRemoteImport={() => handleConfirmBackupImport('new')}
          onCancelRemoteImport={handleCancelBackupImport}
        />
        <Toast toast={appToast} />
      </>
    );
  }

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
          onUseAnotherAccount={isRemoteApiConfigured ? handleUseAnotherRemoteAccount : undefined}
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
          onUseAnotherAccount={isRemoteApiConfigured ? handleUseAnotherRemoteAccount : undefined}
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
          remoteUser={remoteUser}
          remoteVaults={remoteVaults}
          isRemoteSyncAvailable={isRemoteApiConfigured}
          isRemoteAuthenticated={Boolean(accessToken && remoteUser)}
          lastManualUploadAt={lastManualUploadAt}
          lastManualDownloadAt={lastManualDownloadAt}
          vaultUpdatedAt={vault.updatedAt}
          activeProfileName={activeProfile?.displayName ?? 'Bóveda local'}
          activeProfileVaultId={activeProfile?.vaultId ?? ''}
          activeProfileUpdatedAt={activeProfile?.updatedAt ?? vault.updatedAt}
          activeProfileRemoteVaultId={activeProfile?.remoteVaultId}
          activeProfileRemoteDisplayName={activeProfile?.remoteDisplayName}
          activeProfileLastRemoteSyncAt={activeProfile?.lastRemoteSyncAt}
          activeProfileLastRemoteUploadAt={activeProfile?.lastRemoteUploadAt}
          activeProfileLastRemoteDownloadAt={activeProfile?.lastRemoteDownloadAt}
          onAutoLockChange={setAutoLockMinutes}
          onCancelBackupImport={handleCancelBackupImport}
          onConfirmBackupImport={(mode) => handleConfirmBackupImport(mode)}
          onDeleteLocalVault={(confirmation) =>
            activeProfile ? handleDeleteLocalVault(activeProfile.vaultId, confirmation) : Promise.resolve()
          }
          onExportBackup={handleExportBackup}
          onUpdateJsonBackup={handleUpdateJsonBackup}
          onListRemoteVaults={handleListRemoteVaults}
          onLogoutRemote={handleLogoutRemote}
          onOpenRemoteLogin={handleUseAnotherRemoteAccount}
          onChangeMasterPassword={handleChangeMasterPassword}
          onValidateRemoteVaultImport={handleValidateRemoteVaultImport}
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
