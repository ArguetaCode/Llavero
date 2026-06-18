import { apiRequest } from './apiClient';

export interface RemoteUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  status: string;
}

export interface AuthResponse {
  token: string;
  user: RemoteUser;
}

export interface RegisterRemoteInput {
  email: string;
  displayName: string;
  password: string;
}

export interface LoginRemoteInput {
  email: string;
  password: string;
}

export function registerRemote(input: RegisterRemoteInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function loginRemote(input: LoginRemoteInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchRemoteMe(token: string): Promise<RemoteUser> {
  return apiRequest<RemoteUser>('/api/auth/me', { token });
}
