import type { LocalVaultProfile, StoredVaultRecord } from '../domain/types';
import {
  APP_NAME,
  CURRENT_CRYPTO_METADATA,
  type CryptoMetadata,
  getCompatibleCryptoMetadata,
  validateCryptoMetadata,
} from '../crypto/cryptoMetadata';
import { APP_VERSION } from '../app/appInfo';

export const BACKUP_APP_NAME = APP_NAME;

export interface VaultBackupFile extends CryptoMetadata {
  vaultId?: string;
  displayName?: string;
  appVersion?: string;
  exportedAt: string;
  salt: string;
  iv: string;
  encryptedVault: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidatedVaultBackup {
  backup: VaultBackupFile;
  errors: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function createVaultBackup(record: StoredVaultRecord | LocalVaultProfile, exportedAt = new Date().toISOString()): VaultBackupFile {
  const metadata = getCompatibleCryptoMetadata(record);

  return {
    ...metadata,
    ...('vaultId' in record ? { vaultId: record.vaultId } : {}),
    ...('displayName' in record ? { displayName: record.displayName } : {}),
    appVersion: APP_VERSION,
    exportedAt,
    salt: record.salt,
    iv: record.iv,
    encryptedVault: record.encryptedVault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? exportedAt,
  };
}

export function createBackupFileName(date = new Date()): string {
  const yyyyMmDd = date.toISOString().slice(0, 10);
  return `llavero-seguro-backup-${yyyyMmDd}.json`;
}

export function validateVaultBackup(input: unknown): ValidatedVaultBackup {
  const errors: string[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      backup: {} as VaultBackupFile,
      errors: ['El archivo no tiene una estructura JSON válida.'],
    };
  }

  const candidate = input as Partial<VaultBackupFile>;
  const metadataErrors = validateCryptoMetadata(candidate);

  errors.push(...metadataErrors);

  if (!isNonEmptyString(candidate.exportedAt) || Number.isNaN(Date.parse(candidate.exportedAt))) {
    errors.push('La fecha de exportación no es válida.');
  }

  if (!isNonEmptyString(candidate.salt)) {
    errors.push('El respaldo no contiene salt válido.');
  }

  if (!isNonEmptyString(candidate.iv)) {
    errors.push('El respaldo no contiene IV válido.');
  }

  if (!isNonEmptyString(candidate.encryptedVault)) {
    errors.push('El respaldo no contiene una bóveda cifrada válida.');
  }

  if (candidate.createdAt !== undefined && (!isNonEmptyString(candidate.createdAt) || Number.isNaN(Date.parse(candidate.createdAt)))) {
    errors.push('La fecha de creación no es válida.');
  }

  if (candidate.updatedAt !== undefined && (!isNonEmptyString(candidate.updatedAt) || Number.isNaN(Date.parse(candidate.updatedAt)))) {
    errors.push('La fecha de actualización no es válida.');
  }

  return {
    backup: {
      ...CURRENT_CRYPTO_METADATA,
      ...candidate,
      vaultId: candidate.vaultId,
      displayName: candidate.displayName,
      appVersion: candidate.appVersion ?? APP_VERSION,
      createdAt: candidate.createdAt ?? candidate.exportedAt ?? new Date().toISOString(),
      updatedAt: candidate.updatedAt ?? candidate.exportedAt ?? new Date().toISOString(),
    } as VaultBackupFile,
    errors,
  };
}

export function parseVaultBackupJson(json: string): ValidatedVaultBackup {
  try {
    return validateVaultBackup(JSON.parse(json));
  } catch {
    return {
      backup: {} as VaultBackupFile,
      errors: ['El archivo no contiene JSON válido.'],
    };
  }
}
