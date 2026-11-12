// Tush Wallet Manifest V3 Background Service Worker
// Coordinates SEP-0043 dApp requests, popup approvals, and Chrome Side Panel support.

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
const pendingRequests = new Map();

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  // 1. Popup asking for a pending dApp request by ID
  if (message.type === 'TUSH_GET_PENDING_REQUEST') {
    const entry = pendingRequests.get(message.requestId);
    if (!entry) {
      sendResponse({ request: null });
    } else {
      sendResponse({
        request: {
          id: entry.id,
          method: entry.method,
          params: entry.params,
          origin: entry.origin,
          title: entry.title,
        },
      });
    }
    return false;
  }

  // 2. Popup resolving or rejecting a pending dApp request
  if (message.type === 'TUSH_RESOLVE_DAPP_REQUEST') {
    const entry = pendingRequests.get(message.requestId);
    if (entry) {
      pendingRequests.delete(message.requestId);
      if (message.error) {
        entry.sendResponse({ error: message.error });
      } else {
        entry.sendResponse({ result: message.result });
      }
    }
    sendResponse({ ok: true });
    return false;
  }

  // 3. Content script forwarding a SEP-0043 dApp call from a webpage
  if (message.type === 'TUSH_DAPP_REQUEST') {
    handleDappRequest(message, sendResponse);
    return true; // Keep message channel open for async response
  }

  return false;
});

async function handleDappRequest(message, sendResponse) {
  const { id, method, params, origin, title } = message;

  if (method === 'getNetwork') {
    sendResponse({
      result: {
        network: 'TESTNET',
        networkPassphrase: TESTNET_PASSPHRASE,
      },
    });
    return;
  }

  // If getAddress is requested and the wallet has already approved this origin, return cached address
  if (method === 'getAddress') {
    try {
      const data = await chrome.storage.local.get([
        'tush_wallet_address',
        'tush_user_tag',
        'tush_connected_dapps',
      ]);
      const address = data.tush_wallet_address;
      const tag = data.tush_user_tag;
      const connectedDapps = Array.isArray(data.tush_connected_dapps)
        ? data.tush_connected_dapps
        : [];

      const isOriginApproved = connectedDapps.some((d) => d && d.origin === origin);
      if (address && isOriginApproved) {
        sendResponse({
          result: {
            address,
            tag: tag || undefined,
          },
        });
        return;
      }
    } catch {
      // Fall through to interactive popup approval
    }
  }

  // Queue interactive request and open Tush Wallet approval popup
  pendingRequests.set(id, {
    id,
    method,
    params,
    origin,
    title,
    sendResponse,
  });

  const popupUrl = chrome.runtime.getURL(
    `index.html?mode=popup&dappRequest=${encodeURIComponent(id)}#dashboard`,
  );

  try {
    const win = await chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: 400,
      height: 640,
      focused: true,
    });

    const onRemoved = (closedWindowId) => {
      if (closedWindowId === win.id) {
        chrome.windows.onRemoved.removeListener(onRemoved);
        const stillPending = pendingRequests.get(id);
        if (stillPending) {
          pendingRequests.delete(id);
          stillPending.sendResponse({ error: 'User closed the Tush Wallet window.' });
        }
      }
    };
    chrome.windows.onRemoved.addListener(onRemoved);
  } catch (err) {
    pendingRequests.delete(id);
    sendResponse({
      error: err?.message || 'Unable to open Tush Wallet approval popup.',
    });
  }
}
