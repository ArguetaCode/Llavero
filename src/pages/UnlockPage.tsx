import { useEffect, useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { SecureField } from '../components/SecureField';
import { decryptVault, deriveKey } from '../crypto/cryptoService';
import type { LocalVaultProfile, VaultData } from '../domain/types';

interface UnlockPageProps {
  profile: LocalVaultProfile;
  onBack: () => void;
  onUseAnotherAccount?: () => void;
  onUnlock: (vault: VaultData, key: CryptoKey) => Promise<void>;
}

export function UnlockPage({ profile, onBack, onUseAnotherAccount, onUnlock }: UnlockPageProps) {
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (!error) return undefined;
    const timeoutId = window.setTimeout(() => setError(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setIsUnlocking(true);
    try {
      const key = await deriveKey(masterPassword, profile.salt);
      const vault = await decryptVault(profile.encryptedVault, key, profile.iv);
      await onUnlock(vault, key);
    } catch (unlockError) {
      setError(unlockError instanceof Error && unlockError.message.includes('Web Crypto')
        ? unlockError.message
        : 'Contraseña maestra incorrecta');
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel compact">
        <BrandLogo />
        <p className="eyebrow">Bienvenido de nuevo</p>
        <h1>Abre tu bóveda</h1>
        <p className="muted">Estás entrando a <strong>{profile.displayName}</strong>.</p>
        <form className="form-stack" autoComplete="off" onSubmit={handleSubmit}>
          <button className="ghost-button" type="button" onClick={onBack}>← Elegir otra bóveda</button>
          <SecureField id="unlockPassword" label="Contraseña maestra" value={masterPassword} onChange={setMasterPassword} />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isUnlocking || !masterPassword}>
            {isUnlocking ? 'Abriendo...' : 'Abrir mi bóveda'}
          </button>
          {onUseAnotherAccount && (
            <button className="ghost-button" type="button" onClick={onUseAnotherAccount}>Usar otra cuenta</button>
          )}
        </form>
      </section>
    </main>
  );
}
