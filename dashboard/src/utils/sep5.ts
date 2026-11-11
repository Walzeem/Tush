// SEP-5 key derivation for Stellar: BIP-39 mnemonic -> SLIP-10 ed25519 -> m/44'/148'/index'.
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0005.md
import { Keypair } from '@stellar/stellar-sdk';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

const HARDENED = 0x80000000;
const enc = new TextEncoder();

async function hmacSha512(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data as BufferSource));
}

async function slip10Ed25519(seed: Uint8Array, path: number[]): Promise<Uint8Array> {
  let I = await hmacSha512(enc.encode('ed25519 seed'), seed);
  let key = I.slice(0, 32);
  let chain = I.slice(32);
  for (const index of path) {
    const data = new Uint8Array(37);
    data.set(key, 1); // data[0] = 0x00
    new DataView(data.buffer).setUint32(33, (index | HARDENED) >>> 0, false);
    I = await hmacSha512(chain, data);
    key = I.slice(0, 32);
    chain = I.slice(32);
  }
  return key;
}

/** New 12-word recovery phrase (128 bits of entropy). */
export const newMnemonic = (): string => generateMnemonic(wordlist, 128);

export const normalizeMnemonic = (phrase: string): string =>
  phrase.trim().toLowerCase().split(/\s+/).join(' ');

export const isValidMnemonic = (phrase: string): boolean =>
  validateMnemonic(normalizeMnemonic(phrase), wordlist);

/** Stellar keypair for account `index` of a mnemonic (index 0 is what other SEP-5 wallets show first). */
export async function keypairFromMnemonic(phrase: string, index = 0): Promise<Keypair> {
  const seed = await mnemonicToSeed(normalizeMnemonic(phrase));
  const key = await slip10Ed25519(seed, [44, 148, index]);
  return Keypair.fromRawEd25519Seed(Buffer.from(key));
}

