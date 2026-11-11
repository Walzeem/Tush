import { useState } from 'react';
import { MIN_PASSWORD_LENGTH, createVaultFromMnemonic } from '../../utils/vault';
import { isValidMnemonic, newMnemonic } from '../../utils/sep5';
import './CreateWalletModal.css';

const pickVerifyIndexes = (): number[] => {
  const set = new Set<number>();
  while (set.size < 3) set.add(Math.floor(Math.random() * 12));
  return [...set].sort((a, b) => a - b);
};

function PasswordFields({ password, setPassword, confirm, setConfirm }) {
  return (
    <>
      <input
        type="password"
        className="cw-input"
        autoComplete="new-password"
        placeholder={`Password (min ${MIN_PASSWORD_LENGTH} characters)`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="password"
        className="cw-input"
        autoComplete="new-password"
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
    </>
  );
}

export default function CreateWalletModal({ onWalletCreated }) {
  const [view, setView] = useState('select'); // select | password | phrase | verify | import
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyIndexes] = useState(pickVerifyIndexes);

  const words = mnemonic ? mnemonic.split(' ') : [];

  const checkPassword = () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return false;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const finish = async (phrase) => {
    setBusy(true);
    setError('');
    try {
      const address = await createVaultFromMnemonic(phrase, password);
      onWalletCreated?.(address);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const goSelect = () => {
    setError('');
    setView('select');
  };

  if (view === 'password') {
    return (
      <div className="create-wallet-modal">
        <h2 className="modal-title">Set a password</h2>
        <p className="cw-note">It encrypts your wallet on this device. We can't recover it for you.</p>
        <PasswordFields {...{ password, setPassword, confirm, setConfirm }} />
        {error && <div className="cw-error">{error}</div>}
        <button
          className="saved-phrase-btn"
          onClick={() => {
            if (!checkPassword()) return;
            setError('');
            setMnemonic(newMnemonic());
            setView('phrase');
          }}
        >
          Continue
        </button>
        <button className="cw-back" onClick={goSelect}>Back</button>
      </div>
    );
  }

  if (view === 'phrase') {
    return (
      <div className="create-wallet-modal">
        <h2 className="modal-title">Secret Recovery Phrase</h2>
        <div className="warning-banner">
          Write these 12 words down and keep them offline. Anyone with them can take your funds, and they are the only way to recover your wallet.
        </div>
        <div className="seed-grid">
          {words.map((word, idx) => (
            <div key={idx} className="seed-word">
              <span className="seed-index">{idx + 1}.</span> {word}
            </div>
          ))}
        </div>
        <button className="saved-phrase-btn" onClick={() => setView('verify')}>
          I have saved my phrase
        </button>
      </div>
    );
  }

  if (view === 'verify') {
    const allCorrect = verifyIndexes.every(
      (i) => (answers[i] || '').trim().toLowerCase() === words[i],
    );
    return (
      <div className="create-wallet-modal">
        <h2 className="modal-title">Confirm your phrase</h2>
        <p className="cw-note">Enter the requested words to prove you saved it.</p>
        {verifyIndexes.map((i) => (
          <input
            key={i}
            className="cw-input"
            placeholder={`Word #${i + 1}`}
            autoComplete="off"
            autoCapitalize="none"
            value={answers[i] || ''}
            onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
          />
        ))}
        {error && <div className="cw-error">{error}</div>}
        <button
          className="saved-phrase-btn"
          disabled={!allCorrect || busy}
          onClick={() => finish(mnemonic)}
        >
          {busy ? 'Creating wallet…' : 'Create wallet'}
        </button>
        <button className="cw-back" onClick={() => setView('phrase')} disabled={busy}>Back to phrase</button>
      </div>
    );
  }

  if (view === 'import') {
    return (
      <div className="create-wallet-modal">
        <h2 className="modal-title">Import wallet</h2>
        <p className="cw-note">Enter your 12 or 24-word recovery phrase (SEP-5 compatible).</p>
        <textarea
          className="cw-input cw-textarea"
          placeholder="word1 word2 word3 …"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          value={importPhrase}
          onChange={(e) => { setImportPhrase(e.target.value); setError(''); }}
        />
        <PasswordFields {...{ password, setPassword, confirm, setConfirm }} />
        {error && <div className="cw-error">{error}</div>}
        <button
          className="saved-phrase-btn"
          disabled={!importPhrase.trim() || busy}
          onClick={() => {
            if (!isValidMnemonic(importPhrase)) {
              setError('That recovery phrase is not valid. Check the words and their order.');
              return;
            }
            if (!checkPassword()) return;
            finish(importPhrase.trim().toLowerCase().split(/\s+/).join(' '));
          }}
        >
          {busy ? 'Importing…' : 'Import wallet'}
        </button>
        <button className="cw-back" onClick={goSelect} disabled={busy}>Back</button>
      </div>
    );
  }

  return (
    <div className="create-wallet-modal">
      <h2 className="modal-title">Create Wallet</h2>
      <p className="cw-note">Your keys never leave this device. No account or email needed.</p>
      <button className="saved-phrase-btn cw-first" onClick={() => setView('password')}>
        Create new wallet
      </button>
      <div className="divider"><span>or</span></div>
      <button className="seed-phrase-btn" onClick={() => setView('import')}>
        Import with recovery phrase
      </button>
    </div>
  );
}
