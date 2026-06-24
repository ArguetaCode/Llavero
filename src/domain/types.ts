export type PasswordCategory = 'Personal' | 'Trabajo' | 'Estudio' | 'Banco' | 'Redes';

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordEntry {
  id: string;
  title: string;
  website: string;
  username: string;
  password: string;
  category: PasswordCategory;
  notes: string;
  createdAt: string;
  updatedAt: string;
  strength: PasswordStrength;
}

export interface VaultData {
  entries: PasswordEntry[];
  updatedAt: string;
}

export interface StoredVaultRecord {
  id?: 'main';
  appName?: string;
  appVersion?: string;
  cryptoVersion?: number;
  kdf?: string;
  hash?: string;
  iterations?: number;
  cipher?: string;
  salt: string;
  iv: string;
  encryptedVault: string;
  createdAt: string;
  updatedAt?: string;
  schemaVersion: number;
}

export interface LocalVaultProfile {
  vaultId: string;
  displayName: string;
  appName?: string;
  appVersion?: string;
  schemaVersion: number;
  cryptoVersion?: number;
  kdf?: string;
  hash?: string;
  iterations?: number;
  cipher?: string;
  salt: string;
  iv: string;
  encryptedVault: string;
  createdAt: string;
  updatedAt: string;
  lastUnlockedAt?: string;
  lastRemoteSyncAt?: string;
  lastRemoteUploadAt?: string;
  lastRemoteDownloadAt?: string;
  remoteVaultId?: string;
  remoteDisplayName?: string;
}

export interface BackupImportPreview {
  exportedAt: string;
  itemCount: number;
  schemaVersion: number;
  displayName?: string;
  source?: 'file' | 'remote';
  remoteVaultId?: string;
  remoteDisplayName?: string;
  remoteUpdatedAt?: string;
  existingLocalVaultId?: string;
}

export type AppView =
  | 'vault'
  | 'add'
  | 'detail'
  | 'security';

export interface PasswordFormValues {
  title: string;
  website: string;
  username: string;
  password: string;
  category: PasswordCategory;
  notes: string;
}
