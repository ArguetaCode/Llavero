import { createVaultBackup, parseVaultBackupJson } from '../backup/vaultBackup';
import type { LocalVaultProfile } from '../domain/types';

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
