import { describe, expect, it } from 'vitest';
import {
  APP_NAME,
  CIPHER_ALGORITHM,
  CRYPTO_VERSION,
  HASH_ALGORITHM,
  KDF_ALGORITHM,
  PBKDF2_ITERATIONS,
  SCHEMA_VERSION,
  getCompatibleCryptoMetadata,
  validateCryptoMetadata,
} from './cryptoMetadata';

describe('cryptoMetadata', () => {
  it('fills legacy metadata with current safe defaults', () => {
    expect(getCompatibleCryptoMetadata({})).toEqual({
      appName: APP_NAME,
      schemaVersion: SCHEMA_VERSION,
      cryptoVersion: CRYPTO_VERSION,
      kdf: KDF_ALGORITHM,
      hash: HASH_ALGORITHM,
      iterations: PBKDF2_ITERATIONS,
      cipher: CIPHER_ALGORITHM,
    });
  });

  it('rejects unsupported crypto metadata', () => {
    expect(
      validateCryptoMetadata({
        appName: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        cryptoVersion: 99,
        kdf: 'Argon2id',
        hash: HASH_ALGORITHM,
        iterations: 1,
        cipher: 'XChaCha20-Poly1305',
      }),
    ).toEqual([
      'La versión criptográfica no es compatible.',
      'El algoritmo KDF no es compatible.',
      'Las iteraciones PBKDF2 no son compatibles.',
      'El cifrado no es compatible.',
    ]);
  });
});
