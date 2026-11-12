# Tush Wallet — Chrome Extension (Manifest V3)

Self-custodial **Stellar & Soroban** browser extension wallet with universal **`@tag` (SEP-0002)** handles, **SEP-0005** 12-word recovery phrases, **AES-256-GCM** encrypted local vault, **Passkeys (WebAuthn)**, and an in-page **SEP-0043 dApp provider** (`window.tushWallet` & `window.stellar`).

---

## How to Load in Google Chrome / Brave / Edge (Developer Mode)

1. Build the extension (or use the pre-built `extension/dist` folder or `tush-wallet-extension.zip`):
   ```bash
   cd dashboard
   npm run build:extension
   ```
2. Open Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Toggle **Developer mode** ON in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the folder:
   ```text
   c:\Users\WALZEEM\Desktop\Tush\extension\dist
   ```
6. Click the **Extensions (puzzle piece)** icon in your Chrome toolbar and **Pin** **Tush Wallet**.

---

## Features Included

- **Toolbar Popup (`390×600`) & Full-Tab Expand (`↗`)**: Click the Tush icon in Chrome to view your XLM & USDC balances, claim/manage your `@tag`, send to any `@username` or `G...` address, swap on the Stellar DEX, or pop out into a full tab.
- **Chrome Side Panel Support**: Open Tush Wallet alongside any Stellar dApp using Chrome's Side Panel.
- **In-Page SEP-0043 Provider (`window.tushWallet` & `window.stellar`)**: Automatically injected into webpages so Stellar dApps can call:
  - `await window.tushWallet.getAddress()` → `{ address, tag }`
  - `await window.tushWallet.getNetwork()` → `{ network: 'TESTNET', networkPassphrase }`
  - `await window.tushWallet.signTransaction(xdr, opts)`
  - `await window.tushWallet.signMessage(message, opts)`
  - `await window.tushWallet.signAuthEntry(entryXdr, opts)`

