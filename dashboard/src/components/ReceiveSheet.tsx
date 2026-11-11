import BottomSheet from './BottomSheet';
import './ReceiveSheet.css';

/**
 * ReceiveSheet
 *
 * Shows the user's Stellar Tag as the primary way to be paid, with the raw
 * smart account address underneath as the fallback. The QR container is a
 * placeholder — no QR library is wired in yet.
 *
 * Props:
 *  - isOpen  {boolean}
 *  - onClose {() => void}
 *  - tag     {string}                    - Username without the leading "@".
 *  - address {string}                    - Smart account / wallet address.
 *  - onCopy  {(value, label) => void}    - Copy handler supplied by the parent.
 */
function ReceiveSheet({ isOpen, onClose, tag, address, onCopy }) {
  const displayTag = tag ? `@${tag.replace(/^@/, '')}` : '@stellar_user';
  const shortAddress = address
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : 'No address available';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Receive">
      <div className="bottom-sheet__body receive-sheet">
        <div className="receive-qr">
          <span className="receive-qr__label">QR code</span>
        </div>

        <p className="receive-tag">{displayTag}</p>
        <p className="receive-tag-caption">Your Stellar Tag</p>

        <button
          type="button"
          className="receive-address"
          onClick={() => address && onCopy(address, 'Address')}
          disabled={!address}
          title={address || undefined}
          aria-label={address ? `Copy address ${address}` : 'No address available'}
        >
          <span className="receive-address__value">{shortAddress}</span>
          <svg className="receive-address__icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" />
          </svg>
        </button>

        <p className="receive-hint">
          Share your tag instead of the full address — anyone can pay you with
          just <strong>{displayTag}</strong>.
        </p>
      </div>
    </BottomSheet>
  );
}

export default ReceiveSheet;
