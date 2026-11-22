/**
 * Transaction motion — one calm overlay for every money moment.
 *
 *  pending  → the Tush hang tag sways gently on its string
 *  success  → the tag snaps up and gets stamped (PAID / SWAPPED / FUNDED …)
 *  error    → the tag shakes, turns orange, and explains what went wrong
 *
 * Short Android haptics accompany success/failure. Reduced-motion users get
 * the same states as simple fades.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TxMotionContext, friendlyTxError, type TxKind, type TxMotionApi, type TxStartOptions, type TxSuccessOptions } from './txContext';
import './TxMotion.css';

type Phase = 'idle' | 'pending' | 'success' | 'error';

interface TxState {
  phase: Phase;
  kind: TxKind;
  title: string;
  subtitle?: string;
  reason?: string;
  hash?: string;
}

const STAMP: Record<TxKind, string> = {
  send: 'PAID',
  swap: 'SWAPPED',
  fund: 'FUNDED',
  mint: 'MINTED',
  stake: 'STAKED',
  trust: 'ACTIVE',
};

const SUCCESS_AUTO_DISMISS_MS = 2800;

function buzz(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

function TxTag({ phase }: { phase: Phase }) {
  const reduce = useReducedMotion();
  const tagAnim =
    reduce || phase === 'idle'
      ? { rotate: 0, x: 0, y: 0 }
      : phase === 'pending'
        ? { rotate: [-6, 6, -6], x: 0, y: 0 }
        : phase === 'success'
          ? { rotate: [10, -4, 0], y: [8, -10, 0], x: 0 }
          : { x: [0, -12, 10, -8, 6, -3, 0], rotate: [0, -4, 4, -3, 2, 0, 0], y: 0 };
  const tagTransition =
    phase === 'pending'
      ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const }
      : phase === 'success'
        ? { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] as const }
        : { duration: 0.6, ease: 'easeOut' as const };

  return (
    <div className={`tx-stage tx-stage--${phase}`}>
      <svg className="tx-stage__svg" viewBox="0 0 120 130" aria-hidden="true">
        <path className="tx-string" d="M58 -8 C 60 8, 61 22, 60 37" />
        <motion.g
          className="tx-tag"
          style={{ originX: 0.5, originY: 0.21 }}
          animate={tagAnim}
          transition={tagTransition}
        >
          {/* Same 64-grid tag as the logo, scaled ×2 and centred on x=60 */}
          <g transform="translate(-4 -6) scale(2)">
            <path className="tx-tag__body" d="M18 22 L27 11 H37 L46 22 V54 Q46 58 42 58 H22 Q18 58 18 54 Z" />
            <g className="tx-tag__punch">
              <rect x="23" y="19" width="18" height="7" rx="3.5" />
              <rect x="28.5" y="19" width="7" height="25" rx="3.5" />
            </g>
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

function Burst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const colors = ['#c8ff4d', '#ff5cdb', '#4d7cff', '#ff8a3d', '#9b6bff'];
  return (
    <div className="tx-burst" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2 + 0.3;
        const dist = 70 + (i % 3) * 18;
        return (
          <motion.span
            key={i}
            className="tx-burst__bit"
            style={{ background: colors[i % colors.length], borderRadius: i % 2 ? '50%' : '3px' }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: [0, 1.2, 0.6], opacity: [1, 1, 0], rotate: 180 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
          />
        );
      })}
    </div>
  );
}

export default function TxMotionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TxState>({ phase: 'idle', kind: 'send', title: '' });
  const timer = useRef<number | null>(null);
  const reduce = useReducedMotion();

  const clearTimer = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const dismiss = useCallback(() => {
    clearTimer();
    setState((s) => ({ ...s, phase: 'idle' }));
  }, []);

  const start = useCallback((opts: TxStartOptions) => {
    clearTimer();
    setState({ phase: 'pending', kind: opts.kind, title: opts.title, subtitle: opts.subtitle });
  }, []);

  const succeed = useCallback(
    (opts: TxSuccessOptions = {}) => {
      clearTimer();
      buzz([14, 50, 22]);
      setState((s) => ({
        ...s,
        phase: 'success',
        title: opts.title ?? s.title,
        subtitle: opts.subtitle ?? s.subtitle,
        hash: opts.hash,
        reason: undefined,
      }));
      timer.current = window.setTimeout(dismiss, SUCCESS_AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const fail = useCallback((error: unknown, title?: string) => {
    clearTimer();
    buzz([40, 40, 40]);
    setState((s) => ({
      ...s,
      phase: 'error',
      title: title ?? "That didn't go through",
      reason: friendlyTxError(error),
    }));
  }, []);

  useEffect(() => {
    if (state.phase !== 'success' && state.phase !== 'error') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, dismiss]);

  useEffect(() => clearTimer, []);

  // Dev-only handle so every state can be previewed without sending a real transaction:
  //   __tushTx.start({ kind: 'send', title: 'Sending 25 XLM', subtitle: 'to @alice' })
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __tushTx?: TxMotionApi };
    w.__tushTx = { start, succeed, fail, dismiss };
    return () => {
      delete w.__tushTx;
    };
  }, [start, succeed, fail, dismiss]);

  const api = useMemo<TxMotionApi>(() => ({ start, succeed, fail, dismiss }), [start, succeed, fail, dismiss]);
  const open = state.phase !== 'idle';

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`tx-overlay tx-overlay--${state.phase}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={state.phase === 'pending' ? undefined : dismiss}
        >
          <motion.div
            className="tx-card"
            role="status"
            aria-live="polite"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="tx-card__visual">
              <TxTag phase={state.phase} />
              <AnimatePresence>
                {state.phase === 'success' && (
                  <motion.div
                    key="stamp"
                    className="tx-stamp"
                    initial={reduce ? { opacity: 0, rotate: -14 } : { opacity: 0, scale: 2.6, rotate: -32 }}
                    animate={{ opacity: 1, scale: 1, rotate: -14 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 17, delay: 0.18 }}
                  >
                    {STAMP[state.kind]}
                  </motion.div>
                )}
              </AnimatePresence>
              {state.phase === 'success' && <Burst />}
              {state.phase === 'pending' && (
                <div className="tx-pulse" aria-hidden="true">
                  <span /><span /><span />
                </div>
              )}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state.phase}
                className="tx-card__copy"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <p className="tx-card__eyebrow">
                  {state.phase === 'pending' && 'Submitting to Stellar'}
                  {state.phase === 'success' && 'Confirmed on Stellar'}
                  {state.phase === 'error' && 'Transaction failed'}
                </p>
                <h3 className="tx-card__title">{state.title}</h3>
                {state.phase !== 'error' && state.subtitle && <p className="tx-card__sub">{state.subtitle}</p>}
                {state.phase === 'error' && <p className="tx-card__reason">{state.reason}</p>}
                {state.phase === 'pending' && <p className="tx-card__hint">This usually takes about 5 seconds.</p>}
              </motion.div>
            </AnimatePresence>

            {state.phase !== 'pending' && (
              <motion.div
                className="tx-card__actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {state.phase === 'success' && state.hash && (
                  <a
                    className="tx-link"
                    href={`https://stellar.expert/explorer/testnet/tx/${state.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Stellar Expert ↗
                  </a>
                )}
                <button type="button" className="tx-btn" onClick={dismiss} autoFocus>
                  {state.phase === 'success' ? 'Done' : 'Close'}
                </button>
              </motion.div>
            )}
            {state.phase === 'success' && !reduce && (
              <motion.span
                className="tx-card__timer"
                aria-hidden="true"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: SUCCESS_AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <TxMotionContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
    </TxMotionContext.Provider>
  );
}
