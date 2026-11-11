import { createContext, useContext } from 'react';
import type { Keypair } from '@stellar/stellar-sdk';

export interface VaultContextValue {
  ensureUnlocked: () => Promise<Keypair>;
}

export const VaultContext = createContext<VaultContextValue | null>(null);

export const CANCELLED = 'Unlock cancelled.';

/**
 * `ensureUnlocked()` resolves with the signing Keypair, prompting for the wallet
 * password first if the vault is locked. It rejects with `Error(CANCELLED)` if
 * the user dismisses the prompt.
 */
export const useVault = (): VaultContextValue => {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used inside <VaultProvider>.');
  return ctx;
};

