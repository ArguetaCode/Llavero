import { describe, expect, it } from 'vitest';
import { BACKUP_APP_NAME, createBackupFileName, createVaultBackup, parseVaultBackupJson, validateVaultBackup } from './vaultBackup';
import { CIPHER_ALGORITHM, CRYPTO_VERSION, HASH_ALGORITHM, KDF_ALGORITHM, PBKDF2_ITERATIONS } from '../crypto/cryptoMetadata';
import { APP_VERSION } from '../app/appInfo';
import type { StoredVaultRecord } from '../domain/types';

const storedVault: StoredVaultRecord = {
  id: 'main',
  salt: 'salt-value',
  iv: 'iv-value',
  encryptedVault: 'encrypted-value',
  createdAt: '2026-06-18T00:00:00.000Z',
  schemaVersion: 1,
};

describe('vaultBackup', () => {
  it('creates an encrypted backup payload without local-only fields', () => {
    const backup = createVaultBackup(storedVault, '2026-06-18T12:00:00.000Z');

    expect(backup).toEqual({
      appName: BACKUP_APP_NAME,
      schemaVersion: 1,
      cryptoVersion: CRYPTO_VERSION,
      kdf: KDF_ALGORITHM,
      hash: HASH_ALGORITHM,
      iterations: PBKDF2_ITERATIONS,
      cipher: CIPHER_ALGORITHM,
      appVersion: APP_VERSION,
      exportedAt: '2026-06-18T12:00:00.000Z',
      salt: 'salt-value',
      iv: 'iv-value',
      encryptedVault: 'encrypted-value',
      createdAt: '2026-06-18T00:00:00.000Z',
      updatedAt: '2026-06-18T12:00:00.000Z',
    });
    expect('id' in backup).toBe(false);
  });

  it('validates a correct backup structure', () => {
    const backup = createVaultBackup(storedVault);
    const result = validateVaultBackup(backup);

    expect(result.errors).toHaveLength(0);
    expect(result.backup.encryptedVault).toBe('encrypted-value');
  });

  it('rejects an invalid backup structure', () => {
    const result = validateVaultBackup({
      appName: 'Other',
      schemaVersion: 99,
      exportedAt: 'not-a-date',
      salt: '',
      iv: '',
      encryptedVault: '',
    });

    expect(result.errors).toEqual([
      'El respaldo no pertenece a Llavero Seguro.',
      'La versión del esquema no es compatible.',
      'La fecha de exportación no es válida.',
      'El respaldo no contiene salt válido.',
      'El respaldo no contiene IV válido.',
      'El respaldo no contiene una bóveda cifrada válida.',
    ]);
  });

  it('rejects invalid json input', () => {
    expect(parseVaultBackupJson('{bad json').errors).toEqual(['El archivo no contiene JSON válido.']);
  });

  it('creates a dated backup file name', () => {
    expect(createBackupFileName(new Date('2026-06-18T12:00:00.000Z'))).toBe('llavero-seguro-backup-2026-06-18.json');
  });
});
