import { useState } from 'react';
import { SecureField } from '../components/SecureField';
import { decryptVault, deriveKey } from '../crypto/cryptoService';
import type { LocalVaultProfile, VaultData } from '../domain/types';

interface UnlockPageProps {
  profile: LocalVaultProfile;
  onBack: () => void;
  onUnlock: (vault: VaultData, key: CryptoKey) => Promise<void>;
}

export function UnlockPage({ profile, onBack, onUnlock }: UnlockPageProps) {
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setIsUnlocking(true);

    try {
      const key = await deriveKey(masterPassword, profile.salt);
      const vault = await decryptVault(profile.encryptedVault, key, profile.iv);
      await onUnlock(vault, key);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Web Crypto')) {
        setError(error.message);
      } else {
        setError('Contraseña maestra incorrecta');
      }
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel compact">
        <div className="brand-mark">LS</div>
        <p className="eyebrow">Bienvenido de nuevo</p>
        <h1>Abre tu bóveda</h1>
        <p className="muted">Estás entrando a <strong>{profile.displayName}</strong>.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <button className="ghost-button" type="button" onClick={onBack}>
            ← Elegir otra bóveda
          </button>
          <SecureField
            id="unlockPassword"
            label="Contraseña maestra"
            value={masterPassword}
            autoComplete="current-password"
            onChange={setMasterPassword}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isUnlocking || !masterPassword}>
            {isUnlocking ? 'Abriendo...' : 'Abrir mi bóveda'}
          </button>
          <button className="link-button" type="button" onClick={() => setShowRecoveryHelp(true)}>
            ¿Olvidaste tu contraseña maestra?
          </button>
        </form>
      </section>
      {showRecoveryHelp && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle">
          <div className="modal-panel">
            <h2 id="recoveryTitle">Sin recuperación de contraseña</h2>
            <p>
              Llavero Seguro no guarda tu contraseña maestra. Si la olvidaste, solo puedes importar un respaldo cifrado con su
              contraseña correcta o eliminar la bóveda local y empezar de nuevo.
            </p>
            <div className="modal-actions single">
              <button className="primary-button" type="button" onClick={() => setShowRecoveryHelp(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
