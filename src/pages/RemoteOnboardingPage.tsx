import { useEffect, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import type { LoginRemoteInput, RegisterRemoteInput, RemoteUser } from '../api/authApi';
import type { RemoteVault } from '../api/vaultSyncApi';
import type { BackupImportPreview } from '../domain/types';

interface RemoteOnboardingPageProps {
  isRemoteApiConfigured: boolean;
  remoteUser: RemoteUser | null;
  remoteVaults: RemoteVault[];
  pendingImportPreview: BackupImportPreview | null;
  onLogin: (input: LoginRemoteInput) => Promise<RemoteVault[]>;
  onRegister: (input: RegisterRemoteInput) => Promise<RemoteVault[]>;
  onUseAnotherAccount: () => void;
  onContinueWithNewVault: () => void;
  onContinueLocally: () => void;
  onValidateRemoteImport: (remoteVaultId: string, masterPassword: string) => Promise<BackupImportPreview>;
  onConfirmRemoteImport: () => Promise<void>;
  onCancelRemoteImport: () => void;
}

export function RemoteOnboardingPage({
  isRemoteApiConfigured,
  remoteUser,
  remoteVaults,
  pendingImportPreview,
  onLogin,
  onRegister,
  onUseAnotherAccount,
  onContinueWithNewVault,
  onContinueLocally,
  onValidateRemoteImport,
  onConfirmRemoteImport,
  onCancelRemoteImport,
}: RemoteOnboardingPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRemoteVaultId, setSelectedRemoteVaultId] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const isRegisterMode = mode === 'register';
  const trimmedEmail = email.trim();
  const trimmedDisplayName = displayName.trim();
  const canSubmit = isRegisterMode
    ? Boolean(trimmedDisplayName && trimmedEmail && password.length >= 10)
    : Boolean(trimmedEmail && password);

  useEffect(() => {
    if (remoteVaults.length === 1) setSelectedRemoteVaultId(remoteVaults[0].id);
  }, [remoteVaults]);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage('');

    if (!trimmedEmail || !password) {
      setMessage('Ingresa email y contraseña de cuenta remota.');
      return;
    }
    if (isRegisterMode && !trimmedDisplayName) {
      setMessage('Ingresa tu nombre para crear la cuenta.');
      return;
    }
    if (isRegisterMode && password.length < 10) {
      setMessage('La contraseña de cuenta remota debe tener al menos 10 caracteres.');
      return;
    }

    setIsWorking(true);
    try {
      const vaults = isRegisterMode
        ? await onRegister({ email: trimmedEmail, displayName: trimmedDisplayName, password })
        : await onLogin({ email: trimmedEmail, password });
      setPassword('');
      if (vaults.length === 0) onContinueWithNewVault();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la autenticación remota.');
    } finally {
      setIsWorking(false);
    }
  }

  async function handleRemoteImport(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage('');
    if (!selectedRemoteVaultId || !masterPassword) {
      setMessage('Selecciona una bóveda e ingresa su contraseña maestra.');
      return;
    }

    setIsWorking(true);
    try {
      await onValidateRemoteImport(selectedRemoteVaultId, masterPassword);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo abrir la bóveda remota.');
    } finally {
      setIsWorking(false);
    }
  }

  async function handleConfirmImport(): Promise<void> {
    setIsWorking(true);
    setMessage('');
    try {
      await onConfirmRemoteImport();
      setMasterPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo importar la bóveda remota.');
    } finally {
      setIsWorking(false);
    }
  }

  if (remoteUser) {
    return (
      <main className="auth-screen">
        <section className="auth-panel selector-panel">
          <BrandLogo />
          <p className="eyebrow">Cuenta conectada</p>
          <h1>Recupera tus bóvedas</h1>
          <p className="muted">
            Sesión iniciada como {remoteUser.email}. Encontramos {remoteVaults.length} bóveda{remoteVaults.length === 1 ? '' : 's'} cifrada{remoteVaults.length === 1 ? '' : 's'}.
          </p>

          <form className="form-stack" autoComplete="off" onSubmit={handleRemoteImport}>
            <label className="field" htmlFor="onboardingRemoteVault">
              <span>Bóveda remota</span>
              <select
                id="onboardingRemoteVault"
                value={selectedRemoteVaultId}
                onChange={(event) => setSelectedRemoteVaultId(event.target.value)}
              >
                <option value="">Seleccionar</option>
                {remoteVaults.map((remoteVault) => (
                  <option key={remoteVault.id} value={remoteVault.id}>
                    {remoteVault.displayName} · {new Date(remoteVault.updatedAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="onboardingMasterPassword">
              <span>Contraseña maestra de la bóveda</span>
              <input
                id="onboardingMasterPassword"
                type="password"
                value={masterPassword}
                autoComplete="off"
                onChange={(event) => setMasterPassword(event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit" disabled={isWorking}>
              {isWorking ? 'Verificando...' : 'Importar en este dispositivo'}
            </button>
          </form>
          <button className="ghost-button" type="button" disabled={isWorking} onClick={onContinueWithNewVault}>
            Crear otra bóveda
          </button>
          <button className="link-button" type="button" disabled={isWorking} onClick={onUseAnotherAccount}>
            Cerrar sesión y usar otra cuenta
          </button>
          {message && <p className="form-error">{message}</p>}
        </section>

        {pendingImportPreview && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="remoteImportTitle">
            <div className="modal-panel">
              <h2 id="remoteImportTitle">Importar bóveda en este dispositivo</h2>
              <p>
                {pendingImportPreview.existingLocalVaultId
                  ? 'La contraseña maestra es correcta. Se actualizará la copia local existente sin crear otra bóveda.'
                  : 'La contraseña maestra es correcta. Se guardará una copia local cifrada sin reemplazar otros datos.'}
              </p>
              <div className="modal-summary">
                <span>Nombre: {pendingImportPreview.displayName ?? 'Bóveda remota'}</span>
                <span>Elementos: {pendingImportPreview.itemCount}</span>
                <span>Actualizada: {new Date(pendingImportPreview.remoteUpdatedAt ?? pendingImportPreview.exportedAt).toLocaleString()}</span>
              </div>
              <div className="modal-actions">
                <button className="ghost-button" type="button" disabled={isWorking} onClick={onCancelRemoteImport}>
                  Cancelar
                </button>
                <button className="primary-button" type="button" disabled={isWorking} onClick={handleConfirmImport}>
                  Importar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <BrandLogo />
        <p className="eyebrow">Primer paso</p>
        <h1>Protege tus bóvedas entre dispositivos</h1>
        <p className="muted">
          {isRemoteApiConfigured
            ? 'Crea una cuenta o inicia sesión. El servidor solo recibirá bóvedas cifradas; tu contraseña maestra nunca se envía.'
            : 'Crea una bóveda local en este dispositivo. Podrás importar respaldos cifrados cuando lo necesites.'}
        </p>
        {isRemoteApiConfigured && (
          <>
            <div className="auth-mode-switch" role="group" aria-label="Tipo de acceso">
              <button className={mode === 'login' ? 'chip active' : 'chip'} type="button" onClick={() => {
                setMode('login');
                setMessage('');
              }}>
                Iniciar sesión
              </button>
              <button className={mode === 'register' ? 'chip active' : 'chip'} type="button" onClick={() => {
                setMode('register');
                setMessage('');
              }}>
                Crear cuenta
              </button>
            </div>
            <form className="form-stack" autoComplete="off" onSubmit={handleAuth}>
              {mode === 'register' && (
                <label className="field" htmlFor="onboardingDisplayName">
                  <span>Nombre</span>
                  <input
                    id="onboardingDisplayName"
                    value={displayName}
                    autoComplete="off"
                    placeholder="Ej. Juan"
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </label>
              )}
              <label className="field" htmlFor="onboardingEmail">
                <span>Email</span>
                <input
                  id="onboardingEmail"
                  type="email"
                  value={email}
                  autoComplete="off"
                  placeholder="tu@email.com"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="field" htmlFor="onboardingRemotePassword">
                <span>Contraseña de cuenta remota</span>
                <input
                  id="onboardingRemotePassword"
                  type="password"
                  value={password}
                  minLength={isRegisterMode ? 10 : undefined}
                  autoComplete="off"
                  onChange={(event) => setPassword(event.target.value)}
                />
                {isRegisterMode && <small className="field-hint">Mínimo 10 caracteres. No es la contraseña maestra de tu bóveda.</small>}
              </label>
              {message && <p className="form-error">{message}</p>}
              <button className="primary-button" type="submit" disabled={isWorking || !canSubmit}>
                {isWorking ? 'Conectando...' : mode === 'register' ? 'Crear cuenta y continuar' : 'Iniciar sesión'}
              </button>
            </form>
          </>
        )}
        <button
          className={isRemoteApiConfigured ? 'link-button onboarding-skip' : 'primary-button onboarding-skip'}
          type="button"
          disabled={isWorking}
          onClick={onContinueLocally}
        >
          {isRemoteApiConfigured ? 'Continuar solo en este dispositivo' : 'Continuar en este dispositivo'}
        </button>
      </section>
    </main>
  );
}
