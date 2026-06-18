import { describe, expect, it } from 'vitest';
import { evaluatePasswordStrength } from './passwordStrength';

describe('evaluatePasswordStrength', () => {
  it('marks very short passwords as weak', () => {
    expect(evaluatePasswordStrength('Ab1!')).toBe('weak');
  });

  it('marks mixed medium-length passwords as medium', () => {
    expect(evaluatePasswordStrength('CorrectHorse12')).toBe('medium');
  });

  it('marks long mixed passwords with symbols as strong', () => {
    expect(evaluatePasswordStrength('CorrectHorse12!Safe')).toBe('strong');
  });
});
