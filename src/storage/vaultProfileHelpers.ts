import { APP_VERSION } from '../app/appInfo';
import { CURRENT_CRYPTO_METADATA, SCHEMA_VERSION } from '../crypto/cryptoMetadata';
import { generateRandomId } from '../crypto/cryptoService';
import type { LocalVaultProfile } from '../domain/types';

interface CreateProfileInput {
  displayName: string;
  salt: string;
  iv: string;
  encryptedVault: string;
  createdAt?: string;
  updatedAt?: string;
  vaultId?: string;
}

export function createLocalVaultProfile(input: CreateProfileInput): LocalVaultProfile {
  const now = new Date().toISOString();
  return {
    vaultId: input.vaultId ?? generateRandomId(),
    displayName: input.displayName.trim() || 'Bóveda local',
    ...CURRENT_CRYPTO_METADATA,
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    salt: input.salt,
    iv: input.iv,
    encryptedVault: input.encryptedVault,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function cloneProfileAsNewVault(profile: LocalVaultProfile, displayName?: string): LocalVaultProfile {
  const now = new Date().toISOString();
  return {
    ...profile,
    vaultId: generateRandomId(),
    displayName: displayName?.trim() || `${profile.displayName} importada`,
    createdAt: now,
    updatedAt: profile.updatedAt || now,
    lastUnlockedAt: undefined,
  };
}

export function summarizeProfiles(profiles: LocalVaultProfile[]): Array<Pick<LocalVaultProfile, 'vaultId' | 'displayName' | 'updatedAt' | 'lastUnlockedAt'>> {
  return profiles.map(({ vaultId, displayName, updatedAt, lastUnlockedAt }) => ({ vaultId, displayName, updatedAt, lastUnlockedAt }));
}
