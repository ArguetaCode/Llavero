export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '');
export const isRemoteApiConfigured = API_BASE_URL.length > 0;
const DEFAULT_TIMEOUT_MS = 10000;
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
  timeoutMs?: number;
}

interface ErrorResponse {
  message?: string;
}

export function resolveApiBaseUrl(configuredUrl: string, currentHostname = globalThis.location?.hostname): string {
  const trimmedUrl = configuredUrl.replace(/\/$/, '');
  if (!trimmedUrl) return '';
  if (trimmedUrl.startsWith('/')) return trimmedUrl;
  if (!currentHostname) return trimmedUrl;

  try {
    const apiUrl = new URL(trimmedUrl);
    if (LOCAL_HOSTNAMES.has(apiUrl.hostname) && !LOCAL_HOSTNAMES.has(currentHostname)) {
      apiUrl.hostname = currentHostname;
      return apiUrl.toString().replace(/\/$/, '');
    }
  } catch {
    return trimmedUrl;
  }

  return trimmedUrl;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!isRemoteApiConfigured) {
    throw new ApiError('La sincronización remota no está configurada. El modo local sigue disponible.', 0);
  }

  const { token, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await fetch(buildApiUrl(API_BASE_URL, path), {
      ...requestOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    throw normalizeFetchError(error);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response, path), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('El servidor devolvió una respuesta inválida.', response.status);
  }
}

function normalizeFetchError(error: unknown): ApiError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError('El servidor tardó demasiado en responder. El modo local sigue disponible.', 0);
  }
  return new ApiError('No se pudo conectar con el servidor. El modo local sigue disponible.', 0);
}

async function readErrorMessage(response: Response, path: string): Promise<string> {
  const fallback = statusMessage(response.status, path);

  try {
    const body = (await response.json()) as ErrorResponse;
    if (body.message && response.status === 400) return body.message;
    if (body.message && response.status >= 400 && response.status < 500) return fallback;
  } catch {
    // Use status-based fallback below.
  }

  return fallback;
}

export function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl) return normalizedPath;
  if (baseUrl === '/api' && normalizedPath.startsWith('/api/')) return normalizedPath;

  return `${baseUrl}${normalizedPath}`;
}

function statusMessage(status: number, path: string): string {
  if (status === 400) return 'La solicitud no tiene un formato válido.';
  if (status === 401 && path.startsWith('/api/auth/login')) return 'Credenciales remotas incorrectas.';
  if (status === 401 && path.startsWith('/api/auth/register')) return 'No se pudo crear la cuenta remota con esos datos.';
  if (status === 401 || status === 403) return 'Sesión remota vencida o inválida. Inicia sesión otra vez.';
  if (status === 404) return 'No se encontró el recurso remoto solicitado.';
  if (status === 409) return 'Ya existe un recurso remoto con esos datos.';
  if (status === 413) return 'El payload cifrado supera el tamaño permitido.';
  if (status >= 500) return 'El servidor no pudo procesar la solicitud. El modo local sigue disponible.';
  return 'No se pudo completar la solicitud.';
}
