// Safe transaction submission.
//
// Horizon often answers 504 ("timeout") while the transaction is still being
// applied. Building and signing a *new* transaction at that point can pay twice.
// Instead we resubmit the *same* signed envelope (same sequence number, so at
// most one copy can ever land) and, if Horizon now rejects it, check by hash
// whether the first attempt already succeeded.
import { Horizon, type FeeBumpTransaction, type Transaction } from '@stellar/stellar-sdk';

const RETRY_DELAYS_MS = [1500, 3000, 6000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (err: unknown): boolean => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === undefined || status === 504 || status === 503 || status === 502;
};

export async function submitSigned(
  server: Horizon.Server,
  tx: Transaction | FeeBumpTransaction,
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  const hash = tx.hash().toString('hex');
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await server.submitTransaction(tx);
    } catch (err) {
      lastError = err;
      if (attempt > 0) {
        // An earlier attempt may have landed; ask Horizon before giving up.
        const landed = await server
          .transactions()
          .transaction(hash)
          .call()
          .catch(() => null);
        if (landed?.successful) {
          return landed as unknown as Horizon.HorizonApi.SubmitTransactionResponse;
        }
      }
      if (!isRetryable(err) || attempt === RETRY_DELAYS_MS.length) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}
