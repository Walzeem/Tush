# Tush Wallet

**Tush** is a self-custodial Stellar & Soroban wallet inspired by Slush Wallet, built with **React 19**, **TypeScript**, **Vite**, and a standalone **SEP-2 Federation & Tag Server** powered by **Node.js**, **Express 5**, and **SQLite**.

Every wallet created or imported in Tush can claim a human-readable **`@tag`** (backed by the Stellar SEP-2 Federation protocol as `name*domain`). Instead of copying 56-character `G...` public keys, users can send and receive XLM, USDC, and Soroban assets using memorable `@tags` that resolve across the Stellar ecosystem.

---

## Key Features

- **Universal `@tag` Identity (SEP-2 Federation)**
  - Claim a unique `@username` right after creating or importing a wallet.
  - Ownership is cryptographically verified via an `ed25519` signature (`SEP-53` / raw message signing) over `register:<username>:<address>[ :<memo_type>:<memo> ]`.
  - Automatic tag recovery on any device when importing an existing recovery phrase.
  - Real-time debounced availability checks and recipient resolution (`@tag`, `name*domain`, or `G...` Stellar public keys).
- **Non-Custodial Key Derivation & Encrypted Vault (SEP-5)**
  - Standards-compliant 12-word BIP-39 recovery phrase generation and import using SLIP-10 `ed25519` hierarchical deterministic derivation (`m/44'/148'/0'`).
  - Interactive 3-word verification quiz during wallet creation to ensure backups are saved.
  - **AES-256-GCM Encrypted Vault:** Recovery phrases and secrets are never stored in plaintext. Keys are encrypted at rest in `localStorage` using a key derived from the user's password via **PBKDF2-SHA256 (600,000 iterations)**.
  - **In-Memory Session & Auto-Lock:** Decrypted signing keys exist only in memory and automatically lock on page reload or after 15 minutes of inactivity.
  - Seamless one-time migration prompt for legacy unencrypted wallets.
- **Passkey Smart Wallets & Multi-Wallet Kit**
  - WebAuthn / Passkey (`secp256r1` ES256) credential registration and Soroban smart wallet deployment support (`src/utils/passkeyAuth.ts`).
  - External wallet connection via `@creit.tech/stellar-wallets-kit` (Freighter, xBull, Albedo, LOBSTR).
- **Payments, Assets, Swap & Analytics**
  - Native **XLM** and **USDC** balance tracking, one-click Testnet Friendbot funding, and USDC trustline activation.
  - Send XLM via direct Horizon payments or Soroban smart contract routing (`route_payment`) to any `@tag` or `G...` address.
  - QR code & `@tag` sharing in the Receive modal, transaction history, and live network latency & ledger analytics.

---

## Stellar Standards Implemented

| Standard | Description | Implementation |
| :--- | :--- | :--- |
| **SEP-1** | Stellar Info File (`/.well-known/stellar.toml`) | `backend/src/routes/wellKnown.ts` |
| **SEP-2** | Federation Protocol (`GET /federation?q=...&type=name\|id`) | `backend/src/routes/tags.ts` & `dashboard/src/utils/tags.ts` |
| **SEP-5** | Key Derivation (`BIP-39` + `SLIP-10 ed25519` at `m/44'/148'/i'`) | `dashboard/src/utils/sep5.ts` |
| **SEP-53** | Sign and Verify Messages (`Stellar Signed Message:\n` + SHA-256) | `dashboard/src/utils/tags.ts` & `backend/src/signature.ts` |

---

## Repository Structure

```text
Tush/
├── dashboard/                     # Frontend React 19 + TypeScript + Vite application
│   ├── public/                    # Static assets & icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # WalletLayout shell
│   │   │   ├── modals/            # CreateWallet, ClaimTag, Send, Receive, Swap, BottomSheet
│   │   │   ├── VaultProvider.tsx  # Password unlock modal & signing session provider
│   │   │   └── vaultContext.ts    # useVault() hook & context definition
│   │   ├── utils/
│   │   │   ├── sep5.ts            # BIP-39 + SLIP-10 m/44'/148'/index' key derivation
│   │   │   ├── vault.ts           # PBKDF2-SHA256 + AES-256-GCM encrypted key vault
│   │   │   ├── tags.ts            # SEP-2 federation & signed tag registration client
│   │   │   └── passkeyAuth.ts     # WebAuthn passkey & Soroban smart wallet utilities
│   │   ├── views/                 # Dashboard, HistoryPage, AnalyticsPage, RegistrationPage, HelpPage
│   │   ├── App.tsx                # Root view router & wallet connection state
│   │   └── main.tsx               # Application entry point
│   ├── tsconfig.json
│   ├── vite.config.js
│   └── package.json
│
└── backend/                       # Standalone SEP-2 Federation & Tag Server (Node + TypeScript)
    ├── src/
    │   ├── routes/
    │   │   ├── tags.ts            # POST /register, GET /federation, GET /lookup
    │   │   └── wellKnown.ts       # GET /.well-known/stellar.toml
    │   ├── app.ts                 # Express 5 app factory, CORS, rate limiters, error envelope
    │   ├── config.ts              # Environment configuration loader & validation
    │   ├── db.ts                  # SQLite persistence via node:sqlite (WAL mode)
    │   ├── errors.ts              # Structured API error helpers
    │   ├── signature.ts           # SEP-53 & raw ed25519 signature verification
    │   ├── validation.ts          # Username rules, reserved word list & SEP-2 memo checks
    │   └── server.ts              # HTTP server entry point with graceful shutdown
    ├── test/
    │   └── server.test.ts         # Integration test suite (node:test)
    ├── .env.example
    ├── tsconfig.json
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** `>= 22.13.0` (Node `24.x` recommended — uses built-in `node:sqlite` and native TypeScript execution).
- **npm** `>= 10.x`.

### 1. Start the Backend (`backend/`)

```bash
cd backend
npm install

# Optional: copy .env.example to .env and customize
cp .env.example .env

# Start the server (defaults to http://localhost:4000)
npm start
```

For hot-reload during development:

```bash
npm run dev
```

### 2. Start the Frontend (`dashboard/`)

Open a second terminal:

```bash
cd dashboard
npm install

# Start Vite dev server (http://localhost:3000 or http://localhost:3001)
npm run dev
```

---

## Environment Variables

### Frontend (`dashboard/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE` | `http://localhost:4000` | Base URL of the Tush SEP-2 Federation & Tag backend |
| `VITE_FEDERATION_DOMAIN` | `localhost` | Domain suffix used for SEP-2 addresses (`name*domain`) |
| `VITE_NETWORK` | `testnet` | Stellar network indicator (`testnet` or `mainnet`) |

### Backend (`backend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | HTTP port for the backend server |
| `HOST` | `0.0.0.0` | Bind address |
| `DB_PATH` | `./data/tags.db` | SQLite database file path (created automatically) |
| `FEDERATION_DOMAIN` | `localhost` | Domain part of federation addresses (`<username>*<FEDERATION_DOMAIN>`) |
| `PUBLIC_URL` | *(derived from request)* | Public base URL advertised in `/.well-known/stellar.toml` |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001,http://localhost:5173` | Comma-separated origins allowed to call `/register` and `/lookup` |
| `MAX_TAGS_PER_ADDRESS` | `3` | Maximum number of tags a single Stellar address may claim |

---

## Backend API Reference

### `POST /register`

Claims a username for a Stellar address. Requires a valid `ed25519` signature from the wallet's private key over `register:<username>:<address>` (or `register:<username>:<address>:<memo_type>:<memo>` when a memo is included).

**Request Body:**

```json
{
  "username": "alice",
  "address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6",
  "signature": "<base64-ed25519-signature>",
  "memo_type": "text",
  "memo": "optional-memo"
}
```

**Responses:**
- `201 Created` — Tag registered (`{ ok: true, username: "alice*localhost", address: "G...", is_primary: true, federation_address: "alice*localhost" }`).
- `200 OK` — Idempotent retry when the same address already owns the tag.
- `401 Unauthorized` — Missing or invalid wallet signature.
- `409 Conflict` — Tag is already taken by another address, or the wallet reached `MAX_TAGS_PER_ADDRESS`.
- `422 Unprocessable Entity` — Invalid username (must be 3–20 alphanumeric characters and not reserved), invalid `G...` address, or invalid memo.

### `GET /federation?q=<query>&type=<name|id>` (SEP-2)

Open CORS (`*`) endpoint for resolving tags forward or in reverse.

- **Forward (`type=name`):** `GET /federation?q=alice*localhost&type=name`
- **Reverse (`type=id`):** `GET /federation?q=GDRXE2...&type=id`

**Response (`200 OK`):**

```json
{
  "stellar_address": "alice*localhost",
  "account_id": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6"
}
```

### `GET /lookup?address=<G...>`

Returns the primary tag registered to a Stellar public key.

### `GET /.well-known/stellar.toml` (SEP-1)

Returns `FEDERATION_SERVER="<PUBLIC_URL>/federation"` with `Access-Control-Allow-Origin: *` so external Stellar wallets can discover the federation endpoint.

### `GET /health`

Returns server and SQLite health status (`200 OK` when healthy).

---

## Testing, Typechecking & Building

### Backend (`backend/`)

```bash
cd backend
npm test          # Runs the integration test suite (SEP-1, SEP-2, SEP-53, limits, memos)
npm run typecheck # Runs strict TypeScript verification (tsc --noEmit)
```

### Frontend (`dashboard/`)

```bash
cd dashboard
npm run typecheck # Runs TypeScript verification (tsc --noEmit)
npm run lint      # Runs ESLint + typescript-eslint
npm run build     # Typechecks and builds the production bundle into dashboard/dist
```

---

## License

MIT
