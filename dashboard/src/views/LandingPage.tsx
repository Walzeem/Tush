import { useState } from 'react';
import TushLogo from '../components/TushLogo';
import NetworkBadge from '../NetworkBadge';
import './LandingPage.css';

export interface LandingPageProps {
  hasActiveWallet: boolean;
  userTag?: string;
  onLaunchDashboard: () => void;
  onCreateWallet: () => void;
  onExploreApps: () => void;
  onViewActivity: () => void;
  onOpenHelp: () => void;
}

const DEMO_TAGS: Record<
  string,
  { tag: string; address: string; balance: string; badge: string; latency: string }
> = {
  walzeem: {
    tag: '@walzeem',
    address: 'GD7X9K3M4Q8V2W6P9N5L2J4H8R7T6Y3U2I9O4P8A5S2D7F6G3H2J9TUSH',
    balance: '42,850.00 XLM',
    badge: 'Verified Pioneer · SEP-2 + SEP-53',
    latency: '14ms',
  },
  tush: {
    tag: '@tush',
    address: 'GCTUSH8TREASURY9SOROBAN4ROUTER7VAULT2XLM5USDC8STELLAR9KEY',
    balance: '1,250,000.00 USDC',
    badge: 'Official Protocol Treasury',
    latency: '11ms',
  },
  soroban: {
    tag: '@soroban',
    address: 'GBSOROBAN7SMART9CONTRACT4DEX2POOL8YIELD5STELLAR3NETWORK2X',
    balance: '890,410.50 XLM',
    badge: 'Soroban Smart Account',
    latency: '16ms',
  },
  alice: {
    tag: '@alice',
    address: 'GA4L9I2C8E7STELLAR5WALLET3PASSKEY9RECOVERY6VAULT4SEP5USER',
    balance: '6,420.75 XLM',
    badge: 'Passkey Biometric Account',
    latency: '15ms',
  },
};

export default function LandingPage({
  hasActiveWallet,
  userTag,
  onLaunchDashboard,
  onCreateWallet,
  onExploreApps,
  onViewActivity,
  onOpenHelp,
}: LandingPageProps) {
  const [demoQuery, setDemoQuery] = useState('walzeem');
  const [previewTab, setPreviewTab] = useState<'assets' | 'swap' | 'tag'>('assets');
  const [copiedDemo, setCopiedDemo] = useState(false);

  const normalizedKey = demoQuery.trim().replace(/^@/, '').toLowerCase() || 'walzeem';
  const resolvedDemo = DEMO_TAGS[normalizedKey] || {
    tag: `@${normalizedKey.replace(/[^a-z0-9_-]/g, '') || 'user'}`,
    address: `G${normalizedKey
      .toUpperCase()
      .replace(/[^A-Z2-7]/g, 'X')
      .padEnd(12, '7')
      .slice(0, 12)}8STELLAR9SEP2FEDERATION7VERIFIED4TUSHWALLET`,
    balance: '10,000.00 XLM',
    badge: 'Available for Instant Claim · SEP-2 Ready',
    latency: '19ms',
  };

  const handleCopyDemo = () => {
    navigator.clipboard?.writeText(`${resolvedDemo.tag} -> ${resolvedDemo.address}`);
    setCopiedDemo(true);
    setTimeout(() => setCopiedDemo(false), 1800);
  };

  return (
    <div className="tush-landing">
      {/* Ambient Animated Background */}
      <div className="tush-landing__bg" aria-hidden="true">
        <div className="tush-orb tush-orb--cyan" />
        <div className="tush-orb tush-orb--violet" />
        <div className="tush-orb tush-orb--pink" />
        <div className="tush-grid-plane" />
      </div>

      {/* Sticky Glassmorphic Navbar */}
      <header className="tush-landing__nav">
        <div className="tush-landing__nav-inner">
          <TushLogo size="md" subtitle="Stellar Smart Wallet" onClick={onLaunchDashboard} />

          <nav className="tush-landing__links" aria-label="Landing Sections">
            <a href="#features" className="tush-landing__link">
              Features
            </a>
            <a href="#tag-playground" className="tush-landing__link">
              @tag Resolver
            </a>
            <a href="#how-it-works" className="tush-landing__link">
              Architecture
            </a>
            <button type="button" className="tush-landing__link-btn" onClick={onExploreApps}>
              dApp Ecosystem
            </button>
          </nav>

          <div className="tush-landing__nav-actions">
            <NetworkBadge />
            <button
              type="button"
              className="tush-btn tush-btn--secondary tush-btn--sm"
              onClick={onLaunchDashboard}
            >
              {hasActiveWallet ? (userTag ? `Wallet (${userTag})` : 'Open Dashboard') : 'Open App'}
            </button>
            <button
              type="button"
              className="tush-btn tush-btn--primary tush-btn--sm"
              onClick={hasActiveWallet ? onLaunchDashboard : onCreateWallet}
            >
              <span>{hasActiveWallet ? 'Launch Wallet' : 'Create Wallet'}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="tush-hero">
        <div className="tush-hero__content">
          <div className="tush-eyebrow-pill">
            <span className="tush-eyebrow-pill__dot" />
            <span>SEP-2 · SEP-5 · SEP-7 · SEP-43 · Soroban Smart Wallet</span>
          </div>

          <h1 className="tush-hero__title">
            Send Crypto Like a Handle.{' '}
            <span className="tush-hero__title-gradient">
              Own the Stellar Universe with <span className="tush-tag-highlight">@tag</span>.
            </span>
          </h1>

          <p className="tush-hero__subtitle">
            Meet <strong>Tush Wallet</strong> — the next-generation self-custodial wallet for{' '}
            <strong>Stellar &amp; Soroban</strong>. Replace 56-character cryptographic keys with your
            verified <code>@username</code>, unlock with Passkey biometrics, and swap across the
            Horizon DEX in 3.9 seconds.
          </p>

          <div className="tush-hero__cta-row">
            <button
              type="button"
              className="tush-btn tush-btn--primary tush-btn--lg"
              onClick={onCreateWallet}
            >
              <span>⚡ {hasActiveWallet ? 'Create / Switch Wallet' : 'Create Smart Wallet'}</span>
            </button>
            <button
              type="button"
              className="tush-btn tush-btn--glass tush-btn--lg"
              onClick={onLaunchDashboard}
            >
              <span>Launch Wallet Dashboard</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="tush-hero__trust-strip">
            <div className="tush-trust-metric">
              <span className="tush-trust-metric__value">3.9s</span>
              <span className="tush-trust-metric__label">Finality on Stellar</span>
            </div>
            <div className="tush-trust-divider" />
            <div className="tush-trust-metric">
              <span className="tush-trust-metric__value">600,000x</span>
              <span className="tush-trust-metric__label">PBKDF2 AES-256 Vault</span>
            </div>
            <div className="tush-trust-divider" />
            <div className="tush-trust-metric">
              <span className="tush-trust-metric__value">100%</span>
              <span className="tush-trust-metric__label">Self-Custodial SEP-5</span>
            </div>
          </div>
        </div>

        {/* Floating 3D Interactive Wallet Preview */}
        <div className="tush-hero__visual">
          <div className="tush-float-badge tush-float-badge--top">
            <span className="tush-float-badge__icon">↙</span>
            <div>
              <div className="tush-float-badge__title">Received +450.00 XLM</div>
              <div className="tush-float-badge__sub">from @walzeem · Confirmed in 3.8s</div>
            </div>
          </div>

          <div className="tush-preview-card">
            <div className="tush-preview-card__glow" />
            <div className="tush-preview-card__header">
              <div className="tush-preview-card__brand">
                <TushLogo size="sm" showWordmark={false} />
                <div>
                  <div className="tush-preview-card__handle">{userTag || '@walzeem'}</div>
                  <div className="tush-preview-card__addr">GD7X9...9TUSH · Verified SEP-2</div>
                </div>
              </div>
              <span className="tush-preview-card__status">
                <span className="tush-preview-card__status-dot" />
                Live Vault
              </span>
            </div>

            <div className="tush-preview-card__balance-box">
              <div className="tush-preview-card__eyebrow">TOTAL PORTFOLIO VALUE</div>
              <div className="tush-preview-card__amount-row">
                <span className="tush-preview-card__amount">$18,492.80</span>
                <span className="tush-preview-card__delta">+12.4%</span>
              </div>
              <div className="tush-preview-card__subamount">≈ 154,106.67 XLM · 4.8% APY Active</div>
            </div>

            <div className="tush-preview-card__actions">
              <button
                type="button"
                className="tush-preview-action-btn tush-preview-action-btn--primary"
                onClick={onLaunchDashboard}
              >
                <span>↗</span>
                <span>Send</span>
              </button>
              <button
                type="button"
                className="tush-preview-action-btn"
                onClick={onLaunchDashboard}
              >
                <span>↙</span>
                <span>Receive</span>
              </button>
              <button
                type="button"
                className="tush-preview-action-btn"
                onClick={onLaunchDashboard}
              >
                <span>⇄</span>
                <span>Swap</span>
              </button>
            </div>

            <div className="tush-preview-card__tabs">
              {(
                [
                  ['assets', 'Holdings'],
                  ['swap', 'Instant Swap'],
                  ['tag', '@tag Card'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`tush-preview-tab ${previewTab === key ? 'is-active' : ''}`}
                  onClick={() => setPreviewTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {previewTab === 'assets' && (
              <div className="tush-preview-list">
                <div className="tush-preview-item">
                  <div className="tush-preview-item__left">
                    <span className="tush-token-orb tush-token-orb--xlm">✦</span>
                    <div>
                      <div className="tush-preview-item__name">Stellar Lumens</div>
                      <div className="tush-preview-item__meta">XLM · Native Asset</div>
                    </div>
                  </div>
                  <div className="tush-preview-item__right">
                    <div className="tush-preview-item__val">98,420 XLM</div>
                    <div className="tush-preview-item__sub">$11,810.40</div>
                  </div>
                </div>

                <div className="tush-preview-item">
                  <div className="tush-preview-item__left">
                    <span className="tush-token-orb tush-token-orb--usdc">$</span>
                    <div>
                      <div className="tush-preview-item__name">USD Coin</div>
                      <div className="tush-preview-item__meta">USDC · Circle Stellar</div>
                    </div>
                  </div>
                  <div className="tush-preview-item__right">
                    <div className="tush-preview-item__val">6,682.40 USDC</div>
                    <div className="tush-preview-item__sub">$6,682.40</div>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'swap' && (
              <div className="tush-preview-swap-box">
                <div className="tush-preview-swap-row">
                  <span>Pay: 1,000 XLM</span>
                  <span className="tush-preview-swap-arrow">⇄</span>
                  <span className="tush-preview-swap-out">Receive: 120.45 USDC</span>
                </div>
                <div className="tush-preview-swap-meta">
                  Route: XLM → AQUA → USDC · Horizon Strict-Send · 0.5% Slippage
                </div>
              </div>
            )}

            {previewTab === 'tag' && (
              <div className="tush-preview-tag-card">
                <div className="tush-preview-tag-card__badge">SOULBOUND ON-CHAIN HANDLE</div>
                <div className="tush-preview-tag-card__handle">{userTag || '@walzeem'}*tush.stellar</div>
                <div className="tush-preview-tag-card__note">
                  Cryptographically signed with Ed25519 SEP-53 &amp; anchored via Stellar manage_data.
                </div>
              </div>
            )}
          </div>

          <div className="tush-float-badge tush-float-badge--bottom">
            <span className="tush-float-badge__icon tush-float-badge__icon--violet">🔑</span>
            <div>
              <div className="tush-float-badge__title">Passkey + AES-256-GCM</div>
              <div className="tush-float-badge__sub">Zero plaintext keys ever stored</div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Capabilities Marquee */}
      <div className="tush-marquee" aria-label="Protocol highlights">
        <div className="tush-marquee__track">
          {[
            '✦ Universal @tag Identity (SEP-2 Federation)',
            '🔐 AES-256-GCM + 600,000 PBKDF2 Encrypted Vault',
            '🔑 WebAuthn Biometric Passkey Smart Sign-In',
            '⇄ Horizon Path-Payment Strict-Send DEX Swaps',
            '📲 SEP-7 Deep Link & QR Payment Requests',
            '🌐 SEP-43 window.tushWallet dApp Provider',
            '⚡ 3.9s Stellar & Soroban Settlement',
            '✦ Universal @tag Identity (SEP-2 Federation)',
            '🔐 AES-256-GCM + 600,000 PBKDF2 Encrypted Vault',
            '🔑 WebAuthn Biometric Passkey Smart Sign-In',
          ].map((item, idx) => (
            <span key={idx} className="tush-marquee__item">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Live Interactive @tag Resolution Playground */}
      <section id="tag-playground" className="tush-section tush-playground-section">
        <div className="tush-section__header">
          <span className="tush-section__eyebrow">LIVE SEP-2 FEDERATION ENGINE</span>
          <h2 className="tush-section__title">Test Instant @tag Resolution</h2>
          <p className="tush-section__desc">
            Every wallet created on Tush receives a universal <code>@tag</code> backed by cryptographic
            Ed25519 SEP-53 signatures. Type any handle below or click a preset to inspect how Tush
            resolves human names into Stellar accounts.
          </p>
        </div>

        <div className="tush-playground-card">
          <div className="tush-playground-input-col">
            <label htmlFor="demo-tag-input" className="tush-playground-label">
              Enter a Tush Handle
            </label>
            <div className="tush-playground-input-wrap">
              <span className="tush-playground-at">@</span>
              <input
                id="demo-tag-input"
                type="text"
                value={demoQuery}
                onChange={(e) => setDemoQuery(e.target.value)}
                placeholder="walzeem"
                className="tush-playground-input"
              />
              <span className="tush-playground-latency">⚡ {resolvedDemo.latency}</span>
            </div>

            <div className="tush-playground-presets">
              <span className="tush-playground-presets__label">Try preset handles:</span>
              {Object.keys(DEMO_TAGS).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`tush-preset-chip ${normalizedKey === key ? 'is-active' : ''}`}
                  onClick={() => setDemoQuery(key)}
                >
                  @{key}
                </button>
              ))}
            </div>
          </div>

          <div className="tush-playground-output-col">
            <div className="tush-playground-output-header">
              <span className="tush-playground-badge">{resolvedDemo.badge}</span>
              <button
                type="button"
                className="tush-btn tush-btn--secondary tush-btn--xs"
                onClick={handleCopyDemo}
              >
                {copiedDemo ? '✓ Copied' : 'Copy Resolution'}
              </button>
            </div>
            <div className="tush-playground-resolved-tag">{resolvedDemo.tag}</div>
            <div className="tush-playground-resolved-addr">{resolvedDemo.address}</div>
            <div className="tush-playground-footer">
              <span>Balance: {resolvedDemo.balance}</span>
              <button
                type="button"
                className="tush-btn tush-btn--primary tush-btn--xs"
                onClick={onCreateWallet}
              >
                Claim Your Own @tag →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Feature Grid */}
      <section id="features" className="tush-section">
        <div className="tush-section__header">
          <span className="tush-section__eyebrow">SLUSH-GRADE EXPERIENCE ON STELLAR</span>
          <h2 className="tush-section__title">Built for Speed, Security &amp; Simplicity</h2>
          <p className="tush-section__desc">
            Designed from the ground up with full Stellar Ecosystem Proposal (SEP) compliance and
            responsive ergonomics across desktop, tablet, and mobile.
          </p>
        </div>

        <div className="tush-bento-grid">
          <article className="tush-bento-card tush-bento-card--wide">
            <div className="tush-bento-card__icon">🏷</div>
            <h3>Universal @tag Identity (SEP-2 + SEP-53)</h3>
            <p>
              Say goodbye to copying 56-character Stellar public keys. Claim your unique{' '}
              <code>@tag</code> on registration, verified by an Ed25519 signature over your account, and
              receive XLM or USDC by handle from anywhere.
            </p>
            <div className="tush-bento-card__pills">
              <span>Forward &amp; Reverse Lookup</span>
              <span>Anti-Spoofing Signatures</span>
              <span>On-Chain Soulbound Badge</span>
            </div>
          </article>

          <article className="tush-bento-card">
            <div className="tush-bento-card__icon">🛡️</div>
            <h3>AES-256-GCM Encrypted Vault</h3>
            <p>
              BIP-39 12-word recovery phrases derived at <code>m/44&apos;/148&apos;/0&apos;</code> (SEP-5)
              and encrypted at rest with 600,000-iteration PBKDF2-SHA256 and 15-minute auto-lock.
            </p>
          </article>

          <article className="tush-bento-card">
            <div className="tush-bento-card__icon">🔑</div>
            <h3>Passkey Biometric Sign-In</h3>
            <p>
              Create or unlock your wallet using hardware-backed WebAuthn Passkeys (Face ID, Touch ID,
              or Windows Hello) with zero browser extension required.
            </p>
          </article>

          <article className="tush-bento-card">
            <div className="tush-bento-card__icon">⇄</div>
            <h3>Horizon Strict-Send DEX Swaps</h3>
            <p>
              Query live multi-hop orderbook &amp; AMM paths on Stellar Horizon with configurable
              slippage and automatic trustline activation.
            </p>
          </article>

          <article className="tush-bento-card tush-bento-card--wide">
            <div className="tush-bento-card__icon">🌐</div>
            <h3>SEP-7 Deep Links &amp; SEP-43 dApp Standard</h3>
            <p>
              Generate shareable payment links and QR codes with pre-filled amounts and memos, and
              connect seamlessly to Soroban dApps through the injected <code>window.tushWallet</code>{' '}
              provider.
            </p>
            <div className="tush-bento-card__cta-row">
              <button
                type="button"
                className="tush-btn tush-btn--primary tush-btn--sm"
                onClick={onLaunchDashboard}
              >
                Open Wallet Now
              </button>
              <button
                type="button"
                className="tush-btn tush-btn--secondary tush-btn--sm"
                onClick={onExploreApps}
              >
                Browse Soroban dApps
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="tush-section">
        <div className="tush-section__header">
          <span className="tush-section__eyebrow">30-SECOND ONBOARDING</span>
          <h2 className="tush-section__title">From Zero to @tag in Three Steps</h2>
        </div>

        <div className="tush-steps-grid">
          <div className="tush-step-card">
            <span className="tush-step-card__num">01</span>
            <h3>Create or Import Wallet</h3>
            <p>
              Use biometric Passkey onboarding, generate a fresh 12-word SEP-5 recovery phrase, or
              import an existing Stellar secret key into your encrypted vault.
            </p>
          </div>
          <div className="tush-step-card">
            <span className="tush-step-card__num">02</span>
            <h3>Claim Your @tag Handle</h3>
            <p>
              Pick a memorable <code>@username</code>. Your wallet signs a cryptographic proof so only
              your Stellar keypair can ever own or update that tag.
            </p>
          </div>
          <div className="tush-step-card">
            <span className="tush-step-card__num">03</span>
            <h3>Send, Swap &amp; Earn</h3>
            <p>
              Fund on Testnet with one click, send payments to any <code>@tag</code>, swap tokens on the
              Stellar DEX, or stake XLM into the 4.8% APY yield vault.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA Banner */}
      <footer className="tush-landing__footer">
        <div className="tush-footer-cta">
          <div>
            <h2>Ready to Experience Tush Wallet?</h2>
            <p>Self-custodial, responsive on every device, and built for the Stellar ecosystem.</p>
          </div>
          <div className="tush-footer-cta__buttons">
            <button
              type="button"
              className="tush-btn tush-btn--primary tush-btn--lg"
              onClick={onCreateWallet}
            >
              Create New Wallet
            </button>
            <button
              type="button"
              className="tush-btn tush-btn--glass tush-btn--lg"
              onClick={onLaunchDashboard}
            >
              Go to Dashboard →
            </button>
          </div>
        </div>

        <div className="tush-footer-bottom">
          <TushLogo size="sm" subtitle="Universal Stellar Wallet" onClick={onLaunchDashboard} />
          <div className="tush-footer-nav">
            <button type="button" className="tush-landing__link-btn" onClick={onLaunchDashboard}>
              Home
            </button>
            <button type="button" className="tush-landing__link-btn" onClick={onExploreApps}>
              Apps
            </button>
            <button type="button" className="tush-landing__link-btn" onClick={onViewActivity}>
              Activity
            </button>
            <button type="button" className="tush-landing__link-btn" onClick={onOpenHelp}>
              Support
            </button>
          </div>
          <div className="tush-footer-copy">
            © {new Date().getFullYear()} Tush Wallet · SEP-2 / SEP-5 / SEP-7 / SEP-43
          </div>
        </div>
      </footer>
    </div>
  );
}
