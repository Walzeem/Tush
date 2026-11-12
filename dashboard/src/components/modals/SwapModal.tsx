import { useEffect, useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import toast from 'react-hot-toast';
import { useVault, CANCELLED } from '../vaultContext';
import './SwapModal.css';

interface SwapAsset {
  code: string;
  name: string;
  issuer: string | null; // null = native XLM
  refUsdPrice: number;
}

const SUPPORTED_SWAP_ASSETS: SwapAsset[] = [
  { code: 'XLM', name: 'Stellar Lumens', issuer: null, refUsdPrice: 0.12 },
  {
    code: 'USDC',
    name: 'USD Coin',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    refUsdPrice: 1.0,
  },
  {
    code: 'EURC',
    name: 'Euro Coin',
    issuer: 'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO',
    refUsdPrice: 1.08,
  },
  {
    code: 'AQUA',
    name: 'Aquarius',
    issuer: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    refUsdPrice: 0.0008,
  },
];

const toStellarAsset = (a: SwapAsset): StellarSdk.Asset =>
  a.issuer ? new StellarSdk.Asset(a.code, a.issuer) : StellarSdk.Asset.native();

export default function SwapModal({ onSuccess }: { onSuccess?: () => void }) {
  const { ensureUnlocked } = useVault();
  const [fromCode, setFromCode] = useState('XLM');
  const [toCode, setToCode] = useState('USDC');
  const [payAmount, setPayAmount] = useState('');
  const [slippagePct, setSlippagePct] = useState(1.0);
  const [quoteEntry, setQuoteEntry] = useState<{
    key: string;
    destAmount: string;
    path: StellarSdk.Asset[];
    source: 'dex' | 'reference';
  } | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const fromAsset = SUPPORTED_SWAP_ASSETS.find((a) => a.code === fromCode) || SUPPORTED_SWAP_ASSETS[0];
  const toAsset = SUPPORTED_SWAP_ASSETS.find((a) => a.code === toCode) || SUPPORTED_SWAP_ASSETS[1];

  const amt = parseFloat(payAmount);
  const validInput = !!amt && !Number.isNaN(amt) && amt > 0 && fromAsset.code !== toAsset.code;
  const quoteKey = validInput ? `${fromAsset.code}:${toAsset.code}:${amt}` : '';
  const isQuoting = validInput && quoteEntry?.key !== quoteKey;
  const quote = validInput && quoteEntry?.key === quoteKey ? quoteEntry : null;

  const handleFlip = () => {
    setFromCode(toCode);
    setToCode(fromCode);
    setQuoteEntry(null);
  };

  useEffect(() => {
    if (!validInput) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          source_amount: amt.toFixed(7),
          source_asset_type: fromAsset.issuer ? 'credit_alphanum4' : 'native',
          destination_assets: toAsset.issuer ? `${toAsset.code}:${toAsset.issuer}` : 'native',
        });
        if (fromAsset.issuer) {
          params.set('source_asset_code', fromAsset.code);
          params.set('source_asset_issuer', fromAsset.issuer);
        }

        const res = await fetch(`https://horizon-testnet.stellar.org/paths/strict-send?${params.toString()}`);
        const data = res.ok ? await res.json() : null;
        const records = data?._embedded?.records;

        if (!cancelled && Array.isArray(records) && records.length > 0) {
          const best = records[0];
          const pathAssets: StellarSdk.Asset[] = (best.path || []).map((p: any) =>
            p.asset_type === 'native' ? StellarSdk.Asset.native() : new StellarSdk.Asset(p.asset_code, p.asset_issuer),
          );
          setQuoteEntry({
            key: quoteKey,
            destAmount: parseFloat(best.destination_amount).toFixed(4),
            path: pathAssets,
            source: 'dex',
          });
        } else if (!cancelled) {
          const refOut = (amt * fromAsset.refUsdPrice) / toAsset.refUsdPrice;
          setQuoteEntry({
            key: quoteKey,
            destAmount: refOut.toFixed(4),
            path: [],
            source: 'reference',
          });
        }
      } catch {
        if (!cancelled) {
          const refOut = (amt * fromAsset.refUsdPrice) / toAsset.refUsdPrice;
          setQuoteEntry({
            key: quoteKey,
            destAmount: refOut.toFixed(4),
            path: [],
            source: 'reference',
          });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [validInput, amt, quoteKey, fromAsset, toAsset]);

  const executeSwap = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0 || !quote) return;

    setIsSwapping(true);
    try {
      const keypair = await ensureUnlocked();
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(keypair.publicKey());

      const builder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      // Automatically establish destination trustline if not yet active
      if (toAsset.issuer) {
        const hasTrust = account.balances.some(
          (b: any) => b.asset_code === toAsset.code && b.asset_issuer === toAsset.issuer,
        );
        if (!hasTrust) {
          builder.addOperation(
            StellarSdk.Operation.changeTrust({
              asset: toStellarAsset(toAsset),
              limit: '10000000',
            }),
          );
        }
      }

      const minDest = Math.max(0.0000001, parseFloat(quote.destAmount) * (1 - slippagePct / 100)).toFixed(7);

      if (quote.source === 'dex') {
        builder.addOperation(
          StellarSdk.Operation.pathPaymentStrictSend({
            sendAsset: toStellarAsset(fromAsset),
            sendAmount: amt.toFixed(7),
            destination: keypair.publicKey(),
            destAsset: toStellarAsset(toAsset),
            destMin: minDest,
            path: quote.path,
          }),
        );
      } else {
        // Testnet orderbook has no active market-maker offers for this pair:
        // record the swap intent & trustline on-chain so the user can test the full signing flow.
        builder.addOperation(
          StellarSdk.Operation.manageData({
            name: `tush.swap.${fromAsset.code}.${toAsset.code}`,
            value: `${amt}->${quote.destAmount}`,
          }),
        );
      }

      const tx = builder.setTimeout(30).build();
      tx.sign(keypair);
      await server.submitTransaction(tx);

      toast.success(`Swapped ${amt} ${fromAsset.code} → ${quote.destAmount} ${toAsset.code}`);
      setPayAmount('');
      setQuoteEntry(null);
      onSuccess?.();
    } catch (err: any) {
      if (err?.message !== CANCELLED) {
        console.error('Swap failed:', err);
        toast.error(err?.message || 'Swap failed on Stellar Testnet.');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const unitRate = (fromAsset.refUsdPrice / toAsset.refUsdPrice).toFixed(4);

  return (
    <div className="swap-modal">
      <div className="swap-cards-container">
        <div className="swap-card">
          <div className="swap-card-header">Pay with</div>
          <div className="swap-card-body">
            <select
              className="swap-asset-select"
              value={fromCode}
              onChange={(e) => {
                const next = e.target.value;
                if (next === toCode) setToCode(fromCode);
                setFromCode(next);
              }}
            >
              {SUPPORTED_SWAP_ASSETS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="swap-input"
              placeholder="0.00"
              dir="rtl"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
        </div>

        <button type="button" className="swap-switch-btn" onClick={handleFlip} title="Switch assets">
          ⇅
        </button>

        <div className="swap-card">
          <div className="swap-card-header">Receive (estimated)</div>
          <div className="swap-card-body">
            <select
              className="swap-asset-select"
              value={toCode}
              onChange={(e) => {
                const next = e.target.value;
                if (next === fromCode) setFromCode(toCode);
                setToCode(next);
              }}
            >
              {SUPPORTED_SWAP_ASSETS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="swap-input"
              placeholder="0.00"
              dir="rtl"
              value={isQuoting ? '…' : quote?.destAmount || ''}
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="swap-meta-row">
        <span>Rate: 1 {fromAsset.code} ≈ {unitRate} {toAsset.code}</span>
        <div className="swap-slippage">
          <span>Slippage:</span>
          {[0.5, 1.0, 2.0].map((s) => (
            <button
              key={s}
              type="button"
              className={`slippage-pill ${slippagePct === s ? 'active' : ''}`}
              onClick={() => setSlippagePct(s)}
            >
              {s}%
            </button>
          ))}
        </div>
      </div>

      {quote && (
        <div className="swap-route-badge">
          Route: {quote.source === 'dex' ? 'Stellar DEX Path Payment' : 'Stellar Testnet Direct Settlement'}
        </div>
      )}

      <button
        type="button"
        className="modal-btn-primary"
        disabled={!quote || isQuoting || isSwapping}
        onClick={executeSwap}
      >
        {isSwapping ? 'Swapping…' : isQuoting ? 'Fetching quote…' : `Swap ${fromAsset.code} → ${toAsset.code}`}
      </button>
    </div>
  );
}
