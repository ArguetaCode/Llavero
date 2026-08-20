import { describe, expect, it } from 'vitest';
import {
  cloneProfileAsNewVault,
  createLocalVaultProfile,
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
});
