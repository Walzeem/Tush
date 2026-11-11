import { useState } from 'react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { getCachedTag } from '../../utils/tags';
import './ReceiveModal.css';

export default function ReceiveModal() {
  const [copied, setCopied] = useState(null); // 'address' | 'tag' | null
  const activeAddress = localStorage.getItem('tush_wallet_address');
  const userTag = getCachedTag();

  const copy = async (kind, value, message) => {
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
      <div className="qr-container">
        {activeAddress ? (
          <QRCode value={activeAddress} size={180} />
        ) : (
          <div style={{ width: 180, height: 180, background: '#f0f0f0' }} />
        )}
      </div>
      {userTag && <div className="receive-tag">{userTag}</div>}
      <div className="receive-address">
        {activeAddress ? `${activeAddress.substring(0, 16)}...${activeAddress.slice(-16)}` : 'No wallet connected'}
      </div>

      {userTag && (
        <button
          className={`copy-btn ${copied === 'tag' ? 'copied' : ''}`}
          onClick={() => copy('tag', userTag, 'Tag copied!')}
        >
          {copied === 'tag' ? 'Copied! ✓' : 'Copy @tag'}
        </button>
      )}
      <button
        className={`copy-btn ${copied === 'address' ? 'copied' : ''}`}
        onClick={() => copy('address', activeAddress, 'Address copied!')}
      >
        {copied === 'address' ? 'Copied! ✓' : 'Copy Address'}
      </button>
    </div>
  );
}
