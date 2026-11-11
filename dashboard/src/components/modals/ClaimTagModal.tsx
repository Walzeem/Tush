import { useEffect, useState } from 'react';
import './ClaimTagModal.css';
import { useVault, CANCELLED } from '../vaultContext';
import {
  TAG_MAX,
  TagError,
  formatTag,
  isTagAvailable,
  registerTag,
  tagName,
  validateTagName,
} from '../../utils/tags';

const CHECK_DELAY_MS = 400;

export default function ClaimTagModal({ onClaim, onSkip, activeAddress, suggestion = '' }) {
  const { ensureUnlocked } = useVault();
  const [input, setInput] = useState(() => tagName(suggestion));
  // Last availability check, tagged with the name it answers; stale results are ignored.
  const [check, setCheck] = useState({ name: '', status: 'idle' });
  const [error, setError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const name = tagName(input);
  const formatError = name ? validateTagName(name) : '';
  const canCheck = !!name && !formatError;
  const availability = !canCheck ? 'idle' : check.name === name ? check.status : 'checking';

  useEffect(() => {
    if (!canCheck) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const free = await isTagAvailable(name, { signal: controller.signal });
        setCheck({ name, status: free ? 'available' : 'taken' });
      } catch (err) {
        if (err.name !== 'AbortError') setCheck({ name, status: 'error' });
      }
    }, CHECK_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, canCheck]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formatError || availability === 'taken') return;

    setIsClaiming(true);
    setError('');
    try {
      const keypair = await ensureUnlocked();
      if (activeAddress && keypair.publicKey() !== activeAddress) {
        throw new TagError('The unlocked wallet does not match the active wallet.', 'ADDRESS_MISMATCH');
      }
      onClaim(await registerTag(name, keypair));
    } catch (err) {
      if (err.message === CANCELLED) {
        // User dismissed the password prompt; keep the form as is.
      } else if (err.code === 'TAKEN') {
        setCheck({ name, status: 'taken' });
      } else {
        setError(err.message || 'Network error. Please try again.');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const hint = (() => {
    if (formatError) return { tone: 'error', text: formatError };
    if (availability === 'checking') return { tone: 'muted', text: 'Checking availability…' };
    if (availability === 'available') return { tone: 'ok', text: `${formatTag(name)} is available` };
    if (availability === 'taken') return { tone: 'error', text: `${formatTag(name)} is already taken` };
    if (availability === 'error') return { tone: 'muted', text: "Couldn't check availability. You can still try to claim it." };
    return null;
  })();

  return (
    <div className="claim-tag-modal">
      <h2 className="modal-title">Choose your @tag</h2>
      <p className="modal-subtitle">
        Your tag is your username for sending and receiving on Stellar. Friends can pay you with just
        your tag instead of a long address.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="tag-input-wrapper">
          <span className="tag-prefix">@</span>
          <input
            type="text"
            className="tag-input"
            placeholder="username"
            value={input}
            maxLength={TAG_MAX + 1}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setInput(e.target.value.replace(/^@/, ''));
              setError('');
            }}
            autoFocus
          />
        </div>

        {hint && <div className={`tag-hint tag-hint-${hint.tone}`}>{hint.text}</div>}
        {error && <div className="tag-error">{error}</div>}

        <button
          type="submit"
          className="claim-submit-btn"
          disabled={!name || !!formatError || availability === 'taken' || isClaiming}
        >
          {isClaiming ? 'Claiming…' : 'Claim Tag'}
        </button>
        {onSkip && (
          <button type="button" className="tag-skip-btn" onClick={onSkip} disabled={isClaiming}>
            Not now
          </button>
        )}
      </form>
    </div>
  );
}
