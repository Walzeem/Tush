// Proof that the caller controls the address they are registering a tag for.
import { createHash } from 'node:crypto';
import { Keypair } from '@stellar/stellar-base';

const SEP53_PREFIX = 'Stellar Signed Message:\n';

export interface RegistrationPayload {
  username: string;
  address: string;
  memo_type?: string | null;
  memo?: string | null;
}

export const registrationMessage = ({ username, address, memo_type, memo }: RegistrationPayload): string =>
  memo_type ? `register:${username}:${address}:${memo_type}:${memo}` : `register:${username}:${address}`;

const decodeSignature = (signature: unknown): Buffer | null => {
  if (typeof signature !== 'string' || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(signature)) return null;
  const bytes = Buffer.from(signature, 'base64');
  return bytes.length === 64 ? bytes : null;
};

export function verifySignature({
  address,
  message,
  signature,
}: {
  address: string;
  message: string;
  signature: unknown;
}): boolean {
  const sig = decodeSignature(signature);
  if (!sig) return false;

  const keypair = Keypair.fromPublicKey(address);
  const text = Buffer.from(message, 'utf8');
  const sep53 = createHash('sha256').update(Buffer.concat([Buffer.from(SEP53_PREFIX), text])).digest();

  try {
    return keypair.verify(sep53, sig) || keypair.verify(text, sig);
  } catch {
    return false;
  }
}

