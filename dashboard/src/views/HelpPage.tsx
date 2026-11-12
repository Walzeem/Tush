import { useState } from 'react';
import ScrollToTop from '../ScrollToTop';
import TushLogo from '../components/TushLogo';
import NetworkBadge from '../NetworkBadge';
import MobileNav from './MobileNav';
import { NAV_STORAGE_KEY, useNavState } from './shared';

function HelpPage({
  onDashboardClick,
  onAnalyticsClick,
  onHistoryClick,
  onLandingClick,
  onRegisterClick,
  canRegister,
}: any) {
  const [isNavOpen, setIsNavOpen] = useNavState();
  const [activeHelpAction, setActiveHelpAction] = useState("");
  const closeNav = () => {
    sessionStorage.setItem(NAV_STORAGE_KEY, "false");
    setIsNavOpen(false);
  };
  const handleNav = (action) => {
    sessionStorage.setItem(NAV_STORAGE_KEY, "false");
    setIsNavOpen(false);
    action();
  };

  const helpContent = {
    identity: (
      <div className="help-action-content">
        <p>
          Our platform uses a Federation Server. This acts as a decentralized
          phonebook that maps your easy-to-read name tag directly to your
          cryptographic public key.
        </p>
        <div className="help-action-block">
          <strong>The Process:</strong>
          <ol>
            <li>Navigate to the Profile page.</li>
            <li>Connect your Freighter Wallet to verify ownership.</li>
            <li>Enter your desired username and click Claim.</li>
          </ol>
        </div>
        <p className="help-action-note">
          Note: Once claimed, your name tag is permanent and can be shared with
          anyone on the network to receive instant payments.
        </p>
      </div>
    ),
    troubleshooting: (
      <div className="help-action-content">
        <p>
          <strong>Simulation Failed:</strong> If the dashboard says "Simulation
          Failed," it usually means the smart contract rejected the logic.
          Ensure you aren't trying to send more XLM than you actually have in
          your balance (including the 0.4% fee, capped at 30 XLM).
        </p>
        <p>
          <strong>Wallet Locked:</strong> If the Freighter popup doesn't appear,
          check the extension icon in your browser. If it has a red dot or says
          "Locked," you must re-enter your password before the dashboard can
          request a signature.
        </p>
      </div>
    ),
  };
  return (
    <div className={`dashboard ${isNavOpen ? "nav-open" : ""}`}>
      <button
        type="button"
        className={`sidebar-scrim ${isNavOpen ? "is-open" : ""}`}
        onClick={() => setIsNavOpen(false)}
        aria-label="Close navigation"
      />
      <aside className={`sidebar ${isNavOpen ? "is-open" : ""}`}>
        <div className="brand">
          <TushLogo size="md" subtitle="Stellar Wallet" onClick={onLandingClick || onDashboardClick} />
        </div>
        <div className="nav">
          <button type="button" onClick={() => handleNav(onDashboardClick)}>
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.hash = 'nfts';
              handleNav(onDashboardClick);
            }}
          >
            NFTs
          </button>
          <button type="button" onClick={() => handleNav(onAnalyticsClick)}>
            Apps
          </button>
          <button type="button" onClick={() => handleNav(onHistoryClick)}>
            Activity
          </button>
          <button type="button" aria-current="page" onClick={closeNav}>
            Support
          </button>
          {canRegister && (
            <button type="button" onClick={() => handleNav(onRegisterClick)}>
              Registration
            </button>
          )}
        </div>
      </aside>

      <main className="main">
        <section className="topbar reveal wallet-app-bar">
          <div className="topbar-brand-group">
            <TushLogo size="sm" subtitle="Smart Wallet" onClick={onLandingClick || onDashboardClick} />
            <nav className="desktop-nav-pills" aria-label="Desktop navigation">
              <button type="button" className="desktop-nav-pill" onClick={onDashboardClick}>
                Home
              </button>
              <button
                type="button"
                className="desktop-nav-pill"
                onClick={() => {
                  window.location.hash = 'nfts';
                  onDashboardClick();
                }}
              >
                NFTs
              </button>
              <button type="button" className="desktop-nav-pill" onClick={onAnalyticsClick}>
                Apps
              </button>
              <button type="button" className="desktop-nav-pill" onClick={onHistoryClick}>
                Activity
              </button>
              <button type="button" className="desktop-nav-pill is-active">
                Support
              </button>
              {onLandingClick && (
                <button type="button" className="desktop-nav-pill desktop-nav-pill--accent" onClick={onLandingClick}>
                  ✦ Landing
                </button>
              )}
            </nav>
          </div>
          <div className="topbar-actions">
            <NetworkBadge />
          </div>
        </section>

        <section className="help-hero card reveal">
          <div className="help-hero-content">
            <p className="help-eyebrow">Help Center</p>
            <h2 className="help-title">System Clarity</h2>
            <div className="help-search" role="search">
              <input
                type="search"
                placeholder="Search identities, routing, or transactions"
                aria-label="Search the help center"
              />
              <div className="help-search-glow" aria-hidden="true" />
            </div>
            <div className="help-actions">
              <button
                type="button"
                className={activeHelpAction === "identity" ? "is-active" : ""}
                onClick={() =>
                  setActiveHelpAction((prev) =>
                    prev === "identity" ? "" : "identity",
                  )
                }
              >
                Claim Identity
              </button>
              <button type="button">Smart Routing</button>
              <button
                type="button"
                className={
                  activeHelpAction === "troubleshooting" ? "is-active" : ""
                }
                onClick={() =>
                  setActiveHelpAction((prev) =>
                    prev === "troubleshooting" ? "" : "troubleshooting",
                  )
                }
              >
                Troubleshooting
              </button>
            </div>
            <div
              className={`help-action-panel ${activeHelpAction ? "is-visible" : ""}`}
              aria-live="polite"
            >
              {helpContent[activeHelpAction] ?? null}
            </div>
            <div className="help-status">
              <span className="status-dot" aria-hidden="true" />
              Stellar Testnet: Operational
            </div>
          </div>
        </section>
      </main>
      <MobileNav
        active="help"
        onDashboardClick={() => handleNav(onDashboardClick)}
        onNftsClick={() => {
          window.location.hash = 'nfts';
          handleNav(onDashboardClick);
        }}
        onHistoryClick={() => handleNav(onHistoryClick)}
        onAnalyticsClick={() => handleNav(onAnalyticsClick)}
        onHelpClick={closeNav}
        onRegisterClick={() => handleNav(onRegisterClick)}
        canRegister={canRegister}
      />
      <ScrollToTop />
    </div>
  );
}

export default HelpPage;
