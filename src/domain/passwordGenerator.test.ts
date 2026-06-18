import { describe, expect, it } from 'vitest';
import { generatePassword } from './passwordGenerator';
import { evaluatePasswordStrength } from './passwordStrength';

describe('generatePassword', () => {
  it('generates a strong default password', () => {
    const password = generatePassword();

    expect(password).toHaveLength(16);
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
    expect(evaluatePasswordStrength(password)).toBe('strong');
  });

  it('respects a custom length', () => {
    expect(generatePassword({ length: 24 })).toHaveLength(24);
  });
});
