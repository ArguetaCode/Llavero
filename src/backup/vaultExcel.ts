import type { PasswordEntry, VaultData } from '../domain/types';

export interface ExcelExportRow {
  vault: string;
  title: string;
  website: string;
  username: string;
  password: string;
  category: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const EXCEL_MIME_TYPE = 'application/vnd.ms-excel';

export function createVaultCredentialRows(displayName: string, vault: VaultData): ExcelExportRow[] {
  return vault.entries.map((entry: PasswordEntry) => ({
    vault: displayName,
    title: entry.title,
    website: entry.website,
    username: entry.username,
    password: entry.password,
    category: entry.category,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));
}

export function createExcelFileName(date = new Date()): string {
  return `llavero-seguro-credenciales-${date.toISOString().slice(0, 10)}.xls`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character] ?? character));
}

const columns: Array<keyof ExcelExportRow> = ['vault', 'title', 'website', 'username', 'password', 'category', 'notes', 'createdAt', 'updatedAt'];
const labels = ['Bóveda', 'Título', 'Sitio / script', 'Usuario', 'Contraseña', 'Categoría', 'Notas', 'Creada', 'Actualizada'];

export function createExcelWorkbook(rows: ExcelExportRow[]): Blob {
  const header = `<Row>${labels.map((label) => `<Cell><Data ss:Type="String">${escapeXml(label)}</Data></Cell>`).join('')}</Row>`;
  const tableRows = rows.map((row) => `<Row>${columns.map((column) => `<Cell><Data ss:Type="String">${escapeXml(row[column])}</Data></Cell>`).join('')}</Row>`).join('');
  const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Credenciales"><Table>${header}${tableRows}</Table></Worksheet></Workbook>`;
  return new Blob([workbook], { type: EXCEL_MIME_TYPE });
}
