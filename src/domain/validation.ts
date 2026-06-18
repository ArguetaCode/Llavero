export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function isValidOptionalWebsite(value: string): boolean {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  const candidate = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;

  try {
    const url = new URL(candidate);
    return Boolean(url.hostname.includes('.')) && ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
