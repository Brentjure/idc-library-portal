/**
 * The live checklist on Set up your account. The server checks the same rules (PasswordRules.java),
 * so keep the two in step.
 */
export interface ChecklistItem {
  label: string;
  ok: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword1',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyui', '1q2w3e4r', 'abc12345', 'abcd1234',
  'iloveyou1', 'welcome1', 'welcome123', 'letmein1', 'admin123', 'monkey123', 'football1', 'sunshine1',
  'jesus123', 'jesus1234', 'jesuslovesme1', 'blessed1', 'god12345', 'church123', 'library1', 'library123',
]);

export function passwordChecklist(password: string, confirm: string, name: string, email: string): ChecklistItem[] {
  const lower = password.toLowerCase();
  const parts = [...name.split(/\s+/), email.split('@')[0] ?? ''].filter((p) => p.length >= 3);
  const personal = parts.some((p) => lower.includes(p.toLowerCase()));
  return [
    { label: `At least ${MIN_PASSWORD_LENGTH} characters`, ok: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'A letter and a number', ok: /\p{L}/u.test(password) && /\d/.test(password) },
    { label: 'Not your name, email or a common password', ok: !!password && !personal && !COMMON.has(lower) },
    { label: 'Both passwords match', ok: !!password && password === confirm },
  ];
}

export function passwordReady(items: ChecklistItem[]): boolean {
  return items.every((item) => item.ok);
}
