import type { VaultData } from '../domain/types';
import { CIPHER_ALGORITHM, HASH_ALGORITHM, KDF_ALGORITHM, PBKDF2_ITERATIONS } from './cryptoMetadata';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function assertWebCryptoAvailable(): void {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Web Crypto requiere HTTPS o localhost. En teléfono, abre la app desde una URL HTTPS para crear o desbloquear la bóveda.');
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API no está disponible en este navegador o contexto.');
  }
}

export function generateSalt(): string {
  assertWebCryptoAvailable();
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToBase64(salt);
}

export function generateRandomId(): string {
  assertWebCryptoAvailable();
  if (globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function deriveKey(masterPassword: string, salt: string): Promise<CryptoKey> {
  assertWebCryptoAvailable();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    KDF_ALGORITHM,
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: KDF_ALGORITHM,
      salt: toArrayBuffer(base64ToBytes(salt)),
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    { name: CIPHER_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptVault(
  vault: VaultData,
  key: CryptoKey,
): Promise<{ encryptedVault: string; iv: string }> {
  assertWebCryptoAvailable();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encoder = new TextEncoder();
  const encodedVault = encoder.encode(JSON.stringify(vault));
  const encrypted = await crypto.subtle.encrypt(
    { name: CIPHER_ALGORITHM, iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encodedVault),
  );

  return {
    encryptedVault: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptVault(
  encryptedVault: string,
  key: CryptoKey,
  iv: string,
): Promise<VaultData> {
  assertWebCryptoAvailable();
  const decrypted = await crypto.subtle.decrypt(
    { name: CIPHER_ALGORITHM, iv: toArrayBuffer(base64ToBytes(iv)) },
    key,
    toArrayBuffer(base64ToBytes(encryptedVault)),
  );
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted)) as VaultData;
}

export function clearSensitiveMemory(values: Array<unknown>): void {
  values.splice(0, values.length);
}
