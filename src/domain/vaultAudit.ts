import type { PasswordEntry, VaultData } from './types';

export interface VaultAudit {
  total: number;
  weak: number;
  medium: number;
  strong: number;
  repeated: number;
  missingWebsite: number;
  favorites: number;
  updatedAt: string;
  repeatedCountsByEntryId: Record<string, number>;
}

export function auditVault(vault: VaultData | { entries: PasswordEntry[]; updatedAt?: string }): VaultAudit {
  const passwordCounts = new Map<string, number>();

  vault.entries.forEach((entry) => {
    passwordCounts.set(entry.password, (passwordCounts.get(entry.password) ?? 0) + 1);
  });

  const repeatedCountsByEntryId: Record<string, number> = {};
  vault.entries.forEach((entry) => {
    const count = passwordCounts.get(entry.password) ?? 0;
    if (count > 1) {
      repeatedCountsByEntryId[entry.id] = count;
    }
  });

  return {
    total: vault.entries.length,
    weak: vault.entries.filter((entry) => entry.strength === 'weak').length,
    medium: vault.entries.filter((entry) => entry.strength === 'medium').length,
    strong: vault.entries.filter((entry) => entry.strength === 'strong').length,
    repeated: vault.entries.filter((entry) => (passwordCounts.get(entry.password) ?? 0) > 1).length,
    missingWebsite: vault.entries.filter((entry) => !entry.website.trim()).length,
    favorites: vault.entries.filter((entry) => entry.favorite).length,
    updatedAt: vault.updatedAt ?? '',
    repeatedCountsByEntryId,
  };
}
