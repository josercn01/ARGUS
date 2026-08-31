/**
 * Parser for the `administradores` column in `administradores_locais`.
 *
 * The column contains entries in heterogeneous formats:
 *  1. Multiple users separated by pipe+space: `fparente | cebfaria | hisayasu | mazza` (4 admins)
 *  2. Group/matricula associated to prefix: `EE0395 | SEC-Administradores` (2 admins)
 *  3. Single user with CPF/ID: `fparente | 6664746153` (1 admin — the number is NOT a user)
 *  4. Multiple admins separated by comma, semicolon, or newlines.
 *
 * Rules:
 *  - Split on `|`, `,`, `;`, and `\n`.
 *  - After splitting, if a token is purely numeric (CPF/matricula) or matches the
 *    hostname prefix pattern, it is attached to the preceding user as metadata
 *    rather than counted as a separate administrator.
 */

const NUMERIC_RE = /^\d{3,}$/;
const HOSTNAME_PREFIX_RE = /^[A-Z]{2}\d{3,}/i;

function isMetadataToken(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  return NUMERIC_RE.test(trimmed) || HOSTNAME_PREFIX_RE.test(trimmed);
}

function isLikelyGroup(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  return trimmed.includes('-') && !NUMERIC_RE.test(trimmed);
}

export function parseAdminList(str: string | null | undefined): string[] {
  if (!str || !str.trim()) return [];

  const rawTokens = str
    .split(/[|,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const admins: string[] = [];

  for (const token of rawTokens) {
    if (isMetadataToken(token) && admins.length > 0) {
      continue;
    }
    if (isLikelyGroup(token) && admins.length > 0) {
      admins.push(token);
      continue;
    }
    admins.push(token);
  }

  return admins;
}

export function countAdmins(str: string | null | undefined): number {
  return parseAdminList(str).length;
}

export function formatAdminList(str: string | null | undefined): string {
  const list = parseAdminList(str);
  if (list.length === 0) return '—';
  if (list.length <= 3) return list.join(', ');
  return `${list.slice(0, 3).join(', ')} +${list.length - 3}`;
}
