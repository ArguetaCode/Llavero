import { apiRequest } from './apiClient';

export interface RemoteVault {
  id: string;
  clientVaultId: string;
  displayName: string;
  encryptedPayload: string;
  payloadVersion: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RemoteVaultRequest {
  clientVaultId: string;
  displayName: string;
  encryptedPayload: string;
  payloadVersion: number;
}

export function listRemoteVaults(token: string): Promise<RemoteVault[]> {
  return apiRequest<RemoteVault[]>('/api/vaults', { token });
}

export function createRemoteVault(token: string, input: RemoteVaultRequest): Promise<RemoteVault> {
  return apiRequest<RemoteVault>('/api/vaults', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function updateRemoteVault(token: string, id: string, input: RemoteVaultRequest): Promise<RemoteVault> {
  return apiRequest<RemoteVault>(`/api/vaults/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(input),
  });
}
