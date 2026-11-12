// SEP-0007 URI Scheme for Stellar payment & transaction requests.
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md

export interface Sep7PayRequest {
  type: 'pay';
  destination: string;
  amount?: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  memoType?: 'MEMO_TEXT' | 'MEMO_ID' | 'MEMO_HASH' | 'MEMO_RETURN';
  msg?: string;
  originDomain?: string;
}

export interface Sep7TxRequest {
  type: 'tx';
  xdr: string;
  pubKey?: string;
  msg?: string;
  networkPassphrase?: string;
  originDomain?: string;
}

export type Sep7Request = Sep7PayRequest | Sep7TxRequest;

/** Builds a `web+stellar:pay?...` URI according to SEP-0007. */
export function buildSep7PayUri(params: {
  destination: string;
  amount?: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  memoType?: 'MEMO_TEXT' | 'MEMO_ID' | 'MEMO_HASH' | 'MEMO_RETURN';
  msg?: string;
}): string {
  const query = new URLSearchParams();
  query.set('destination', params.destination.trim());
  if (params.amount && Number(params.amount) > 0) {
    query.set('amount', String(params.amount).trim());
  }
  if (params.assetCode && params.assetCode.toUpperCase() !== 'XLM') {
    query.set('asset_code', params.assetCode.trim().toUpperCase());
    if (params.assetIssuer) query.set('asset_issuer', params.assetIssuer.trim());
  }
  if (params.memo && params.memo.trim()) {
    query.set('memo', params.memo.trim());
    if (params.memoType) query.set('memo_type', params.memoType);
  }
  if (params.msg && params.msg.trim()) {
    query.set('msg', params.msg.trim());
  }
  return `web+stellar:pay?${query.toString()}`;
}

/** Builds a shareable web URL that embeds a SEP-7 URI in `?sep7=...`. */
export function buildShareablePayLink(
  params: Parameters<typeof buildSep7PayUri>[0],
  origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
): string {
  const uri = buildSep7PayUri(params);
  return `${origin}/?sep7=${encodeURIComponent(uri)}`;
}

/**
 * Parses a `web+stellar:pay?...` or `web+stellar:tx?...` URI (or a web link containing `?sep7=...`).
 * Returns `null` if the string is not a valid SEP-7 URI.
 */
export function parseSep7Uri(rawInput: string): Sep7Request | null {
  const trimmed = String(rawInput ?? '').trim();
  if (!trimmed) return null;

  let uri = trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const embedded = url.searchParams.get('sep7');
      if (!embedded) return null;
      uri = embedded;
    } catch {
      return null;
    }
  }

  const match = /^web\+stellar:(pay|tx)\?(.*)$/i.exec(uri);
  if (!match) return null;

  const op = match[1].toLowerCase();
  const params = new URLSearchParams(match[2]);

  if (op === 'pay') {
    const destination = params.get('destination')?.trim();
    if (!destination) return null;
    const rawMemoType = params.get('memo_type')?.toUpperCase();
    const memoType =
      rawMemoType === 'MEMO_TEXT' ||
      rawMemoType === 'MEMO_ID' ||
      rawMemoType === 'MEMO_HASH' ||
      rawMemoType === 'MEMO_RETURN'
        ? rawMemoType
        : undefined;

    return {
      type: 'pay',
      destination,
      amount: params.get('amount') || undefined,
      assetCode: params.get('asset_code') || undefined,
      assetIssuer: params.get('asset_issuer') || undefined,
      memo: params.get('memo') || undefined,
      memoType,
      msg: params.get('msg') || undefined,
      originDomain: params.get('origin_domain') || undefined,
    };
  }

  if (op === 'tx') {
    const xdr = params.get('xdr')?.trim();
    if (!xdr) return null;
    return {
      type: 'tx',
      xdr,
      pubKey: params.get('pubkey') || undefined,
      msg: params.get('msg') || undefined,
      networkPassphrase: params.get('network_passphrase') || undefined,
      originDomain: params.get('origin_domain') || undefined,
    };
  }

  return null;
}
