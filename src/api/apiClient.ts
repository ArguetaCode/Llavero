export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

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
}

interface ErrorResponse {
  message?: string;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. El modo local sigue disponible.', 0);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse;
    if (body.message) return body.message;
  } catch {
    // Use status-based fallback below.
  }

  if (response.status === 401) return 'Sesión remota inválida. Inicia sesión otra vez.';
  if (response.status === 413) return 'El payload cifrado supera el tamaño permitido.';
  if (response.status >= 500) return 'El servidor no pudo procesar la solicitud.';
  return 'No se pudo completar la solicitud.';
}
