import { Buffer } from 'buffer';

import { CONTRACT_ID, loadStellarSdk } from '../views/shared';

const textDecoder = new TextDecoder();

const toUint8Array = (value) => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  throw new Error('Expected binary data.');
};

const readLength = (bytes, offset, additionalInfo) => {
  if (additionalInfo < 24) {
    return { value: additionalInfo, bytesRead: 0 };
  }

  if (additionalInfo === 24) {
    return { value: bytes[offset], bytesRead: 1 };
  }

  if (additionalInfo === 25) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 2);
    return { value: view.getUint16(0, false), bytesRead: 2 };
  }

  if (additionalInfo === 26) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    return { value: view.getUint32(0, false), bytesRead: 4 };
  }

  if (additionalInfo === 27) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const high = view.getUint32(0, false);
    const low = view.getUint32(4, false);
    return { value: high * 2 ** 32 + low, bytesRead: 8 };
  }

  throw new Error(`Unsupported CBOR length encoding: ${additionalInfo}`);
};

const decodeCborItem = (bytes, offset = 0) => {
  const initialByte = bytes[offset];
  if (initialByte === undefined) {
    throw new Error('Unexpected end of CBOR input.');
  }

  const majorType = initialByte >> 5;
  const additionalInfo = initialByte & 0x1f;
  let cursor = offset + 1;

  switch (majorType) {
    case 0: {
      const { value, bytesRead } = readLength(bytes, cursor, additionalInfo);
      return { value, bytesRead: 1 + bytesRead };
    }
    case 1: {
      const { value, bytesRead } = readLength(bytes, cursor, additionalInfo);
      return { value: -1 - value, bytesRead: 1 + bytesRead };
    }
    case 2: {
      const { value: length, bytesRead } = readLength(bytes, cursor, additionalInfo);
      cursor += bytesRead;
      return {
        value: bytes.slice(cursor, cursor + length),
        bytesRead: 1 + bytesRead + length,
      };
    }
    case 3: {
      const { value: length, bytesRead } = readLength(bytes, cursor, additionalInfo);
      cursor += bytesRead;
      return {
        value: textDecoder.decode(bytes.slice(cursor, cursor + length)),
        bytesRead: 1 + bytesRead + length,
      };
    }
    case 4: {
      const { value: length, bytesRead } = readLength(bytes, cursor, additionalInfo);
      cursor += bytesRead;
      const values = [];
      let consumed = 1 + bytesRead;

      for (let index = 0; index < length; index += 1) {
        const item = decodeCborItem(bytes, cursor);
        values.push(item.value);
        cursor += item.bytesRead;
        consumed += item.bytesRead;
      }

      return { value: values, bytesRead: consumed };
    }
    case 5: {
      const { value: length, bytesRead } = readLength(bytes, cursor, additionalInfo);
      cursor += bytesRead;
      const map = new Map();
      let consumed = 1 + bytesRead;

      for (let index = 0; index < length; index += 1) {
        const key = decodeCborItem(bytes, cursor);
        cursor += key.bytesRead;
        consumed += key.bytesRead;

        const value = decodeCborItem(bytes, cursor);
        cursor += value.bytesRead;
        consumed += value.bytesRead;

        map.set(key.value, value.value);
      }

      return { value: map, bytesRead: consumed };
    }
    case 6: {
      const { value: tagNumber, bytesRead } = readLength(bytes, cursor, additionalInfo);
      cursor += bytesRead;
      const item = decodeCborItem(bytes, cursor);
      return {
        value: { tag: tagNumber, value: item.value },
        bytesRead: 1 + bytesRead + item.bytesRead,
      };
    }
    case 7: {
      if (additionalInfo === 20) return { value: false, bytesRead: 1 };
      if (additionalInfo === 21) return { value: true, bytesRead: 1 };
      if (additionalInfo === 22 || additionalInfo === 23) return { value: null, bytesRead: 1 };
      if (additionalInfo === 24) return { value: bytes[cursor], bytesRead: 2 };
      throw new Error(`Unsupported CBOR simple value: ${additionalInfo}`);
    }
    default:
      throw new Error(`Unsupported CBOR major type: ${majorType}`);
  }
};

const mapToObject = (map) => {
  const result = {};

  for (const [key, value] of map.entries()) {
    result[key] = value instanceof Map ? mapToObject(value) : value;
  }

  return result;
};

export const decodeAttestationObject = (attestationObject: any): Record<string, any> => {
  const bytes = toUint8Array(attestationObject);
  const decoded = decodeCborItem(bytes, 0);

  if (!(decoded.value instanceof Map)) {
    throw new Error('Invalid attestation object payload.');
  }

  return mapToObject(decoded.value);
};

const parseAuthData = (authData) => {
  const bytes = toUint8Array(authData);
  if (bytes.length < 37) {
    throw new Error('Authenticator data is too short.');
  }

  const flags = bytes[32];
  if ((flags & 0x40) === 0) {
    throw new Error('Attested credential data is missing from the WebAuthn response.');
  }

  let offset = 37;
  offset += 16;

  const credentialIdLength = new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, false);
  offset += 2;

  const credentialId = bytes.slice(offset, offset + credentialIdLength);
  offset += credentialIdLength;

  const coseKey = decodeCborItem(bytes, offset).value;
  if (!(coseKey instanceof Map)) {
    throw new Error('Unable to decode COSE public key.');
  }

  return { credentialId, coseKey };
};

export async function registerDevicePasskey() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Passkeys require a browser environment.');
  }

  if (!window.crypto?.getRandomValues) {
    throw new Error('Secure random generation is unavailable in this browser.');
  }

  if (!navigator.credentials?.create) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: window.crypto.getRandomValues(new Uint8Array(32)),
    rp: {
      name: 'Stellar Tags Wallet',
      id: 'localhost',
    },
    user: {
      id: window.crypto.getRandomValues(new Uint8Array(16)),
      name: 'user@stellartags.app',
      displayName: 'Stellar Tags User',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    },
    timeout: 60000,
    attestation: 'none',
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    console.log('Raw Credential:', credential);
    console.log('Credential ID (Base64):', credential?.id);

    return credential;
  } catch (error) {
    throw new Error(error?.message || 'Passkey registration failed.');
  }
}

export const extractSecp256r1PublicKey = (credential) => {
  const attestationObject = credential?.response?.attestationObject;
  if (!attestationObject) {
    throw new Error('Missing attestation object in the WebAuthn response.');
  }

  const decodedAttestation = decodeAttestationObject(attestationObject);
  const { credentialId, coseKey } = parseAuthData(decodedAttestation.authData);

  const algorithm = coseKey.get(3);
  const x = coseKey.get(-2);
  const y = coseKey.get(-3);

  if (algorithm !== -7) {
    throw new Error('The authenticator did not return an ES256 public key.');
  }

  if (!x || !y) {
    throw new Error('Unable to extract secp256r1 coordinates from the credential.');
  }

  const publicKeyX = toUint8Array(x);
  const publicKeyY = toUint8Array(y);

  if (publicKeyX.length !== 32 || publicKeyY.length !== 32) {
    throw new Error('Invalid secp256r1 public key length.');
  }

  const publicKeyXY = Buffer.concat([Buffer.from(publicKeyX), Buffer.from(publicKeyY)]);

  return {
    credentialId: credential?.id || Buffer.from(credentialId).toString('base64url'),
    publicKeyX,
    publicKeyY,
    publicKeyXY,
    attestationObject: decodedAttestation,
    coseKey,
  };
};

export async function deploySmartWallet(credentialId, publicKeyXY) {
  if (!credentialId) {
    throw new Error('A credential ID is required to build the smart wallet deployment.');
  }

  const publicKeyBytes = toUint8Array(publicKeyXY);
  if (publicKeyBytes.length !== 64) {
    throw new Error('The public key must be the 64-byte uncompressed secp256r1 form.');
  }

  const StellarSdk = await loadStellarSdk();
  const { Account, Contract, Keypair, Networks, StrKey, nativeToScVal, TransactionBuilder } = StellarSdk;

  const factoryContractId = import.meta.env.VITE_SMART_WALLET_FACTORY_CONTRACT_ID || CONTRACT_ID;
  const factoryMethod = import.meta.env.VITE_SMART_WALLET_FACTORY_METHOD || 'deploy_smart_wallet';

  const credentialIdScVal = nativeToScVal(credentialId, { type: 'string' });
  const publicKeyScVal = nativeToScVal(Buffer.from(publicKeyBytes), { type: 'bytes' });

  const sourceAccount = new Account(Keypair.random().publicKey(), '0');
  const factoryContract = new Contract(factoryContractId);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(factoryContract.call(factoryMethod, credentialIdScVal, publicKeyScVal))
    .setTimeout(300)
    .build();

  const walletHash = await crypto.subtle.digest(
    'SHA-256',
    Buffer.concat([Buffer.from(credentialId), Buffer.from(publicKeyBytes)]),
  );
  const contractBytes = new Uint8Array(walletHash).slice(0, 32);
  const smartWalletAddress =
    typeof StrKey.encodeContract === 'function'
      ? StrKey.encodeContract(contractBytes)
      : `C${Buffer.from(contractBytes).toString('hex').toUpperCase().slice(0, 55)}`;

  return {
    factoryContractId,
    factoryMethod,
    credentialId,
    publicKeyXY: Buffer.from(publicKeyBytes),
    publicKeyScVal,
    credentialIdScVal,
    transactionXdr: transaction.toXDR(),
    smartWalletAddress,
  };
}
