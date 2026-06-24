import type { PasswordEntry } from '../domain/types';

interface CredentialIconProps {
  entry: PasswordEntry;
}

const knownSites = [
  { keys: ['facebook', 'fb.com'], label: 'f', name: 'facebook' },
  { keys: ['instagram'], label: '◎', name: 'instagram' },
  { keys: ['google', 'gmail'], label: 'G', name: 'google' },
  { keys: ['github'], label: 'GH', name: 'github' },
  { keys: ['microsoft', 'outlook', 'live.com'], label: 'M', name: 'microsoft' },
  { keys: ['amazon'], label: 'a', name: 'amazon' },
] as const;

function getWebsiteHost(website: string): string {
  if (!website.trim()) return '';

  try {
    const normalizedWebsite = website.includes('://') ? website : `https://${website}`;
    return new URL(normalizedWebsite).hostname.toLowerCase();
  } catch {
    return website.toLowerCase();
  }
}

export function CredentialIcon({ entry }: CredentialIconProps) {
  const searchableSite = `${entry.title.toLowerCase()} ${getWebsiteHost(entry.website)}`;
  const knownSite = knownSites.find((site) => site.keys.some((key) => searchableSite.includes(key)));

  if (knownSite) {
    return (
      <span className={`credential-icon ${knownSite.name}`} aria-hidden="true">
        {knownSite.label}
      </span>
    );
  }

  return (
    <span className="credential-icon generic" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5S14.1 18.2 12 20.5C9.9 18.2 8.8 15.4 8.8 12S9.9 5.8 12 3.5Z" />
      </svg>
    </span>
  );
}
