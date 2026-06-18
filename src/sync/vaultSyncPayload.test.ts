import { describe, expect, it } from 'vitest';
import { createRemoteVaultUploadPayload, findExistingRemoteVault, parseRemoteEncryptedPayload } from './vaultSyncPayload';
import type { LocalVaultProfile } from '../domain/types';
import type { RemoteVault } from '../api/vaultSyncApi';

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

const remoteVaults: RemoteVault[] = [
  {
    id: 'remote-1',
    clientVaultId: 'other-vault',
    displayName: 'Otra',
    encryptedPayload: '{}',
    payloadVersion: 1,
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T01:00:00.000Z',
    deletedAt: null,
  },
  {
    id: 'remote-2',
    clientVaultId: 'vault-1',
    displayName: 'Personal',
    encryptedPayload: '{}',
    payloadVersion: 1,
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T01:00:00.000Z',
    deletedAt: null,
  },
];

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

  it('finds an existing remote vault by stored remoteVaultId first', () => {
    const result = findExistingRemoteVault({ ...profile, remoteVaultId: 'remote-1' }, remoteVaults);

    expect(result?.id).toBe('remote-1');
  });

  it('falls back to clientVaultId when no stored remoteVaultId matches', () => {
    const result = findExistingRemoteVault({ ...profile, remoteVaultId: 'missing-remote' }, remoteVaults);

    expect(result?.id).toBe('remote-2');
  });

  it('returns null when the local vault has no matching remote vault', () => {
    const result = findExistingRemoteVault({ ...profile, vaultId: 'new-vault' }, remoteVaults);

    expect(result).toBeNull();
  });
});
