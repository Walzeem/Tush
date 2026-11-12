import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Keypair } from '@stellar/stellar-sdk';
import {
  MIN_PASSWORD_LENGTH,
  getKeypair,
  hasLegacySecret,
  isUnlocked,
  migrateLegacySecret,
  unlock,
} from '../utils/vault';
import {
  recordDappConnection,
  registerSep43Provider,
  syncExtensionStorage,
} from '../utils/sep43Provider';
import { VaultContext, CANCELLED } from './vaultContext';
import './VaultProvider.css';

interface PendingUnlock {
  promise: Promise<Keypair>;
  resolve: (kp: Keypair) => void;
  reject: (err: Error) => void;
}

interface ExtensionDappRequest {
  id: string;
  method: 'getAddress' | 'signTransaction' | 'signMessage' | 'signAuthEntry';
  params?: Record<string, any>;
  origin: string;
  title: string;
}

export default function VaultProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<{ migrate: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dappRequest, setDappRequest] = useState<ExtensionDappRequest | null>(null);
  const [dappBusy, setDappBusy] = useState(false);
  const [dappError, setDappError] = useState('');
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

  useEffect(() => {
    const provider = registerSep43Provider(ensureUnlocked);
    const g = globalThis as any;
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get('dappRequest');
    if (requestId && typeof g.chrome !== 'undefined' && g.chrome?.runtime?.sendMessage) {
      g.chrome.runtime.sendMessage(
        { type: 'TUSH_GET_PENDING_REQUEST', requestId },
        (res: { request?: ExtensionDappRequest | null }) => {
          if (res?.request) {
            setDappRequest(res.request);
          }
        },
      );
    }
    return () => {
      void provider;
    };
  }, [ensureUnlocked]);

  const handleApproveDappRequest = async () => {
    if (!dappRequest || !window.tushWallet) return;
    setDappBusy(true);
    setDappError('');
    try {
      let result: any;
      const p = dappRequest.params || {};
      if (dappRequest.method === 'getAddress') {
        result = await window.tushWallet.getAddress();
      } else if (dappRequest.method === 'signTransaction') {
        result = await window.tushWallet.signTransaction(p.xdr, p.opts);
      } else if (dappRequest.method === 'signMessage') {
        result = await window.tushWallet.signMessage(p.message, p.opts);
      } else if (dappRequest.method === 'signAuthEntry') {
        result = await window.tushWallet.signAuthEntry(p.entryXdr, p.opts);
      } else {
        throw new Error(`Unsupported SEP-43 method: ${dappRequest.method}`);
      }

      recordDappConnection(dappRequest.origin, dappRequest.title || dappRequest.origin);
      syncExtensionStorage();

      const g = globalThis as any;
      if (typeof g.chrome !== 'undefined' && g.chrome?.runtime?.sendMessage) {
        g.chrome.runtime.sendMessage(
          {
            type: 'TUSH_RESOLVE_DAPP_REQUEST',
            requestId: dappRequest.id,
            result,
          },
          () => {
            setDappRequest(null);
            window.close();
          },
        );
      } else {
        setDappRequest(null);
      }
    } catch (err: any) {
      if (err?.message !== CANCELLED) {
        setDappError(err?.message || 'Failed to sign request.');
      }
      setDappBusy(false);
    }
  };

  const handleRejectDappRequest = () => {
    if (!dappRequest) return;
    const g = globalThis as any;
    if (typeof g.chrome !== 'undefined' && g.chrome?.runtime?.sendMessage) {
      g.chrome.runtime.sendMessage(
        {
          type: 'TUSH_RESOLVE_DAPP_REQUEST',
          requestId: dappRequest.id,
          error: 'User rejected request in Tush Wallet.',
        },
        () => {
          setDappRequest(null);
          window.close();
        },
      );
    } else {
      setDappRequest(null);
    }
  };

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
      syncExtensionStorage();
      pending.current?.resolve(getKeypair());
      pending.current = null;
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock wallet.');
      setBusy(false);
    }
  };

  const value = useMemo(() => ({ ensureUnlocked }), [ensureUnlocked]);

  const methodLabel =
    dappRequest?.method === 'getAddress'
      ? 'Connect Wallet'
      : dappRequest?.method === 'signTransaction'
        ? 'Sign Stellar Transaction'
        : dappRequest?.method === 'signMessage'
          ? 'Sign Message (SEP-53)'
          : 'Sign Soroban Auth Entry';

  return (
    <VaultContext.Provider value={value}>
      {children}
      {dappRequest && !prompt && (
        <div className="vault-overlay" role="dialog" aria-modal="true" aria-label="dApp approval">
          <div className="vault-dialog">
            <div className="vault-dapp-badge">SEP-0043 DAPP REQUEST</div>
            <h2>{methodLabel}</h2>
            <p className="vault-dapp-origin">
              <strong>{dappRequest.title || 'Stellar dApp'}</strong>
              <span>{dappRequest.origin}</span>
            </p>
            {dappRequest.params?.xdr && (
              <pre className="vault-dapp-payload">{dappRequest.params.xdr}</pre>
            )}
            {dappRequest.params?.message && (
              <pre className="vault-dapp-payload">{dappRequest.params.message}</pre>
            )}
            {dappRequest.params?.entryXdr && (
              <pre className="vault-dapp-payload">{dappRequest.params.entryXdr}</pre>
            )}
            {dappError && <div className="vault-error">{dappError}</div>}
            <button
              type="button"
              className="vault-primary"
              onClick={handleApproveDappRequest}
              disabled={dappBusy}
            >
              {dappBusy
                ? 'Signing…'
                : dappRequest.method === 'getAddress'
                  ? 'Approve Connection'
                  : 'Approve & Sign'}
            </button>
            <button
              type="button"
              className="vault-secondary"
              onClick={handleRejectDappRequest}
              disabled={dappBusy}
            >
              Reject
            </button>
          </div>
        </div>
      )}
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

