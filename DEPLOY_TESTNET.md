# Tush Wallet — Live Testnet Deployment Guide

This repository is pre-configured to deploy both the **SEP-2 `@tag` Federation Backend** (`backend/`) and the **Tush Wallet Web App** (`dashboard/`) to live HTTPS URLs for Stellar Testnet testing.

---

## Option 1: One-Click Full-Stack Deploy on Render (Backend + Frontend)

The root [`render.yaml`](./render.yaml) Blueprint deploys both services automatically and links `VITE_API_BASE` from the backend to the frontend:

1. Go to [Render Dashboard → Blueprints](https://dashboard.render.com/blueprints) and click **New Blueprint Instance**.
2. Connect your GitHub repository: **`https://github.com/Walzeem/Tush`**.
3. Click **Apply**. Render will:
   - Build & start **`tush-tags-backend`** using [`backend/Dockerfile`](./backend/Dockerfile) (Node 22 + SQLite) with `/health` monitoring.
   - Build & publish **`tush-wallet-dashboard`** (`dashboard/dist`) with `VITE_API_BASE` automatically wired to the live backend URL.

---

## Option 2: Vercel (Frontend) + Render or Railway (Backend)

### Step 1 — Deploy `backend/` on Railway or Render
- **Railway:**
  1. Create a New Project → **Deploy from GitHub repo** (`Walzeem/Tush`).
  2. Set **Root Directory** to `backend`.
  3. Railway automatically detects [`backend/railway.json`](./backend/railway.json) and [`backend/Dockerfile`](./backend/Dockerfile).
  4. In **Networking**, click **Generate Domain** and copy your HTTPS URL (e.g., `https://tush-backend-production.up.railway.app`).
- **Render (Web Service):**
  1. New **Web Service** → Connect `Walzeem/Tush`.
  2. Set **Root Directory** to `backend` and **Runtime** to `Docker`.
  3. Copy the live URL (e.g., `https://tush-tags-backend.onrender.com`).

Verify the backend is healthy by opening:
- `https://<your-backend-domain>/health` → `{"status":"UP","database":"up"}`
- `https://<your-backend-domain>/.well-known/stellar.toml`

### Step 2 — Deploy `dashboard/` on Vercel or Netlify
- **Vercel:**
  1. Import `Walzeem/Tush` in [Vercel](https://vercel.com/new).
  2. Set **Root Directory** to `dashboard` (Vercel automatically reads [`dashboard/vercel.json`](./dashboard/vercel.json)).
  3. Add Environment Variables:
     - `VITE_API_BASE` = `https://<your-backend-domain>` *(no trailing slash)*
     - `VITE_NETWORK` = `testnet`
  4. Click **Deploy**.
- **Netlify:**
  1. Import `Walzeem/Tush` in Netlify (reads [`dashboard/netlify.toml`](./dashboard/netlify.toml)).
  2. Set Environment Variables `VITE_API_BASE=https://<your-backend-domain>` and `VITE_NETWORK=testnet`.
  3. Click **Deploy site**.

---

## Live Testnet Verification Checklist

Once deployed, open your live Frontend HTTPS URL on desktop or mobile:
1. **Landing Page (`#welcome`):** Confirm the **"Your name. Your tag."** landing page loads first.
2. **Create Wallet:** Click **Launch web app** → **Create Wallet** (test Passkey biometric sign-in or 12-word SEP-5 recovery phrase).
3. **Claim `@tag`:** Claim your `@username` handle (signed via Ed25519 SEP-53 and stored in your live backend).
4. **Fund on Testnet:** Click **Fund Wallet (10,000 XLM Testnet)** on the Dashboard to fund via Stellar Friendbot.
5. **Send by `@tag` & Swap:** Send XLM to another `@tag` or test a live XLM ↔ USDC swap via Horizon Strict-Send paths.

