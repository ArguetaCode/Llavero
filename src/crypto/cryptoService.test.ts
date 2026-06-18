import { describe, expect, it } from 'vitest';
import { decryptVault, deriveKey, encryptVault, generateSalt } from './cryptoService';
import type { VaultData } from '../domain/types';

describe('cryptoService', () => {
  it('encrypts and decrypts a vault with the same derived key', async () => {
    const salt = generateSalt();
    const key = await deriveKey('master-password-for-test', salt);
    const vault: VaultData = {
      entries: [],
      updatedAt: '2026-06-18T00:00:00.000Z',
    };

    const encrypted = await encryptVault(vault, key);
    const decrypted = await decryptVault(encrypted.encryptedVault, key, encrypted.iv);

    expect(encrypted.encryptedVault).not.toContain('master-password-for-test');
    expect(encrypted.iv).toBeTruthy();
    expect(decrypted).toEqual(vault);
  });

  it('rejects decryption with a different password', async () => {
    const salt = generateSalt();
    const key = await deriveKey('correct-master-password', salt);
    const wrongKey = await deriveKey('wrong-master-password', salt);
    const encrypted = await encryptVault({ entries: [], updatedAt: new Date().toISOString() }, key);

    await expect(decryptVault(encrypted.encryptedVault, wrongKey, encrypted.iv)).rejects.toThrow();
  });

  it('uses a new iv for each encryption', async () => {
    const key = await deriveKey('master-password-for-test', generateSalt());
    const vault: VaultData = { entries: [], updatedAt: '2026-06-18T00:00:00.000Z' };

    const first = await encryptVault(vault, key);
    const second = await encryptVault(vault, key);

    expect(first.iv).not.toBe(second.iv);
    expect(first.encryptedVault).not.toBe(second.encryptedVault);
  });

  it('supports re-encrypting a vault with a new master password', async () => {
    const originalSalt = generateSalt();
    const originalKey = await deriveKey('old-master-password', originalSalt);
    const vault: VaultData = { entries: [], updatedAt: '2026-06-18T00:00:00.000Z' };
    const originalEncrypted = await encryptVault(vault, originalKey);

    const decrypted = await decryptVault(originalEncrypted.encryptedVault, originalKey, originalEncrypted.iv);
    const nextSalt = generateSalt();
    const nextKey = await deriveKey('new-master-password', nextSalt);
    const nextEncrypted = await encryptVault(decrypted, nextKey);

    await expect(decryptVault(nextEncrypted.encryptedVault, originalKey, nextEncrypted.iv)).rejects.toThrow();
    await expect(decryptVault(nextEncrypted.encryptedVault, nextKey, nextEncrypted.iv)).resolves.toEqual(vault);
  });
});
