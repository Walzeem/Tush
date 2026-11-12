// Tush Wallet Content Script Bridge
// 1. Injects `inpage-provider.js` into the page's MAIN execution world.
// 2. Relays SEP-0043 RPC requests between the page and the Extension Service Worker (`background.js`).
(function () {
  try {
    const container = document.head || document.documentElement;
    if (container) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('inpage-provider.js');
      script.async = false;
      script.onload = () => script.remove();
      container.insertBefore(script, container.children[0] || null);
    }
  } catch (err) {
    console.warn('[Tush Wallet] Failed to inject inpage provider:', err);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.target !== 'TUSH_CONTENT_SCRIPT') {
      return;
    }

    const { id, method, params } = event.data;

    chrome.runtime.sendMessage(
      {
        type: 'TUSH_DAPP_REQUEST',
        id,
        method,
        params,
        origin: window.location.origin,
        title: document.title || window.location.hostname,
      },
      (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          window.postMessage(
            {
              target: 'TUSH_INPAGE',
              id,
              error: runtimeError.message || 'Tush Wallet extension error',
            },
            '*',
          );
          return;
        }

        window.postMessage(
          {
            target: 'TUSH_INPAGE',
            id,
            result: response?.result,
            error: response?.error,
          },
          '*',
        );
      },
    );
  });
})();

