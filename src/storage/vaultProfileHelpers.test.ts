import { describe, expect, it } from 'vitest';
import {
  cloneProfileAsNewVault,
  createLocalVaultProfile,
  findLocalProfileForRemoteImport,
  findLocalProfilesForRemoteImport,
  prepareRemoteProfileImport,
  summarizeProfiles,
} from './vaultProfileHelpers';

describe('vaultProfileHelpers', () => {
  it('creates a local vault profile with metadata', () => {
    const profile = createLocalVaultProfile({
      displayName: ' Personal ',
      salt: 'salt',
      iv: 'iv',
      encryptedVault: 'encrypted',
      vaultId: 'vault-1',
      createdAt: '2026-06-18T00:00:00.000Z',
      updatedAt: '2026-06-18T00:00:00.000Z',
    });

    expect(profile).toMatchObject({
      vaultId: 'vault-1',
      displayName: 'Personal',
      salt: 'salt',
      iv: 'iv',
      encryptedVault: 'encrypted',
      schemaVersion: 1,
    });
  });

  it('imports a profile as a new vault without reusing vaultId', () => {
    const profile = createLocalVaultProfile({
      displayName: 'Trabajo',
      salt: 'salt',
      iv: 'iv',
      encryptedVault: 'encrypted',
      vaultId: 'original',
    });

    const imported = cloneProfileAsNewVault(profile);

    expect(imported.vaultId).not.toBe('original');
    expect(imported.displayName).toBe('Trabajo importada');
    expect(imported.encryptedVault).toBe('encrypted');
  });

  it('summarizes profiles without encrypted data', () => {
    const profile = createLocalVaultProfile({
      displayName: 'Personal',
      salt: 'salt',
      iv: 'iv',
      encryptedVault: 'encrypted',
      vaultId: 'vault-1',
    });

    expect(summarizeProfiles([profile])).toEqual([
      {
        vaultId: 'vault-1',
        displayName: 'Personal',
        updatedAt: profile.updatedAt,
        lastUnlockedAt: undefined,
      },
    ]);
  });

  it('finds an existing remote import before creating another local profile', () => {
    const existing = {
      ...createLocalVaultProfile({
        displayName: 'Personal',
        salt: 'old-salt',
        iv: 'old-iv',
        encryptedVault: 'old-encrypted',
        vaultId: 'local-vault',
      }),
      remoteVaultId: 'remote-vault',
    };

    const imported = createLocalVaultProfile({
      displayName: 'Personal remota',
      salt: 'remote-salt',
      iv: 'remote-iv',
      encryptedVault: 'remote-encrypted',
      vaultId: 'source-vault',
    });

    expect(findLocalProfileForRemoteImport([existing], 'remote-vault', imported)).toBe(existing);
  });

  it('recognizes historical copies by their cryptographic salt and keeps the oldest identity', () => {
    const original = createLocalVaultProfile({
      displayName: 'Mi bóveda',
      salt: 'shared-salt',
      iv: 'old-iv',
      encryptedVault: 'old-encrypted',
      vaultId: 'original-local',
      createdAt: '2026-06-18T00:00:00.000Z',
    });
    const previousImport = {
      ...createLocalVaultProfile({
        displayName: 'Personal importada',
        salt: 'shared-salt',
        iv: 'imported-iv',
        encryptedVault: 'imported-encrypted',
        vaultId: 'previous-import',
        createdAt: '2026-06-24T00:00:00.000Z',
      }),
      remoteVaultId: 'remote-vault',
    };
    const incoming = createLocalVaultProfile({
      displayName: 'Personal remota',
      salt: 'shared-salt',
      iv: 'incoming-iv',
      encryptedVault: 'incoming-encrypted',
      vaultId: 'remote-source',
    });

    expect(findLocalProfilesForRemoteImport([previousImport, original], 'remote-vault', incoming)).toEqual([
      original,
      previousImport,
    ]);
  });

  it('updates an existing remote import without changing its local identity', () => {
    const existing = createLocalVaultProfile({
      displayName: 'Personal',
      salt: 'old-salt',
      iv: 'old-iv',
      encryptedVault: 'old-encrypted',
      vaultId: 'local-vault',
      createdAt: '2026-06-18T00:00:00.000Z',
    });
    const imported = createLocalVaultProfile({
      displayName: 'Personal remota',
      salt: 'new-salt',
      iv: 'new-iv',
      encryptedVault: 'new-encrypted',
      vaultId: 'source-vault',
    });

    expect(prepareRemoteProfileImport(imported, existing)).toMatchObject({
      vaultId: 'local-vault',
      displayName: 'Personal',
      createdAt: '2026-06-18T00:00:00.000Z',
      encryptedVault: 'new-encrypted',
    });
  });
});
