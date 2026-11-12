import { useEffect, useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import toast from 'react-hot-toast';
import { useVault, CANCELLED } from '../vaultContext';
import { resolveRecipient, type RecipientResolution } from '../../utils/tags';
import { parseSep7Uri, type Sep7PayRequest } from '../../utils/sep7';
import './SendModal.css';

const RESOLVE_DELAY_MS = 400;

export default function SendModal({
  onSuccess,
  initialRequest = null,
}: {
  onSuccess?: () => void;
  initialRequest?: Sep7PayRequest | null;
}) {
  const { ensureUnlocked } = useVault();
  const [destination, setDestination] = useState(() => initialRequest?.destination || '');
  const [lookup, setLookup] = useState<{ input: string; result: RecipientResolution | null }>({
    input: '',
    result: null,
  });
  const [sendAmount, setSendAmount] = useState(() => initialRequest?.amount || '');
  const [memo, setMemo] = useState(() => initialRequest?.memo || '');
  const [isSending, setIsSending] = useState(false);

  const handleDestinationInput = (rawVal: string) => {
    // If the user pastes a SEP-7 URI (`web+stellar:pay?...`) or shareable link (`?sep7=...`),
    // automatically extract destination, amount, and memo!
    const parsed = parseSep7Uri(rawVal);
    if (parsed && parsed.type === 'pay') {
      setDestination(parsed.destination);
      if (parsed.amount) setSendAmount(parsed.amount);
      if (parsed.memo) setMemo(parsed.memo);
      toast.success('SEP-7 payment request loaded!');
      return;
    }
    setDestination(rawVal);
  };

  const input = destination.trim();
  const isResolving = !!input && lookup.input !== input;
  const recipient = input && lookup.input === input ? lookup.result : null;

  useEffect(() => {
    if (!input) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await resolveRecipient(input, { signal: controller.signal });
        setLookup({ input, result });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setLookup({ input, result: { error: "Couldn't look up that tag. Check your connection." } });
        }
      }
    }, RESOLVE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input]);

  const executeSend = async () => {
    setIsSending(true);
    try {
      if (!sendAmount || isNaN(Number(sendAmount)) || Number(sendAmount) <= 0) {
        throw new Error('Invalid amount.');
      }

      const target = await resolveRecipient(destination);
      if (target.error || !target.address) throw new Error(target.error || 'Invalid recipient.');

      const sourceKeypair = await ensureUnlocked();
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

      const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

      const builder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      }).addOperation(
        StellarSdk.Operation.payment({
          destination: target.address,
          asset: StellarSdk.Asset.native(),
          amount: String(sendAmount),
        }),
      );

      if (memo.trim()) {
        builder.addMemo(StellarSdk.Memo.text(memo.trim().slice(0, 28)));
      }

      const transaction = builder.setTimeout(30).build();
      transaction.sign(sourceKeypair);
      const response = await server.submitTransaction(transaction);

      console.log(`Send success! Hash: ${response.hash}`);
      toast.success(`Sent ${sendAmount} XLM${target.tag ? ` to ${target.tag}` : ''}`);

      setDestination('');
      setSendAmount('');
      setMemo('');

      onSuccess?.();
    } catch (error: any) {
      if (error?.message !== CANCELLED) {
        console.error('Send error:', error);
        toast.error(error?.message || 'Failed to send transaction.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const shortAddress = (a: string) => `${a.substring(0, 4)}...${a.slice(-4)}`;

  return (
    <div className="send-modal">
      <input
        type="text"
        className="send-input-destination"
        placeholder="Enter @tag, G... address, or SEP-7 link"
        value={destination}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => handleDestinationInput(e.target.value)}
      />
      <div
        style={{ minHeight: '24px', marginTop: '8px', fontSize: '0.85rem', paddingLeft: '8px' }}
        className="send-status-div"
      >
        {isResolving && <span style={{ color: '#888' }}>Resolving…</span>}
        {!isResolving && recipient?.address && (
          <span style={{ color: 'var(--accent-neon, #00f0ff)' }}>
            ✓ {recipient.tag ? `${recipient.tag} · ` : ''}
            {shortAddress(recipient.address)}
          </span>
        )}
        {!isResolving && recipient?.error && (
          <span style={{ color: '#ea4335' }}>{recipient.error}</span>
        )}
      </div>
      <input
        type="number"
        className="send-amount-display"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '2rem',
          textAlign: 'center',
          width: '100%',
          margin: '16px 0 8px',
          outline: 'none',
          appearance: 'textfield',
        }}
        placeholder="0.00"
        value={sendAmount}
        onChange={(e) => setSendAmount(e.target.value)}
      />
      <input
        type="text"
        className="send-input-destination"
        style={{ marginBottom: '16px', fontSize: '0.9rem', padding: '10px 14px' }}
        maxLength={28}
        placeholder="Memo / note (optional)"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      <button
        className="modal-btn-primary"
        onClick={executeSend}
        disabled={isSending || isResolving || !recipient?.address || !sendAmount}
      >
        {isSending ? 'Sending...' : 'Review Send'}
      </button>
    </div>
  );
}
