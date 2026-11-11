import BottomSheet from './BottomSheet';
import './SendSheet.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

/**
 * Applies a keypad press to the current amount string.
 * Guards against multiple decimal points, more than 7 decimal places (the
 * Stellar stroop limit), and leading-zero runs like "007".
 */
export function applyKeypadPress(current, key) {
  if (key === 'del') {
    return current.slice(0, -1);
  }

  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }

  const [, decimals] = current.split('.');
  if (decimals !== undefined && decimals.length >= 7) {
    return current;
  }

  if (current === '0') {
    return key;
  }

  return current + key;
}

/**
 * SendSheet
 *
 * Destination field accepting either a Stellar Tag or a raw address, plus a
 * grid keypad for the amount. Submitting is delegated to the parent via
 * onReview — this sheet does not talk to the network.
 *
 * Props:
 *  - isOpen      {boolean}
 *  - onClose     {() => void}
 *  - destination {string}
 *  - onDestinationChange {(value: string) => void}
 *  - amount      {string}
 *  - onAmountChange {(value: string) => void}
 *  - onReview    {() => void}
 */
function SendSheet({
  isOpen,
  onClose,
  destination,
  onDestinationChange,
  amount,
  onAmountChange,
  onReview,
}) {
  const canReview = Boolean(destination.trim()) && parseFloat(amount) > 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Send">
      <div className="bottom-sheet__body send-sheet">
        <div className="send-field">
          <label className="send-field__label" htmlFor="send-destination">
            To
          </label>
          <input
            id="send-destination"
            className="send-destination"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck="false"
            placeholder="Enter @tag or address"
            value={destination}
            onChange={(event) => onDestinationChange(event.target.value)}
          />
        </div>

        <div className="send-amount">
          <div className={`send-amount__value ${amount ? '' : 'is-empty'}`}>
            <span>{amount || '0'}</span>
            <span className="send-amount__unit">XLM</span>
          </div>
          <p className="send-amount__fiat">≈ $0.00</p>
        </div>

        <div className="send-keypad" role="group" aria-label="Amount keypad">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={key === 'del' ? 'send-keypad__key--action' : undefined}
              onClick={() => onAmountChange(applyKeypadPress(amount, key))}
              aria-label={key === 'del' ? 'Delete last digit' : key}
            >
              {key === 'del' ? '⌫' : key}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="sheet-cta"
        onClick={onReview}
        disabled={!canReview}
      >
        Review Send
      </button>
    </BottomSheet>
  );
}

export default SendSheet;
