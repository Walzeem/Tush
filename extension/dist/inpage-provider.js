// Tush Wallet In-Page SEP-0043 Provider (`window.tushWallet` & `window.stellar`)
// Injected into the webpage MAIN world by `content-script.js`.
(function () {
  if (window.tushWallet && window.tushWallet.isTushWallet) {
    return;
  }

  let requestCounter = 0;
  const pendingRequests = new Map();

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.target !== 'TUSH_INPAGE') {
      return;
    }
    const { id, result, error } = event.data;
    const pending = pendingRequests.get(id);
    if (!pending) return;
    pendingRequests.delete(id);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  });

  function sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = `tush_${Date.now()}_${++requestCounter}`;
      pendingRequests.set(id, { resolve, reject });

      window.postMessage(
        {
          target: 'TUSH_CONTENT_SCRIPT',
          id,
          method,
          params,
        },
        '*',
      );
    });
  }

  const provider = {
    isTushWallet: true,
    name: 'Tush Wallet',
    version: '1.0.0',

    getAddress() {
      return sendRequest('getAddress');
    },

    getNetwork() {
      return sendRequest('getNetwork');
    },

    signTransaction(xdr, opts = {}) {
      return sendRequest('signTransaction', { xdr, opts });
    },

    signMessage(message, opts = {}) {
      return sendRequest('signMessage', { message, opts });
    },

    signAuthEntry(entryXdr, opts = {}) {
      return sendRequest('signAuthEntry', { entryXdr, opts });
    },
  };

  Object.defineProperty(window, 'tushWallet', {
    value: provider,
    writable: true,
    configurable: true,
  });

  if (!window.stellar) {
    window.stellar = provider;
  }

  window.dispatchEvent(new CustomEvent('tush-wallet:ready', { detail: provider }));
})();

