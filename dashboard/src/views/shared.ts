import { 
  StellarWalletsKit, 
  WalletNetwork,
  FreighterModule, 
  xBullModule,
  AlbedoModule,
  LobstrModule
} from '@creit.tech/stellar-wallets-kit';
import { useEffect, useRef, useState } from 'react';

export const CONTRACT_ID = 'CDNQ7OMHIFOLZHOKWQLOGDW7CF3DRMKXJC6OULNGNBWF4O4NO2NEIGER';
export const TREASURY_ADDRESS = 'GAAFWEZKDYPXLTQGKQ3F23TXWYQUDAYTDW7P7VUQSVJFW2GWC4Y6LWST';
export const TOKEN_ADDRESS = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export { API_BASE, DEFAULT_FEDERATION_DOMAIN } from '../utils/tags';
export const HORIZON_BASE = 'https://horizon-testnet.stellar.org';
export const ANALYTICS_WINDOW_MS = 60 * 60 * 1000;
export const ANALYTICS_PAGE_LIMIT = 200;
export const ANALYTICS_MAX_PAGES = 5;
export const ANALYTICS_REFRESH_MS = 60 * 1000;
export const NAV_STORAGE_KEY = 'stellar-nav-open';

let stellarSdkPromise;
export const loadStellarSdk = () => {
  if (!stellarSdkPromise) {
    stellarSdkPromise = import('@stellar/stellar-sdk');
  }
  return stellarSdkPromise;
};

/**
 * Resolves a recipient typed by the user (G... address, @tag, or name*domain).
 * Delegates to the federation-backed resolver; on success the address is always set.
 */
export { resolveRecipient } from '../utils/tags';

/**
 * Pulls a displayable message out of an API error body.
 *
 * The API answers `{ success: false, error: { code, message, details } }`. The
 * flat `error`/`detail`/`message` fallbacks cover responses that do not come
 * from the platform's error handler, such as a proxy or CDN error page.
 */
export const apiErrorMessage = (data, fallback) => {
  if (data && typeof data === 'object') {
    const { error } = data;
    if (error && typeof error === 'object' && error.message) {
      return error.message;
    }
    if (typeof error === 'string' && error) {
      return error;
    }
    if (typeof data.detail === 'string' && data.detail) {
      return data.detail;
    }
    if (typeof data.message === 'string' && data.message) {
      return data.message;
    }
  }
  return fallback;
};

/** Field-level validation issues, when the error carries them. */
export const apiErrorDetails = (data) => {
  const details = data && data.error && data.error.details;
  return Array.isArray(details) ? details : [];
};

export const formatUsername = (value) => {
  if (!value) {
    return '';
  }

  return value.split('*')[0];
};

export const formatShortAddress = (value) => {
  if (!value) {
    return '';
  }

  if (value.length < 10) {
    return value;
  }

  return `${value.substring(0, 4)}...${value.substring(52)}`;
};

export const useNavState = () => {
  const [isNavOpen, setIsNavOpen] = useState(() => {
    const stored = sessionStorage.getItem(NAV_STORAGE_KEY);
    if (stored === 'true' || stored === 'false') {
      return stored === 'true';
    }

    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncNav = (event) => {
      if (event.matches) {
        setIsNavOpen(false);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', syncNav);
      return () => mediaQuery.removeEventListener('change', syncNav);
    }

    mediaQuery.addListener(syncNav);
    return () => mediaQuery.removeListener(syncNav);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(NAV_STORAGE_KEY, String(isNavOpen));
  }, [isNavOpen]);

  return [isNavOpen, setIsNavOpen] as const;
};

export const useWalletMenu = () => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return { menuRef, isOpen, setIsOpen };
};

// Initialize the multi-wallet kit with strictly V1 syntax
export const walletKit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET, 
  selectedWalletId: 'freighter',
  modules: [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new LobstrModule()
  ],
});