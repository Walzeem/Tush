// Encrypted key vault.
//
// The recovery phrase (or an imported legacy secret) is encrypted with
// AES-256-GCM under a key derived from the user's password via PBKDF2-SHA256.
// Only ciphertext is persisted. The decrypted keypair lives in memory and is
// dropped on lock, page reload, or after AUTO_LOCK_MS of inactivity.
import { Keypair } from '@stellar/stellar-sdk';
import { keypairFromMnemonic } from './sep5';

const VAULT_KEY = 'tush_vault';
const ADDRESS_KEY = 'tush_wallet_address';
const LEGACY_SECRET_KEY = 'tush_wallet_secret';
const PBKDF2_ITERATIONS = 600_000;
const AUTO_LOCK_MS = 15 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;

interface VaultPayload {
  type: 'mnemonic' | 'secret';
  data: string;
}

interface EncryptedVault {
  v: number;
  kdf: string;
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

type VaultListener = (unlocked: boolean) => void;

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (bytes: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let session: { keypair: Keypair } | null = null;
let lockTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<VaultListener>();

const emit = (): void => listeners.forEach((fn) => fn(isUnlocked()));
export const subscribe = (fn: VaultListener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptPayload(payload: VaultPayload, password: string): Promise<EncryptedVault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(payload)),
  );
  return { v: 1, kdf: 'pbkdf2-sha256', iter: PBKDF2_ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

async function decryptPayload(vault: EncryptedVault, password: string): Promise<VaultPayload> {
  const key = await deriveKey(password, unb64(vault.salt), vault.iter);
  try {
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(vault.iv) as BufferSource },
      key,
      unb64(vault.ct) as BufferSource,
    );
    return JSON.parse(dec.decode(pt)) as VaultPayload;
  } catch {
    throw new Error('Incorrect password.');
  }
}

const readVault = (): EncryptedVault | null => {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? (JSON.parse(raw) as EncryptedVault) : null;
  } catch {
    return null;
  }
};

const keypairFromPayload = (payload: VaultPayload): Promise<Keypair> =>
  payload.type === 'mnemonic'
    ? keypairFromMnemonic(payload.data)
    : Promise.resolve(Keypair.fromSecret(payload.data));

function startSession(keypair: Keypair): void {
  session = { keypair };
  touch();
  emit();
}

/** Resets the inactivity timer. Called on every signing request. */
function touch(): void {
  clearTimeout(lockTimer);
  lockTimer = setTimeout(lock, AUTO_LOCK_MS);
}

export const hasVault = (): boolean => !!readVault();
export const hasLegacySecret = (): boolean => !readVault() && !!localStorage.getItem(LEGACY_SECRET_KEY);
export const isUnlocked = (): boolean => !!session;
export const getAddress = (): string | null => localStorage.getItem(ADDRESS_KEY);

export function lock(): void {
  clearTimeout(lockTimer);
  session = null;
  emit();
}

function assertPassword(password: string): void {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

/** Encrypts `mnemonic` under `password`, stores it, and unlocks. Returns the public key. */
export async function createVaultFromMnemonic(mnemonic: string, password: string): Promise<string> {
  assertPassword(password);
  const keypair = await keypairFromMnemonic(mnemonic);
  const vault = await encryptPayload({ type: 'mnemonic', data: mnemonic }, password);
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  localStorage.setItem(ADDRESS_KEY, keypair.publicKey());
  localStorage.removeItem(LEGACY_SECRET_KEY);
  startSession(keypair);
  return keypair.publicKey();
}

/** One-time upgrade of a plaintext secret from older builds into the encrypted vault. */
export async function migrateLegacySecret(password: string): Promise<string> {
  assertPassword(password);
  const secret = localStorage.getItem(LEGACY_SECRET_KEY);
  if (!secret) throw new Error('No legacy wallet found.');
  const keypair = Keypair.fromSecret(secret);
  const vault = await encryptPayload({ type: 'secret', data: secret }, password);
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  localStorage.setItem(ADDRESS_KEY, keypair.publicKey());
  localStorage.removeItem(LEGACY_SECRET_KEY);
  startSession(keypair);
  return keypair.publicKey();
}

export async function unlock(password: string): Promise<string> {
  const vault = readVault();
  if (!vault) throw new Error('No wallet found on this device.');
  const keypair = await keypairFromPayload(await decryptPayload(vault, password));
  startSession(keypair);
  return keypair.publicKey();
}

/** Verifies the password and returns the recovery phrase (null for imported-secret wallets). */
export async function revealMnemonic(password: string): Promise<string | null> {
  const vault = readVault();
  if (!vault) throw new Error('No wallet found on this device.');
  const payload = await decryptPayload(vault, password);
  return payload.type === 'mnemonic' ? payload.data : null;
}

/** Keypair for signing. Throws if locked; callers should go through `ensureUnlocked`. */
export function getKeypair(): Keypair {
  if (!session) throw new Error('Wallet is locked.');
  touch();
  return session.keypair;
}

export function removeWallet(): void {
  lock();
  [VAULT_KEY, ADDRESS_KEY, LEGACY_SECRET_KEY, 'tush_user_tag'].forEach((k) => localStorage.removeItem(k));
}

