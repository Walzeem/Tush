import { useEffect, useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import toast from 'react-hot-toast';
import { useVault, CANCELLED } from '../vaultContext';
import { resolveRecipient } from '../../utils/tags';
import './SendModal.css';

const RESOLVE_DELAY_MS = 400;

export default function SendModal({ onSuccess }) {
  const { ensureUnlocked } = useVault();
  const [destination, setDestination] = useState('');
  // Result of the last lookup, tagged with the input it answers. Anything that
  // doesn't match the current input is stale, so "resolving" is derived, not stored.
  const [lookup, setLookup] = useState({ input: '', result: null });
  const [sendAmount, setSendAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

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
      } catch (err) {
        if (err.name !== 'AbortError') {
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
      if (!sendAmount || isNaN(Number(sendAmount)) || Number(sendAmount) <= 0) throw new Error("Invalid amount.");

      // Resolve again at send time rather than trusting what the form last showed.
      const target = await resolveRecipient(destination);
      if (target.error) throw new Error(target.error);

      const sourceKeypair = await ensureUnlocked();
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

      const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: target.address,
        asset: StellarSdk.Asset.native(),
        amount: String(sendAmount)
      }))
      .setTimeout(30)
      .build();

      transaction.sign(sourceKeypair);
      const response = await server.submitTransaction(transaction);
      
      console.log(`Send success! Hash: ${response.hash}`);
      console.log(`View on Stellar Expert: https://stellar.expert/explorer/testnet/tx/${response.hash}`);
      
      toast.success(`Sent ${sendAmount} XLM${target.tag ? ` to ${target.tag}` : ''}`);

      setDestination('');
      setSendAmount('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (error.message !== CANCELLED) {
        console.error("Send error:", error);
        toast.error(error.message || "Failed to send transaction.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const shortAddress = (a) => `${a.substring(0, 4)}...${a.slice(-4)}`;

  return (
    <div className="send-modal">
      <input 
        type="text" 
        className="send-input-destination" 
        placeholder="Enter @tag or address" 
        value={destination}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setDestination(e.target.value)}
      />
      <div style={{ minHeight: '24px', marginTop: '8px', fontSize: '0.85rem', paddingLeft: '8px' }} className="send-status-div">
        {isResolving && <span style={{ color: '#888' }}>Resolving…</span>}
        {!isResolving && recipient?.address && (
          <span style={{ color: 'var(--accent-neon, #00f0ff)' }}>
            ✓ {recipient.tag ? `${recipient.tag} · ` : ''}{shortAddress(recipient.address)}
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
          margin: '16px 0', 
          outline: 'none',
          appearance: 'textfield'
        }}
        placeholder="0.00" 
        value={sendAmount}
        onChange={(e) => setSendAmount(e.target.value)}
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
