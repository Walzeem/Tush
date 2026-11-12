// SEP-0043 / Stellar Wallet Standard provider (`window.tushWallet`).
//
// Exposes standard non-custodial wallet methods to Stellar dApps:
//   - getAddress()
//   - getNetwork()
//   - signTransaction(xdr, opts?)
//   - signMessage(message, opts?)
//   - signAuthEntry(entryXdr, opts?)
import { Keypair, Networks, TransactionBuilder, hash } from '@stellar/stellar-sdk';
import { getAddress } from './vault';
import { getCachedTag, signMessageSep53 } from './tags';

const DAPPS_STORAGE_KEY = 'tush_connected_dapps';

export interface ConnectedDapp {
  origin: string;
  name: string;
  connectedAt: string;
  lastUsedAt: string;
}

export interface TushWalletProvider {
  isTushWallet: true;
  name: string;
  version: string;
  getAddress(): Promise<{ address: string; tag?: string }>;
  getNetwork(): Promise<{ network: string; networkPassphrase: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ): Promise<{ signedTxXdr: string; signerAddress: string }>;
  signMessage(
    message: string,
    opts?: { address?: string },
  ): Promise<{ signedMessage: string; signerAddress: string }>;
  signAuthEntry(
    entryXdr: string,
    opts?: { address?: string },
  ): Promise<{ signedAuthEntry: string; signerAddress: string }>;
}

declare global {
  interface Window {
    tushWallet?: TushWalletProvider;
  }
}

export function syncExtensionStorage(): void {
  try {
    const g = globalThis as any;
    if (typeof g.chrome !== 'undefined' && g.chrome?.storage?.local) {
      g.chrome.storage.local.set({
        tush_wallet_address: getAddress() || '',
        tush_user_tag: getCachedTag() || '',
        tush_connected_dapps: getConnectedDapps(),
      });
    }
  } catch {
    // Ignore storage sync errors outside extension environment
  }
}

export function getConnectedDapps(): ConnectedDapp[] {
  try {
    const raw = localStorage.getItem(DAPPS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConnectedDapp[]) : [];
  } catch {
    return [];
  }
}

export function recordDappConnection(origin: string, name = origin): ConnectedDapp[] {
  const now = new Date().toISOString();
  const list = getConnectedDapps().filter((d) => d.origin !== origin);
  const next: ConnectedDapp[] = [{ origin, name, connectedAt: now, lastUsedAt: now }, ...list];
  localStorage.setItem(DAPPS_STORAGE_KEY, JSON.stringify(next));
  syncExtensionStorage();
  return next;
}

export function revokeDappConnection(origin: string): ConnectedDapp[] {
  const next = getConnectedDapps().filter((d) => d.origin !== origin);
  localStorage.setItem(DAPPS_STORAGE_KEY, JSON.stringify(next));
  syncExtensionStorage();
  return next;
}

/**
 * Registers `window.tushWallet` so any SEP-43 / Stellar Wallets Kit dApp can
 * discover and request signatures from Tush Wallet.
 */
export function registerSep43Provider(ensureUnlocked: () => Promise<Keypair>): TushWalletProvider {
  syncExtensionStorage();

  const touchOrigin = () => {
    if (typeof window !== 'undefined' && window.location?.origin && !window.location.protocol.startsWith('chrome-extension')) {
      recordDappConnection(window.location.origin, document.title || 'Tush dApp');
    } else {
      syncExtensionStorage();
    }
  };

  const provider: TushWalletProvider = {
    isTushWallet: true,
    name: 'Tush Wallet',
    version: '1.0.0',

    async getAddress() {
      const address = getAddress();
      if (!address) {
        const kp = await ensureUnlocked();
        touchOrigin();
        return { address: kp.publicKey(), tag: getCachedTag() || undefined };
      }
      touchOrigin();
      return { address, tag: getCachedTag() || undefined };
    },

    async getNetwork() {
      return {
        network: 'TESTNET',
        networkPassphrase: Networks.TESTNET,
      };
    },

    async signTransaction(xdr, opts) {
      const kp = await ensureUnlocked();
      if (opts?.address && opts.address !== kp.publicKey()) {
        throw new Error('Requested signer address does not match the active Tush wallet.');
      }
      const passphrase = opts?.networkPassphrase || Networks.TESTNET;
      const tx = TransactionBuilder.fromXDR(xdr, passphrase);
      tx.sign(kp);
      touchOrigin();
      return {
        signedTxXdr: tx.toXDR(),
        signerAddress: kp.publicKey(),
      };
    },

    async signMessage(message, opts) {
      const kp = await ensureUnlocked();
      if (opts?.address && opts.address !== kp.publicKey()) {
        throw new Error('Requested signer address does not match the active Tush wallet.');
      }
      const signedMessage = await signMessageSep53(kp, message);
      touchOrigin();
      return {
        signedMessage,
        signerAddress: kp.publicKey(),
      };
    },

    async signAuthEntry(entryXdr, opts) {
      const kp = await ensureUnlocked();
      if (opts?.address && opts.address !== kp.publicKey()) {
        throw new Error('Requested signer address does not match the active Tush wallet.');
      }
      const raw = Buffer.from(entryXdr, 'base64');
      const sig = kp.sign(hash(raw)).toString('base64');
      touchOrigin();
      return {
        signedAuthEntry: sig,
        signerAddress: kp.publicKey(),
      };
    },
  };

  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'tushWallet', {
        value: provider,
        writable: true,
        configurable: true,
      });
    } catch {
      try {
        window.tushWallet = provider;
      } catch {
        // Ignore if another extension locked window.tushWallet
      }
    }
    window.dispatchEvent(new CustomEvent('tush-wallet:ready', { detail: provider }));
  }

  return provider;
}

