import { describe, expect, it } from 'vitest';
import { ApiError } from './apiClient';

describe('ApiError', () => {
  it('keeps a friendly message and status without sensitive data', () => {
    const error = new ApiError('No se pudo conectar con el servidor. El modo local sigue disponible.', 0);

    expect(error.message).toBe('No se pudo conectar con el servidor. El modo local sigue disponible.');
    expect(error.status).toBe(0);
  });
});
