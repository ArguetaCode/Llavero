import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadApiClient(apiBaseUrl = 'http://api.test') {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', apiBaseUrl);
  return import('./apiClient');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.resetModules();
});

describe('ApiError', () => {
  it('keeps a friendly message and status without sensitive data', async () => {
    const { ApiError } = await loadApiClient('');
    const error = new ApiError('No se pudo conectar con el servidor. El modo local sigue disponible.', 0);

    expect(error.message).toBe('No se pudo conectar con el servidor. El modo local sigue disponible.');
    expect(error.status).toBe(0);
  });

  it('blocks remote requests when the API is not configured', async () => {
    const { apiRequest } = await loadApiClient('');

    await expect(apiRequest('/api/vaults')).rejects.toMatchObject({
      message: 'La sincronización remota no está configurada. El modo local sigue disponible.',
      status: 0,
    });
  });

  it('normalizes invalid remote credentials', async () => {
    const { apiRequest } = await loadApiClient();
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
    const { apiRequest } = await loadApiClient();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    await expect(apiRequest('/api/vaults', { token: 'token' })).rejects.toMatchObject({
      message: 'Sesión remota vencida o inválida. Inicia sesión otra vez.',
      status: 403,
    });
  });

  it('handles successful responses without JSON', async () => {
    const { apiRequest } = await loadApiClient();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest('/api/empty')).resolves.toBeUndefined();
  });

  it('uses the current browser host when a localhost API is opened from another device', async () => {
    const { resolveApiBaseUrl } = await loadApiClient('http://localhost:8080');

    expect(resolveApiBaseUrl('http://localhost:8080', '192.168.1.20')).toBe('http://192.168.1.20:8080');
  });

  it('normalizes network failures without leaking request data', async () => {
    const { apiRequest } = await loadApiClient();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/api/vaults', { token: 'secret-token' })).rejects.toMatchObject({
      message: 'No se pudo conectar con el servidor. El modo local sigue disponible.',
      status: 0,
    });
  });

  it('normalizes timeouts', async () => {
    const { apiRequest } = await loadApiClient();
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
