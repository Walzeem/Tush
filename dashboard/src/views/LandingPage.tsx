import { useState } from 'react';
import TushLogo from '../components/TushLogo';
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

const DEMO_TAGS: Record<string, { address: string; badge: string }> = {
  walzeem: { address: 'GD7X…9TUSH', badge: 'Verified · SEP-2' },
  alice: { address: 'GA4L…SEP5U', badge: 'Passkey account' },
  soroban: { address: 'GBSO…ETWOR', badge: 'Smart account' },
};

const ANNOUNCEMENTS = [
  '✦ Claim your @tag today',
  '✦ Passkey sign-in is live',
  '✦ Swap on the Stellar DEX in one tap',
  '✦ SEP-7 payment links & QR codes',
];

export default function LandingPage({
  hasActiveWallet,
  userTag,
  onLaunchDashboard,
  onCreateWallet,
  onExploreApps,
  onViewActivity,
  onOpenHelp,
}: LandingPageProps) {
  const [query, setQuery] = useState('walzeem');
  const [copied, setCopied] = useState(false);

  const key = query.trim().replace(/^@/, '').toLowerCase();
  const hit = DEMO_TAGS[key];
  const clean = key.replace(/[^a-z0-9_-]/g, '');

  const copy = () => {
    navigator.clipboard?.writeText(`@${clean}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const launch = hasActiveWallet ? onLaunchDashboard : onCreateWallet;

  return (
    <div className="sl">
      {/* Announcement ticker */}
      <div className="sl-ticker" aria-hidden="true">
        <div className="sl-ticker__track">
          {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS, ...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      {/* Navbar */}
      <header className="sl-nav">
        <div className="sl-nav__inner">
          <TushLogo size="md" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <nav className="sl-nav__links" aria-label="Sections">
            <a href="#learn">Learn more</a>
            <a href="#tag">@tag</a>
            <a href="#defi">DeFi</a>
            <a href="#security">Security</a>
            <a href="#download">Download</a>
            <button type="button" onClick={onOpenHelp}>Guides</button>
          </nav>
          <button type="button" className="sl-btn sl-btn--white sl-btn--sm" onClick={onLaunchDashboard}>
            {hasActiveWallet ? (userTag ? `Open ${userTag}` : 'Open wallet') : 'Launch App'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="sl-hero" id="learn">
        <div className="sl-hero__bubbles" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <div className="sl-hero__inner">
          <div className="sl-hero__copy">
            <p className="sl-eyebrow">TUSH WALLET · STELLAR &amp; SOROBAN</p>
            <h1 className="sl-hero__title">
              Your name.
              <br />
              <span>Your tag.</span>
            </h1>
            <p className="sl-hero__sub">
              Send, swap and earn on Stellar with a simple <b>@tag</b> that is yours alone — no
              56-character keys, no hassle.
            </p>
            <div className="sl-hero__cta">
              <button type="button" className="sl-btn sl-btn--white sl-btn--lg" onClick={launch}>
                Launch web app
              </button>
              <button type="button" className="sl-btn sl-btn--ghost sl-btn--lg" onClick={() => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' })}>
                Download for Chrome
              </button>
            </div>
            <p className="sl-hero__note">Also coming to iOS &amp; Android</p>
          </div>

          <div className="sl-phone-wrap">
            <div className="sl-phone">
              <div className="sl-phone__notch" />
              <div className="sl-phone__screen">
                <div className="sl-phone__top">
                  <span className="sl-phone__tag">{userTag || '@walzeem'}</span>
                  <span className="sl-phone__net">Testnet</span>
                </div>
                <div className="sl-phone__bal-label">Total balance</div>
                <div className="sl-phone__bal">$1,284.50</div>
                <div className="sl-phone__actions">
                  <span>↗ Send</span>
                  <span>↙ Receive</span>
                  <span>⇄ Swap</span>
                </div>
                <div className="sl-phone__row">
                  <i className="sl-coin sl-coin--xlm">✦</i>
                  <div><b>Stellar</b><small>10,704 XLM</small></div>
                  <em>$1,284</em>
                </div>
                <div className="sl-phone__row">
                  <i className="sl-coin sl-coin--usdc">$</i>
                  <div><b>USD Coin</b><small>0.50 USDC</small></div>
                  <em>$0.50</em>
                </div>
              </div>
            </div>
            <div className="sl-bubble sl-bubble--a">↙ +250 XLM from @alice</div>
            <div className="sl-bubble sl-bubble--b">✓ Settled in 3.9s</div>
          </div>
        </div>
      </section>

      {/* Shortcut to DeFi */}
      <section className="sl-section sl-section--light" id="defi">
        <div className="sl-wrap sl-split">
          <div>
            <p className="sl-eyebrow sl-eyebrow--blue">TUSH WALLET</p>
            <h2 className="sl-h2">Your shortcut to DeFi.</h2>
            <p className="sl-p">
              Discover vetted ways to put your crypto to work across Stellar &amp; Soroban protocols,
              all from your Tush wallet.
            </p>
            <ul className="sl-checks">
              <li>Simple, direct execution — enter and manage in a few taps.</li>
              <li>Compare options and confirm when ready.</li>
              <li>Swap through live Horizon DEX paths with auto trustlines.</li>
            </ul>
            <button type="button" className="sl-btn sl-btn--blue sl-btn--lg" onClick={onExploreApps}>
              Explore dApps
            </button>
          </div>
          <div className="sl-card-stack" aria-hidden="true">
            <div className="sl-defi-card"><b>Soroswap</b><span>AMM DEX</span><em>Swap</em></div>
            <div className="sl-defi-card"><b>Blend</b><span>Lending &amp; yield</span><em>Earn</em></div>
            <div className="sl-defi-card"><b>Aquarius</b><span>Liquidity</span><em>Vote</em></div>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="sl-section sl-section--blue" id="tag">
        <div className="sl-wrap">
          <h2 className="sl-h2 sl-h2--center sl-h2--white">All things Stellar. All in one.</h2>
          <div className="sl-pillars">
            <article className="sl-pillar">
              <span className="sl-pillar__n">01</span>
              <h3>Frictionless onboarding</h3>
              <p>Sign in with a biometric passkey, or use a 12-word recovery phrase. Ready in seconds.</p>
            </article>
            <article className="sl-pillar">
              <span className="sl-pillar__n">02</span>
              <h3>Pay anyone instantly</h3>
              <p>Send to a handle like <b>@alice</b> or share a payment link. It just arrives.</p>
            </article>
            <article className="sl-pillar">
              <span className="sl-pillar__n">03</span>
              <h3>Don’t just hodl. Grow.</h3>
              <p>Stake XLM and explore yield without leaving your wallet.</p>
            </article>
          </div>

          <div className="sl-resolver">
            <div className="sl-resolver__left">
              <h3>Try an @tag</h3>
              <label className="sl-resolver__input">
                <span>@</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="yourname"
                  aria-label="Tag to look up"
                />
              </label>
              <div className="sl-chips">
                {Object.keys(DEMO_TAGS).map((k) => (
                  <button key={k} type="button" className={key === k ? 'is-on' : ''} onClick={() => setQuery(k)}>
                    @{k}
                  </button>
                ))}
              </div>
            </div>
            <div className="sl-resolver__right">
              <div className="sl-resolver__status">{hit ? hit.badge : clean ? 'Available to claim' : '—'}</div>
              <div className="sl-resolver__tag">@{clean || 'yourname'}</div>
              <div className="sl-resolver__addr">{hit ? hit.address : 'Claim it when you create a wallet'}</div>
              <div className="sl-resolver__btns">
                <button type="button" className="sl-btn sl-btn--blue sl-btn--sm" onClick={onCreateWallet}>
                  Claim your @tag
                </button>
                <button type="button" className="sl-btn sl-btn--outline sl-btn--sm" onClick={copy}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="sl-section sl-section--light" id="security">
        <div className="sl-wrap">
          <h2 className="sl-h2 sl-h2--center">Crypto that works. Safely.</h2>
          <div className="sl-grid3">
            <article className="sl-feature">
              <i>🔐</i>
              <h3>Encrypted vault</h3>
              <p>AES-256-GCM with PBKDF2 (600,000 iterations) and auto-lock. Keys never leave your device.</p>
            </article>
            <article className="sl-feature">
              <i>🔑</i>
              <h3>Passkeys</h3>
              <p>Face ID, Touch ID or Windows Hello — no extension, no seed phrase to lose.</p>
            </article>
            <article className="sl-feature">
              <i>🧩</i>
              <h3>Open standards</h3>
              <p>SEP-2 names, SEP-5 recovery, SEP-7 payment links and a SEP-43 dApp provider.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Always within reach */}
      <section className="sl-section sl-section--dark" id="download">
        <div className="sl-wrap">
          <h2 className="sl-h2 sl-h2--center sl-h2--white">Tush is always within reach.</h2>
          <div className="sl-grid3">
            <article className="sl-device">
              <span className="sl-device__tag">Soon</span>
              <h3>Mobile app</h3>
              <p>Full control, anytime, anywhere. Swap, stake and explore in a few taps.</p>
              <button type="button" className="sl-btn sl-btn--ghost sl-btn--sm" onClick={onOpenHelp}>Get notified</button>
            </article>
            <article className="sl-device sl-device--hot">
              <span className="sl-device__tag">Live</span>
              <h3>Web app</h3>
              <p>A powerful wallet, no downloads required. Works in any browser.</p>
              <button type="button" className="sl-btn sl-btn--white sl-btn--sm" onClick={launch}>Launch web app</button>
            </article>
            <article className="sl-device sl-device--hot">
              <span className="sl-device__tag">Live</span>
              <h3>Browser extension</h3>
              <p>Seamless dApp access with instant approvals right in Chrome.</p>
              <a
                className="sl-btn sl-btn--white sl-btn--sm"
                href="/tush-wallet-extension.zip"
                download="tush-wallet-extension.zip"
              >
                Download for Chrome
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="sl-final">
        <h2>Claim your name. Own your tag.</h2>
        <div className="sl-hero__cta sl-hero__cta--center">
          <button type="button" className="sl-btn sl-btn--white sl-btn--lg" onClick={onCreateWallet}>Get Tush</button>
          <button type="button" className="sl-btn sl-btn--ghost sl-btn--lg" onClick={onLaunchDashboard}>Open dashboard</button>
        </div>
      </section>

      <footer className="sl-footer">
        <TushLogo size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <div className="sl-footer__links">
          <button type="button" onClick={onLaunchDashboard}>Home</button>
          <button type="button" onClick={onExploreApps}>Apps</button>
          <button type="button" onClick={onViewActivity}>Activity</button>
          <button type="button" onClick={onOpenHelp}>Support</button>
        </div>
        <small>© {new Date().getFullYear()} Tush Wallet · Stellar Testnet</small>
      </footer>
    </div>
  );
}
