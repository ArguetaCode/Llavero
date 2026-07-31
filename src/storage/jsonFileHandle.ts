export interface JsonFileHandle {
  name?: string;
  createWritable: () => Promise<{ write: (content: string) => Promise<void>; close: () => Promise<void> }>;
  queryPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

const DB_NAME = 'llavero-file-handles';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'json-backup';

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo guardar la referencia del archivo JSON.'));
  });
}

export async function getStoredJsonFileHandle(): Promise<JsonFileHandle | null> {
  const database = await openHandleDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(HANDLE_KEY);
    request.onsuccess = () => resolve((request.result as JsonFileHandle | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('No se pudo recuperar el archivo JSON guardado.'));
  });
}

export async function saveJsonFileHandle(handle: JsonFileHandle): Promise<void> {
  const database = await openHandleDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('No se pudo guardar la referencia del archivo JSON.'));
  });
}
