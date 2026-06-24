import { describe, expect, it } from 'vitest';
import { auditVault } from './vaultAudit';
import type { PasswordEntry } from './types';

function entry(overrides: Partial<PasswordEntry>): PasswordEntry {
  return {
    id: 'id',
    title: 'Title',
    website: 'https://example.com',
    username: 'user',
    password: 'Secret123!',
    category: 'Personal',
    notes: '',
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:00:00.000Z',
    strength: 'medium',
    ...overrides,
  };
}

describe('auditVault', () => {
  it('calculates vault audit metrics and repeated counts', () => {
    const audit = auditVault({
      updatedAt: '2026-06-18T12:00:00.000Z',
      entries: [
        entry({ id: 'a', password: 'same', strength: 'weak', website: '' }),
        entry({ id: 'b', password: 'same', strength: 'strong' }),
        entry({ id: 'c', password: 'unique', strength: 'medium' }),
      ],
    });

    expect(audit).toMatchObject({
      total: 3,
      weak: 1,
      medium: 1,
      strong: 1,
      repeated: 2,
      missingWebsite: 1,
      updatedAt: '2026-06-18T12:00:00.000Z',
      repeatedCountsByEntryId: { a: 2, b: 2 },
    });
  });
});
