export type Role = 'ADMIN' | 'KABID' | 'OPERATOR' | 'WARGA' | 'UNKNOWN';

/**
 * Normalize role string to canonical uppercase Role.
 * Accepts various input casings and some common synonyms.
 */
export function normalizeRole(raw?: string | null): Role {
  if (!raw) return 'UNKNOWN';
  const r = raw.trim().toUpperCase();
  if (r === 'ADMIN' || r === 'ADMINISTRATOR') return 'ADMIN';
  if (r === 'KABID' || r === 'KABID-PEGAWAI') return 'KABID';
  if (r === 'OPERATOR' || r === 'SUPIR' || r === 'DRIVER') return 'OPERATOR';
  if (r === 'WARGA' || r === 'USER' || r === 'CITIZEN') return 'WARGA';
  return 'UNKNOWN';
}

/**
 * Map canonical role to default landing route after login.
 */
export function getRoleRoute(role?: string | null): string {
  const r = normalizeRole(role);
  switch (r) {
    case 'ADMIN':
      return '/admin';
    case 'KABID':
      return '/kabid';
    case 'OPERATOR':
      return '/Supir';
    case 'WARGA':
      return '/';
    default:
      return '/';
  }
}

export default { normalizeRole, getRoleRoute };
