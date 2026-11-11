// Input validation and normalisation for tag names, addresses and memos.
import { StrKey } from '@stellar/stellar-base';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export const RESERVED_NAMES = new Set<string>([
  'admin', 'administrator', 'root', 'support', 'help', 'security', 'staff', 'team', 'official',
  'moderator', 'system', 'api', 'www', 'mail', 'info', 'contact', 'billing', 'wallet', 'tush',
  'stellar', 'lumens', 'xlm', 'sdf', 'horizon', 'soroban', 'freighter', 'lobstr', 'albedo',
  'xbull', 'usdc', 'circle', 'null', 'undefined',
]);

export const isValidAddress = (value: unknown): value is string =>
  typeof value === 'string' && StrKey.isValidEd25519PublicKey(value);

export const normalizeUsername = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase();

export function usernameIssues(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') return ['username is required'];
  const name = normalizeUsername(value);
  const issues: string[] = [];
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    issues.push(`username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters`);
  }
  if (!/^[a-z0-9]+$/.test(name)) issues.push('username must contain only letters and numbers');
  if (issues.length === 0 && RESERVED_NAMES.has(name)) issues.push('username is reserved');
  return issues;
}

export interface ParsedMemo {
  memo_type: string | null;
  memo: string | null;
}

const MAX_U64 = 18446744073709551615n;

export function parseMemo(memoType: unknown, memo: unknown, issues: string[]): ParsedMemo {
  const hasType = memoType !== undefined && memoType !== null && memoType !== '';
  const hasMemo = memo !== undefined && memo !== null && memo !== '';
  if (!hasType && !hasMemo) return { memo_type: null, memo: null };
  if (hasType !== hasMemo) {
    issues.push(hasType ? 'memo is required when memo_type is set' : 'memo_type is required when memo is set');
    return { memo_type: null, memo: null };
  }

  const type = String(memoType).toLowerCase();
  const value = String(memo);
  if (type === 'text') {
    if (Buffer.byteLength(value, 'utf8') > 28) issues.push('text memo must not exceed 28 bytes');
  } else if (type === 'id') {
    if (!/^\d+$/.test(value) || BigInt(value) > MAX_U64) issues.push('id memo must be an unsigned 64-bit integer');
  } else if (type === 'hash') {
    const bytes = /^[A-Za-z0-9+/]+={0,2}$/.test(value) ? Buffer.from(value, 'base64') : null;
    if (!bytes || bytes.length !== 32) issues.push('hash memo must be 32 bytes, base64 encoded');
  } else {
    issues.push('memo_type must be one of: text, id, hash');
  }
  return { memo_type: type, memo: value };
}

