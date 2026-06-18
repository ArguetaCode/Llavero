interface PasswordGeneratorOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
}

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const NUMBERS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

function getSecureIndex(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

export function generatePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options;

  const groups = [
    includeUppercase ? UPPERCASE : '',
    includeLowercase ? LOWERCASE : '',
    includeNumbers ? NUMBERS : '',
    includeSymbols ? SYMBOLS : '',
  ].filter(Boolean);

  const pool = groups.join('');

  if (!pool) {
    throw new Error('Debe existir al menos un grupo de caracteres.');
  }

  const safeLength = Math.max(length, groups.length);
  const chars: string[] = groups.map((group) => group[getSecureIndex(group.length)]);

  while (chars.length < safeLength) {
    chars.push(pool[getSecureIndex(pool.length)]);
  }

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = getSecureIndex(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
}
