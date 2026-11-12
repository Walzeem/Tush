// Name tags, backed by the SEP-2 federation server.
//
// A tag is stored as a federation address `name*domain` and shown as `@name`.
// Resolution and reverse lookup go through the federation endpoints, so any
// SEP-2 aware wallet can resolve `name*domain` too. Claiming a tag is proven by
// signing `register:<name>:<address>` with the wallet key (SEP-53 message hash).
import { StrKey, type Keypair } from '@stellar/stellar-sdk';

export const API_BASE: string =
  import.meta.env?.VITE_API_BASE ||
  (import.meta.env?.PROD ? 'https://tush-backend-h586.onrender.com' : 'http://localhost:4000');
export const DEFAULT_FEDERATION_DOMAIN: string =
  import.meta.env?.VITE_FEDERATION_DOMAIN || 'tush-alpha.vercel.app';

const TAG_CACHE_KEY = 'tush_user_tag';
const SEP53_PREFIX = 'Stellar Signed Message:\n';
export const TAG_MIN = 3;
export const TAG_MAX = 20;

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface RecipientResolution {
  address?: string;
  tag?: string;
  error?: string;
}

/** Failure with a user-presentable message and a machine-readable `code`. */
export class TagError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'TagError';
    this.code = code;
  }
}

/** `@Alice`, `alice`, `alice*domain` -> `alice` (lowercase, no prefix or domain). */
export const tagName = (input: unknown): string =>
  String(input ?? '').trim().replace(/^@/, '').split('*')[0].toLowerCase();

export const formatTag = (name: unknown): string => (name ? `@${tagName(name)}` : '');

/** Returns an error message for an invalid name, or '' when it is valid. */
export function validateTagName(input: unknown): string {
  const name = tagName(input);
  if (name.length < TAG_MIN || name.length > TAG_MAX) {
    return `Tag must be ${TAG_MIN}-${TAG_MAX} characters.`;
  }
  if (!/^[a-z0-9]+$/.test(name)) return 'Tags can only contain letters and numbers.';
  return '';
}

export const toFederationAddress = (input: unknown, domain = DEFAULT_FEDERATION_DOMAIN): string => {
  const raw = String(input ?? '').trim().replace(/^@/, '').toLowerCase();
  return raw.includes('*') ? raw : `${raw}*${domain}`;
};

async function apiError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string; details?: Array<{ message: string }> };
  } | null;
  const message = body?.error?.message;
  const details = body?.error?.details;
  if (Array.isArray(details) && details.length) return details.map((d) => d.message).join(' ');
  return typeof message === 'string' && message ? message : fallback;
}

/** Address a tag points to, or null if the tag is not registered. Throws on network/server errors. */
export async function resolveTag(input: string, { signal }: RequestOptions = {}): Promise<string | null> {
  const response = await fetch(
    `${API_BASE}/federation?q=${encodeURIComponent(toFederationAddress(input))}&type=name`,
    { signal },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new TagError(await apiError(response, 'Could not look up that tag.'), 'LOOKUP_FAILED');
  const data = (await response.json()) as { account_id?: string };
  return data?.account_id || null;
}

/** Tag registered to an address as `@name`, or '' if none. Throws on network/server errors. */
export async function lookupTagByAddress(address: string, { signal }: RequestOptions = {}): Promise<string> {
  const response = await fetch(`${API_BASE}/lookup?address=${encodeURIComponent(address)}`, { signal });
  if (response.status === 404) return '';
  if (!response.ok) throw new TagError(await apiError(response, 'Could not load your tag.'), 'LOOKUP_FAILED');
  const data = (await response.json()) as { username?: string };
  return data?.username ? formatTag(data.username) : '';
}

export async function isTagAvailable(input: string, opts?: RequestOptions): Promise<boolean> {
  return (await resolveTag(input, opts)) === null;
}

export const getCachedTag = (): string => localStorage.getItem(TAG_CACHE_KEY) || '';
export const setCachedTag = (tag: string): void => {
  if (tag) localStorage.setItem(TAG_CACHE_KEY, tag);
  else localStorage.removeItem(TAG_CACHE_KEY);
};

/** Refreshes the local cache from the federation server (the source of truth). */
export async function syncTag(address: string, opts?: RequestOptions): Promise<string> {
  const tag = await lookupTagByAddress(address, opts);
  setCachedTag(tag);
  return tag;
}

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

/** SEP-53: ed25519 signature over sha256("Stellar Signed Message:\n" + message). */
export async function signMessageSep53(keypair: Keypair, message: string): Promise<string> {
  const payload = new TextEncoder().encode(SEP53_PREFIX + message);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', payload));
  return toBase64(keypair.sign(Buffer.from(digest)));
}

/** Claims `input` for the keypair's address. Returns the display tag (`@name`). */
export async function registerTag(input: string, keypair: Keypair): Promise<string> {
  const invalid = validateTagName(input);
  if (invalid) throw new TagError(invalid, 'INVALID_NAME');

  const name = tagName(input);
  const address = keypair.publicKey();
  const signature = await signMessageSep53(keypair, `register:${name}:${address}`);

  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, address, signature, signerAddress: address }),
  });
  if (response.status === 409) {
    throw new TagError('That tag is already taken. Try another.', 'TAKEN');
  }
  if (!response.ok) throw new TagError(await apiError(response, 'Could not register that tag.'), 'REGISTER_FAILED');

  const tag = formatTag(name);
  setCachedTag(tag);
  return tag;
}

/**
 * Resolves what a user typed in a "send to" field: a G... address, `@tag`, or
 * `name*domain`. Returns `{ address, tag? }`, or `{ error }` for bad input.
 */
export async function resolveRecipient(input: string, opts?: RequestOptions): Promise<RecipientResolution> {
  const value = String(input ?? '').trim();
  if (!value) return { error: 'Enter an @tag or wallet address.' };

  if (StrKey.isValidEd25519PublicKey(value)) return { address: value };
  if (value.startsWith('G') && value.length >= 50 && !value.includes('*')) {
    return { error: 'That is not a valid Stellar address.' };
  }

  const domain = value.includes('*') ? value.split('*')[1].toLowerCase() : DEFAULT_FEDERATION_DOMAIN;
  if (domain !== DEFAULT_FEDERATION_DOMAIN) {
    return { error: `Only tags on ${DEFAULT_FEDERATION_DOMAIN} are supported here.` };
  }
  const invalid = validateTagName(value);
  if (invalid) return { error: invalid };

  const address = await resolveTag(value, opts);
  if (!address) return { error: `No wallet found for ${formatTag(value)}.` };
  return { address, tag: formatTag(value) };
}

