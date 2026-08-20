import { APP_VERSION } from '../app/appInfo';
import { CURRENT_CRYPTO_METADATA } from '../crypto/cryptoMetadata';
import { generateRandomId } from '../crypto/cryptoService';
import type { LocalVaultProfile, StoredVaultRecord } from '../domain/types';

const DB_NAME = 'llavero-seguro';
const DB_VERSION = 2;
const LEGACY_STORE_NAME = 'vault';
const PROFILE_STORE_NAME = 'vaultProfiles';
const MAIN_RECORD_ID = 'main';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        database.createObjectStore(LEGACY_STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(PROFILE_STORE_NAME)) {
        database.createObjectStore(PROFILE_STORE_NAME, { keyPath: 'vaultId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction, database: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function legacyRecordToProfile(record: StoredVaultRecord): LocalVaultProfile {
  const now = new Date().toISOString();
  return {
    vaultId: generateRandomId(),
    displayName: 'Mi bóveda',
    ...CURRENT_CRYPTO_METADATA,
    appVersion: record.appVersion ?? APP_VERSION,
    schemaVersion: record.schemaVersion,
    cryptoVersion: record.cryptoVersion ?? CURRENT_CRYPTO_METADATA.cryptoVersion,
    kdf: record.kdf ?? CURRENT_CRYPTO_METADATA.kdf,
    hash: record.hash ?? CURRENT_CRYPTO_METADATA.hash,
    iterations: record.iterations ?? CURRENT_CRYPTO_METADATA.iterations,
    cipher: record.cipher ?? CURRENT_CRYPTO_METADATA.cipher,
    salt: record.salt,
    iv: record.iv,
    encryptedVault: record.encryptedVault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? now,
  };
}

async function migrateLegacyVaultIfNeeded(database: IDBDatabase): Promise<void> {
  if (!database.objectStoreNames.contains(LEGACY_STORE_NAME) || !database.objectStoreNames.contains(PROFILE_STORE_NAME)) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([LEGACY_STORE_NAME, PROFILE_STORE_NAME], 'readwrite');
    const legacyStore = transaction.objectStore(LEGACY_STORE_NAME);
    const profileStore = transaction.objectStore(PROFILE_STORE_NAME);
    const countRequest = profileStore.count();

    countRequest.onsuccess = () => {
      if (countRequest.result > 0) return;
      const legacyRequest = legacyStore.get(MAIN_RECORD_ID);
      legacyRequest.onsuccess = () => {
        const legacyRecord = legacyRequest.result as StoredVaultRecord | undefined;
        if (legacyRecord) {
          profileStore.put(legacyRecordToProfile(legacyRecord));
          legacyStore.delete(MAIN_RECORD_ID);
        }
      };
      legacyRequest.onerror = () => reject(legacyRequest.error);
    };
    countRequest.onerror = () => reject(countRequest.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function openMigratedDatabase(): Promise<IDBDatabase> {
  const database = await openDatabase();
  await migrateLegacyVaultIfNeeded(database);
  return database;
}

export async function listVaultProfiles(): Promise<LocalVaultProfile[]> {
  const database = await openMigratedDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROFILE_STORE_NAME, 'readonly');
    const request = transaction.objectStore(PROFILE_STORE_NAME).getAll();

    request.onsuccess = () => resolve(request.result as LocalVaultProfile[]);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function getVaultProfile(vaultId: string): Promise<LocalVaultProfile | null> {
  const database = await openMigratedDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROFILE_STORE_NAME, 'readonly');
    const request = transaction.objectStore(PROFILE_STORE_NAME).get(vaultId);

    request.onsuccess = () => resolve((request.result as LocalVaultProfile | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function saveVaultProfile(profile: LocalVaultProfile): Promise<void> {
  const database = await openMigratedDatabase();
  const transaction = database.transaction(PROFILE_STORE_NAME, 'readwrite');
  transaction.objectStore(PROFILE_STORE_NAME).put(profile);
  await transactionDone(transaction, database);
}


export async function deleteVaultProfile(vaultId: string): Promise<void> {
  const database = await openMigratedDatabase();
  const transaction = database.transaction(PROFILE_STORE_NAME, 'readwrite');
  transaction.objectStore(PROFILE_STORE_NAME).delete(vaultId);
  await transactionDone(transaction, database);
}

export async function touchVaultProfile(vaultId: string, lastUnlockedAt = new Date().toISOString()): Promise<void> {
  const profile = await getVaultProfile(vaultId);
  if (!profile) return;
  await saveVaultProfile({ ...profile, lastUnlockedAt });
}

export async function getStoredVault(): Promise<LocalVaultProfile | null> {
  const profiles = await listVaultProfiles();
  return profiles[0] ?? null;
}

export async function saveStoredVault(record: Omit<StoredVaultRecord, 'id'>): Promise<void> {
  const existing = await getStoredVault();
  await saveVaultProfile({
    vaultId: existing?.vaultId ?? generateRandomId(),
    displayName: existing?.displayName ?? 'Mi bóveda',
    ...CURRENT_CRYPTO_METADATA,
    appVersion: record.appVersion ?? APP_VERSION,
    schemaVersion: record.schemaVersion,
    cryptoVersion: record.cryptoVersion ?? CURRENT_CRYPTO_METADATA.cryptoVersion,
    kdf: record.kdf ?? CURRENT_CRYPTO_METADATA.kdf,
    hash: record.hash ?? CURRENT_CRYPTO_METADATA.hash,
    iterations: record.iterations ?? CURRENT_CRYPTO_METADATA.iterations,
    cipher: record.cipher ?? CURRENT_CRYPTO_METADATA.cipher,
    salt: record.salt,
    iv: record.iv,
    encryptedVault: record.encryptedVault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  });
}

export function deleteVaultDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Cierra otras pestañas de Llavero Seguro e inténtalo de nuevo.'));
  });
}
