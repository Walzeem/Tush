import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { isUnlocked, lock, removeWallet, revealMnemonic } from '../../utils/vault';
import { DEFAULT_FEDERATION_DOMAIN, toFederationAddress } from '../../utils/tags';
import {
  getConnectedDapps,
  revokeDappConnection,
  type ConnectedDapp,
} from '../../utils/sep43Provider';
import './WalletSettingsModal.css';

export default function WalletSettingsModal({
  activeAddress,
  userTag,
  onChangeTag,
  onWalletRemoved,
  onClose,
}: {
  activeAddress: string;
  userTag: string;
  onChangeTag: () => void;
  onWalletRemoved: () => void;
  onClose: () => void;
}) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [showPhrasePrompt, setShowPhrasePrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [revealedPhrase, setRevealedPhrase] = useState<string | null>(null);
  const [revealError, setRevealError] = useState('');
  const [dapps, setDapps] = useState<ConnectedDapp[]>(() => getConnectedDapps());
  const [testSigResult, setTestSigResult] = useState<string | null>(null);

  const passkeyId = localStorage.getItem('tush_passkey_id');

  const handleLock = () => {
    lock();
    setUnlocked(false);
    setRevealedPhrase(null);
    toast.success('Wallet locked.');
  };

  const handleRevealSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRevealError('');
    try {
      const phrase = await revealMnemonic(password);
      if (!phrase) {
        setRevealError('This wallet was imported from a raw secret key (no 12-word phrase).');
        return;
      }
      setRevealedPhrase(phrase);
      setPassword('');
    } catch (err: any) {
      setRevealError(err?.message || 'Incorrect password.');
    }
  };

  const handleTestSep43Sign = async () => {
    try {
      if (!window.tushWallet) throw new Error('SEP-43 provider not initialized.');
      const res = await window.tushWallet.signMessage(`Verify Tush Wallet ownership at ${new Date().toISOString()}`);
      setTestSigResult(res.signedMessage);
      setDapps(getConnectedDapps());
      setUnlocked(isUnlocked());
      toast.success('SEP-43 message signed!');
    } catch (err: any) {
      toast.error(err?.message || 'Signature cancelled.');
    }
  };

  const handleRemoveWallet = () => {
    if (!window.confirm('Remove this wallet from your device? Make sure you have backed up your 12-word recovery phrase first.')) {
      return;
    }
    removeWallet();
    localStorage.removeItem('tush_passkey_id');
    toast.success('Wallet removed from this device.');
    onWalletRemoved();
    onClose();
  };

  return (
    <div className="wallet-settings-modal">
      <h2 className="ws-title">Account & Security</h2>

      <div className="ws-card">
        <div className="ws-row">
          <div>
            <div className="ws-label">Name Tag (SEP-2)</div>
            <div className="ws-value ws-neon">
              {userTag ? `${userTag} (${toFederationAddress(userTag, DEFAULT_FEDERATION_DOMAIN)})` : 'No @tag claimed'}
            </div>
          </div>
          <button type="button" className="ws-pill-btn" onClick={onChangeTag}>
            {userTag ? 'Add / Switch @tag' : 'Claim @tag'}
          </button>
        </div>

        <div className="ws-row" style={{ marginTop: '12px' }}>
          <div>
            <div className="ws-label">Stellar Address</div>
            <div className="ws-mono">{activeAddress.slice(0, 10)}…{activeAddress.slice(-10)}</div>
          </div>
          <button
            type="button"
            className="ws-pill-btn"
            onClick={() => {
              navigator.clipboard.writeText(activeAddress);
              toast.success('Address copied!');
            }}
          >
            Copy
          </button>
        </div>

        {passkeyId && (
          <div className="ws-row" style={{ marginTop: '12px' }}>
            <div>
              <div className="ws-label">Passkey Credential</div>
              <div className="ws-mono">🔑 Active ({passkeyId.slice(0, 12)}…)</div>
            </div>
          </div>
        )}
      </div>

      <div className="ws-card">
        <div className="ws-section-header">Vault Security</div>
        <div className="ws-row">
          <div>
            <div className="ws-label">Session Status</div>
            <div className="ws-value">{unlocked ? '🔓 Unlocked (auto-locks in 15m)' : '🔒 Locked'}</div>
          </div>
          {unlocked && (
            <button type="button" className="ws-pill-btn" onClick={handleLock}>
              Lock Now
            </button>
          )}
        </div>

        {!revealedPhrase ? (
          !showPhrasePrompt ? (
            <button
              type="button"
              className="ws-action-btn"
              onClick={() => setShowPhrasePrompt(true)}
            >
              Reveal 12-Word Recovery Phrase
            </button>
          ) : (
            <form className="ws-reveal-form" onSubmit={handleRevealSubmit}>
              <input
                type="password"
                className="ws-input"
                placeholder="Enter wallet password to reveal phrase"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {revealError && <div className="ws-error">{revealError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="ws-pill-btn ws-pill-primary" disabled={!password}>
                  Reveal
                </button>
                <button
                  type="button"
                  className="ws-pill-btn"
                  onClick={() => {
                    setShowPhrasePrompt(false);
                    setRevealError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )
        ) : (
          <div className="ws-phrase-box">
            <div className="ws-phrase-words">{revealedPhrase}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="ws-pill-btn"
                onClick={() => {
                  navigator.clipboard.writeText(revealedPhrase);
                  toast.success('Recovery phrase copied!');
                }}
              >
                Copy Phrase
              </button>
              <button
                type="button"
                className="ws-pill-btn"
                onClick={() => {
                  setRevealedPhrase(null);
                  setShowPhrasePrompt(false);
                }}
              >
                Hide
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ws-card">
        <div className="ws-section-header">dApp Standard (SEP-43 · window.tushWallet)</div>
        {dapps.length === 0 ? (
          <div className="ws-muted">No connected dApps yet.</div>
        ) : (
          dapps.map((d) => (
            <div key={d.origin} className="ws-row" style={{ marginBottom: '8px' }}>
              <div>
                <div className="ws-value">{d.name}</div>
                <div className="ws-mono">{d.origin}</div>
              </div>
              <button
                type="button"
                className="ws-pill-btn"
                onClick={() => setDapps(revokeDappConnection(d.origin))}
              >
                Revoke
              </button>
            </div>
          ))
        )}
        <button type="button" className="ws-action-btn" onClick={handleTestSep43Sign}>
          Test SEP-43 / SEP-53 Message Sign
        </button>
        {testSigResult && (
          <div className="ws-mono" style={{ marginTop: '8px', wordBreak: 'break-all' }}>
            Signature (base64): {testSigResult.slice(0, 44)}…
          </div>
        )}
      </div>

      <button type="button" className="ws-danger-btn" onClick={handleRemoveWallet}>
        Remove Wallet from This Device
      </button>
    </div>
  );
}

