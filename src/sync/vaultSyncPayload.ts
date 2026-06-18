import { createVaultBackup, parseVaultBackupJson } from '../backup/vaultBackup';
import type { LocalVaultProfile } from '../domain/types';
import type { RemoteVault } from '../api/vaultSyncApi';

export interface RemoteVaultUploadPayload {
  clientVaultId: string;
  displayName: string;
  encryptedPayload: string;
  payloadVersion: number;
}

export function createRemoteVaultUploadPayload(profile: LocalVaultProfile): RemoteVaultUploadPayload {
  const backup = createVaultBackup(profile);
  return {
    clientVaultId: profile.vaultId,
    displayName: profile.displayName,
    encryptedPayload: JSON.stringify(backup),
    payloadVersion: backup.schemaVersion,
  };
}

export function parseRemoteEncryptedPayload(encryptedPayload: string) {
  return parseVaultBackupJson(encryptedPayload);
}

export function findExistingRemoteVault(profile: LocalVaultProfile, remoteVaults: RemoteVault[]): RemoteVault | null {
  if (profile.remoteVaultId) {
    const byRemoteId = remoteVaults.find((remoteVault) => remoteVault.id === profile.remoteVaultId);
    if (byRemoteId) return byRemoteId;
  }

  return remoteVaults.find((remoteVault) => remoteVault.clientVaultId === profile.vaultId) ?? null;
}
