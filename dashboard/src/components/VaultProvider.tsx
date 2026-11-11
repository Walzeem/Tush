import { useCallback, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Keypair } from '@stellar/stellar-sdk';
import {
  MIN_PASSWORD_LENGTH,
  getKeypair,
  hasLegacySecret,
  isUnlocked,
  migrateLegacySecret,
  unlock,
} from '../utils/vault';
import { VaultContext, CANCELLED } from './vaultContext';
import './VaultProvider.css';

interface PendingUnlock {
  promise: Promise<Keypair>;
  resolve: (kp: Keypair) => void;
  reject: (err: Error) => void;
}

export default function VaultProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<{ migrate: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<PendingUnlock | null>(null);

  const close = useCallback(() => {
    setPrompt(null);
    setPassword('');
    setConfirm('');
    setError('');
    setBusy(false);
  }, []);

  const ensureUnlocked = useCallback((): Promise<Keypair> => {
    if (isUnlocked()) return Promise.resolve(getKeypair());
    if (pending.current) return pending.current.promise;
    let resolve!: (kp: Keypair) => void;
    let reject!: (err: Error) => void;
    const promise = new Promise<Keypair>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    pending.current = { promise, resolve, reject };
    setPrompt({ migrate: hasLegacySecret() });
    return promise;
  }, []);

  const cancel = () => {
    pending.current?.reject(new Error(CANCELLED));
    pending.current = null;
    close();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    if (prompt.migrate && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (prompt.migrate) await migrateLegacySecret(password);
      else await unlock(password);
      pending.current?.resolve(getKeypair());
      pending.current = null;
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock wallet.');
      setBusy(false);
    }
  };

  const value = useMemo(() => ({ ensureUnlocked }), [ensureUnlocked]);

  return (
    <VaultContext.Provider value={value}>
      {children}
      {prompt && (
        <div className="vault-overlay" role="dialog" aria-modal="true" aria-label="Unlock wallet">
          <form className="vault-dialog" onSubmit={submit}>
            <h2>{prompt.migrate ? 'Secure your wallet' : 'Unlock wallet'}</h2>
            <p>
              {prompt.migrate
                ? 'Your wallet key is currently stored unencrypted on this device. Set a password to encrypt it.'
                : 'Enter your password to approve this action.'}
            </p>
            <input
              type="password"
              autoFocus
              autoComplete={prompt.migrate ? 'new-password' : 'current-password'}
              placeholder={prompt.migrate ? `New password (min ${MIN_PASSWORD_LENGTH} characters)` : 'Password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
            {prompt.migrate && (
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              />
            )}
            {error && <div className="vault-error">{error}</div>}
            <button type="submit" className="vault-primary" disabled={!password || busy}>
              {busy ? 'Working…' : prompt.migrate ? 'Encrypt wallet' : 'Unlock'}
            </button>
            <button type="button" className="vault-secondary" onClick={cancel} disabled={busy}>
              Cancel
            </button>
          </form>
        </div>
      )}
    </VaultContext.Provider>
  );
}

