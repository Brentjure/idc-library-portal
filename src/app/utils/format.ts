/** Small text and colour helpers shared by many screens. */

/** "1 book", "3 books"; pass `many` for irregular plurals ("copy" → "copies"). */
export function plural(count: number, one: string, many = one + 's'): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Grace Mensah" → "GM" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Kenyan numbers are stored as 2547…; show them as 07xx xxx xxx. Anything else is shown as stored. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }
  const local = /^254([17]\d{8})$/.exec(phone);
  if (!local) {
    return phone;
  }
  const digits = '0' + local[1];
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/** Spine colours from the mockup. The same title always gets the same colour. */
const SPINE_COLOURS = [
  '#7A4B1E', '#3F5A4A', '#8A6A1A', '#3E6A8A', '#5B4A2E', '#3B4F6B',
  '#A0522D', '#4F3A2A', '#8B2F3A', '#2F6B6B', '#6B3A2F', '#3A4A2F',
  '#2F3A5B', '#5B2F2F', '#7A5A1E', '#4A3B5B',
];

export function coverColor(title: string): string {
  let hash = 0;
  for (const ch of title.toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return SPINE_COLOURS[Math.abs(hash) % SPINE_COLOURS.length];
}

/** "NEW" → "New" */
export function capitalise(word: string): string {
  return word.charAt(0) + word.slice(1).toLowerCase();
}

/** "ADMIN" → "Administrator", "HEAD_LIBRARIAN" → "Head Librarian". */
export function roleLabel(name: string | null | undefined): string {
  if (!name) return 'No role';
  if (name.toUpperCase() === 'ADMIN') return 'Administrator';
  return name
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(capitalise)
    .join(' ');
}
