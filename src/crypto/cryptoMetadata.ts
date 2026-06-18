export const APP_NAME = 'Llavero Seguro';
export const SCHEMA_VERSION = 1;
export const CRYPTO_VERSION = 1;
export const KDF_ALGORITHM = 'PBKDF2';
export const HASH_ALGORITHM = 'SHA-256';
export const PBKDF2_ITERATIONS = 250_000;
export const CIPHER_ALGORITHM = 'AES-GCM';

export interface CryptoMetadata {
  appName: string;
  schemaVersion: number;
  cryptoVersion: number;
  kdf: string;
  hash: string;
  iterations: number;
  cipher: string;
}

export const CURRENT_CRYPTO_METADATA: CryptoMetadata = {
  appName: APP_NAME,
  schemaVersion: SCHEMA_VERSION,
  cryptoVersion: CRYPTO_VERSION,
  kdf: KDF_ALGORITHM,
  hash: HASH_ALGORITHM,
  iterations: PBKDF2_ITERATIONS,
  cipher: CIPHER_ALGORITHM,
};

export function getCompatibleCryptoMetadata(input: Partial<CryptoMetadata> = {}): CryptoMetadata {
  return {
    appName: input.appName ?? APP_NAME,
    schemaVersion: input.schemaVersion ?? SCHEMA_VERSION,
    cryptoVersion: input.cryptoVersion ?? CRYPTO_VERSION,
    kdf: input.kdf ?? KDF_ALGORITHM,
    hash: input.hash ?? HASH_ALGORITHM,
    iterations: input.iterations ?? PBKDF2_ITERATIONS,
    cipher: input.cipher ?? CIPHER_ALGORITHM,
  };
}

export function validateCryptoMetadata(input: Partial<CryptoMetadata> = {}): string[] {
  const metadata = getCompatibleCryptoMetadata(input);
  const errors: string[] = [];

  if (metadata.appName !== APP_NAME) errors.push('El respaldo no pertenece a Llavero Seguro.');
  if (metadata.schemaVersion !== SCHEMA_VERSION) errors.push('La versión del esquema no es compatible.');
  if (metadata.cryptoVersion !== CRYPTO_VERSION) errors.push('La versión criptográfica no es compatible.');
  if (metadata.kdf !== KDF_ALGORITHM) errors.push('El algoritmo KDF no es compatible.');
  if (metadata.hash !== HASH_ALGORITHM) errors.push('El hash no es compatible.');
  if (metadata.iterations !== PBKDF2_ITERATIONS) errors.push('Las iteraciones PBKDF2 no son compatibles.');
  if (metadata.cipher !== CIPHER_ALGORITHM) errors.push('El cifrado no es compatible.');

  return errors;
}
