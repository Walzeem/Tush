import { useState } from 'react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { getCachedTag, toFederationAddress } from '../../utils/tags';
import { buildSep7PayUri, buildShareablePayLink } from '../../utils/sep7';
import './ReceiveModal.css';

export default function ReceiveModal() {
  const [mode, setMode] = useState<'address' | 'sep7'>('address');
  const [reqAmount, setReqAmount] = useState('');
  const [reqMemo, setReqMemo] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const activeAddress = localStorage.getItem('tush_wallet_address') || '';
  const userTag = getCachedTag();

  const sep7Uri = activeAddress
    ? buildSep7PayUri({
        destination: userTag ? toFederationAddress(userTag) : activeAddress,
        amount: reqAmount,
        memo: reqMemo,
        memoType: reqMemo ? 'MEMO_TEXT' : undefined,
      })
    : '';

  const shareableLink = activeAddress
    ? buildShareablePayLink({
        destination: userTag || activeAddress,
        amount: reqAmount,
        memo: reqMemo,
        memoType: reqMemo ? 'MEMO_TEXT' : undefined,
      })
    : '';

  const qrValue = mode === 'sep7' && sep7Uri ? sep7Uri : activeAddress;

  const copy = async (kind: string, value: string, message: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(message);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  return (
    <div className="receive-modal">
      <div className="receive-mode-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'address'}
          className={`receive-tab ${mode === 'address' ? 'active' : ''}`}
          onClick={() => setMode('address')}
        >
          Address & @tag
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sep7'}
          className={`receive-tab ${mode === 'sep7' ? 'active' : ''}`}
          onClick={() => setMode('sep7')}
        >
          Payment Request (SEP-7)
        </button>
      </div>

      <div className="qr-container">
        {qrValue ? (
          <QRCode value={qrValue} size={180} />
        ) : (
          <div style={{ width: 180, height: 180, background: '#f0f0f0' }} />
        )}
      </div>

      {userTag && <div className="receive-tag">{userTag}</div>}
      <div className="receive-address">
        {activeAddress ? `${activeAddress.substring(0, 16)}...${activeAddress.slice(-16)}` : 'No wallet connected'}
      </div>

      {mode === 'sep7' && (
        <div className="sep7-fields">
          <input
            type="number"
            className="sep7-input"
            placeholder="Request amount in XLM (optional)"
            value={reqAmount}
            onChange={(e) => setReqAmount(e.target.value)}
          />
          <input
            type="text"
            className="sep7-input"
            maxLength={28}
            placeholder="Memo / note (optional, max 28 chars)"
            value={reqMemo}
            onChange={(e) => setReqMemo(e.target.value)}
          />
        </div>
      )}

      <div className="receive-actions">
        {mode === 'address' ? (
          <>
            {userTag && (
              <button
                type="button"
                className={`copy-btn ${copied === 'tag' ? 'copied' : ''}`}
                onClick={() => copy('tag', userTag, 'Tag copied!')}
              >
                {copied === 'tag' ? 'Copied! ✓' : `Copy ${userTag}`}
              </button>
            )}
            <button
              type="button"
              className={`copy-btn ${copied === 'address' ? 'copied' : ''}`}
              onClick={() => copy('address', activeAddress, 'Address copied!')}
            >
              {copied === 'address' ? 'Copied! ✓' : 'Copy Address'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`copy-btn ${copied === 'link' ? 'copied' : ''}`}
              onClick={() => copy('link', shareableLink, 'Shareable payment link copied!')}
            >
              {copied === 'link' ? 'Copied! ✓' : 'Copy Payment Link'}
            </button>
            <button
              type="button"
              className={`copy-btn copy-btn--secondary ${copied === 'sep7' ? 'copied' : ''}`}
              onClick={() => copy('sep7', sep7Uri, 'SEP-7 URI copied!')}
            >
              {copied === 'sep7' ? 'Copied! ✓' : 'Copy web+stellar:pay URI'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
