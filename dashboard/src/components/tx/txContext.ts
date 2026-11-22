import { createContext, useContext } from 'react';

export type TxKind = 'send' | 'swap' | 'fund' | 'mint' | 'stake' | 'trust';

export interface TxStartOptions {
  kind: TxKind;
  /** e.g. "Sending 25 XLM" */
  title: string;
  /** e.g. "to @alice" */
  subtitle?: string;
}

export interface TxSuccessOptions {
  title?: string;
  subtitle?: string;
  /** Transaction hash — shows a "View on Stellar Expert" link */
  hash?: string;
}

export interface TxMotionApi {
  start: (opts: TxStartOptions) => void;
  succeed: (opts?: TxSuccessOptions) => void;
  fail: (error: unknown, title?: string) => void;
  dismiss: () => void;
}

const noop: TxMotionApi = { start: () => {}, succeed: () => {}, fail: () => {}, dismiss: () => {} };

export const TxMotionContext = createContext<TxMotionApi | null>(null);

export function useTxMotion(): TxMotionApi {
  return useContext(TxMotionContext) ?? noop;
}

const RESULT_CODE_MESSAGES: Record<string, string> = {
  op_underfunded: "You don't have enough XLM for this.",
  tx_insufficient_balance: "You don't have enough XLM to cover this and the network fee.",
  op_low_reserve: 'This would drop your account below the minimum XLM reserve.',
  op_no_destination: "That account doesn't exist yet. Send at least 1 XLM to create it.",
  op_no_trust: "The recipient can't receive this asset yet (no trustline).",
  op_line_full: "The recipient's trustline limit is full.",
  op_under_dest_min: 'The price moved past your slippage limit. Try again.',
  op_too_few_offers: 'Not enough liquidity on the DEX for this swap right now.',
  tx_bad_seq: 'Your account changed in the meantime. Try again.',
  tx_too_late: 'The transaction timed out. Try again.',
  tx_bad_auth: "The transaction signature wasn't accepted.",
};

/** Turns Horizon / network errors into a short, human sentence. */
export function friendlyTxError(error: unknown): string {
  const err = error as {
    message?: string;
    response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } };
  };
  const codes = err?.response?.data?.extras?.result_codes;
  const opCode = codes?.operations?.find((c) => c !== 'op_success');
  const code = opCode || codes?.transaction;
  if (code && RESULT_CODE_MESSAGES[code]) return RESULT_CODE_MESSAGES[code];
  if (code) return `Stellar rejected the transaction (${code}).`;
  const msg = err?.message || '';
  if (/failed to fetch|network|timeout/i.test(msg)) return "Couldn't reach the Stellar network. Check your connection and try again.";
  return msg || 'Something went wrong. Try again.';
}
