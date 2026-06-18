import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError } from './apiClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ApiError', () => {
  it('keeps a friendly message and status without sensitive data', () => {
    const error = new ApiError('No se pudo conectar con el servidor. El modo local sigue disponible.', 0);

    expect(error.message).toBe('No se pudo conectar con el servidor. El modo local sigue disponible.');
    expect(error.status).toBe(0);
  });

  it('normalizes invalid remote credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Bad credentials stack detail' }), { status: 401 })),
    );

    await expect(apiRequest('/api/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      message: 'Credenciales remotas incorrectas.',
      status: 401,
    });
  });

  it('normalizes invalid token errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    await expect(apiRequest('/api/vaults', { token: 'token' })).rejects.toMatchObject({
      message: 'Sesión remota vencida o inválida. Inicia sesión otra vez.',
      status: 403,
    });
  });

  it('handles successful responses without JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest('/api/empty')).resolves.toBeUndefined();
  });

  it('normalizes network failures without leaking request data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/api/vaults', { token: 'secret-token' })).rejects.toMatchObject({
      message: 'No se pudo conectar con el servidor. El modo local sigue disponible.',
      status: 0,
    });
  });

  it('normalizes timeouts', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
      ),
    );

    const request = apiRequest('/api/vaults', { timeoutMs: 50 });
    const expectation = expect(request).rejects.toMatchObject({
      message: 'El servidor tardó demasiado en responder. El modo local sigue disponible.',
      status: 0,
    });
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
  });
});
