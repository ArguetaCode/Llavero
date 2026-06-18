import { describe, expect, it } from 'vitest';
import { createRemoteVaultUploadPayload, parseRemoteEncryptedPayload } from './vaultSyncPayload';
import type { LocalVaultProfile } from '../domain/types';

const profile: LocalVaultProfile = {
  vaultId: 'vault-1',
  displayName: 'Personal',
  appName: 'Llavero Seguro',
  appVersion: '0.1.0',
  schemaVersion: 1,
  cryptoVersion: 1,
  kdf: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 250000,
  cipher: 'AES-GCM',
  salt: 'salt',
  iv: 'iv',
  encryptedVault: 'encrypted',
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T01:00:00.000Z',
};

describe('vaultSyncPayload', () => {
  it('creates an opaque remote payload without decrypted entries', () => {
    const payload = createRemoteVaultUploadPayload(profile);

    expect(payload.clientVaultId).toBe('vault-1');
    expect(payload.displayName).toBe('Personal');
    expect(payload.payloadVersion).toBe(1);
    expect(payload.encryptedPayload).toContain('"encryptedVault":"encrypted"');
    expect(payload.encryptedPayload).not.toContain('password');
  });

  it('parses remote encrypted payload as backup metadata', () => {
    const payload = createRemoteVaultUploadPayload(profile);
    const result = parseRemoteEncryptedPayload(payload.encryptedPayload);

    expect(result.errors).toHaveLength(0);
    expect(result.backup.vaultId).toBe('vault-1');
  });
});
