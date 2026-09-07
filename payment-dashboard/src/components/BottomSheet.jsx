import { useEffect, useRef } from 'react';
import './BottomSheet.css';

/**
 * BottomSheet
 *
 * Slide-up sheet anchored to the bottom of the wallet frame. The sheet stays
 * mounted while closed so the CSS transform transition can run in both
 * directions; content is only rendered while open to keep hidden inputs out of
 * the tab order.
 *
 * Props:
 *  - isOpen   {boolean}      - Controls the open/closed transform state.
 *  - onClose  {() => void}   - Called on scrim click, close button, or Escape.
 *  - title    {string}       - Heading text, also labels the dialog.
 *  - children {ReactNode}    - Sheet body content.
 */
function BottomSheet({ isOpen, onClose, title, children }) {
  const sheetRef = useRef(null);

  // Close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll so the sheet does not scroll the dashboard behind it.
  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Move focus into the sheet when it opens.
  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`sheet-scrim ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
        aria-label={`Close ${title}`}
      />
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!isOpen}
        tabIndex={-1}
      >
        <div className="bottom-sheet__handle" aria-hidden="true" />
        {isOpen && (
          <>
            <div className="bottom-sheet__header">
              <h2 className="bottom-sheet__title">{title}</h2>
              <button
                type="button"
                className="bottom-sheet__close"
                onClick={onClose}
                aria-label={`Close ${title}`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {children}
          </>
        )}
      </div>
    </>
  );
}

export default BottomSheet;
