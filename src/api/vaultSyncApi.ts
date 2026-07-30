import { API_BASE_URL, apiRequest, buildApiUrl } from './apiClient';
import type { ExcelExportRow } from '../backup/vaultExcel';

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

export async function exportRemoteVaultExcel(token: string, rows: ExcelExportRow[], fileName: string): Promise<Blob> {
  const response = await fetch(buildApiUrl(API_BASE_URL, '/api/vaults/export/excel'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName, rows }),
  });
  if (!response.ok) throw new Error('El servidor no pudo generar el archivo Excel.');
  return response.blob();
}
