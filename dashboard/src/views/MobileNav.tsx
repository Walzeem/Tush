interface MobileNavProps {
  active: 'dashboard' | 'nfts' | 'analytics' | 'history' | 'help' | 'register' | string;
  onDashboardClick: () => void;
  onNftsClick?: () => void;
  onAnalyticsClick: () => void;
  onHistoryClick: () => void;
  onHelpClick?: () => void;
  onRegisterClick?: () => void;
  canRegister?: boolean;
}

function MobileNav({
  active,
  onDashboardClick,
  onNftsClick,
  onAnalyticsClick,
  onHistoryClick,
}: MobileNavProps) {
  const handleNfts = () => {
    if (onNftsClick) {
      onNftsClick();
    } else {
      window.location.hash = 'nfts';
    }
  };

  return (
    <nav className="mobile-nav" aria-label="Primary">
      <button
        type="button"
        className={active === 'dashboard' ? 'is-active' : ''}
        onClick={onDashboardClick}
        aria-current={active === 'dashboard' ? 'page' : undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
          <path d="M16 12h2" />
        </svg>
        <span>Home</span>
      </button>

      <button
        type="button"
        className={active === 'nfts' ? 'is-active' : ''}
        onClick={handleNfts}
        aria-current={active === 'nfts' ? 'page' : undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
        <span>NFTs</span>
      </button>

      <button
        type="button"
        className={active === 'analytics' ? 'is-active' : ''}
        onClick={onAnalyticsClick}
        aria-current={active === 'analytics' ? 'page' : undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <polygon points="14.5,9.5 9.5,11 8,16 13,14.5" />
        </svg>
        <span>Apps</span>
      </button>

      <button
        type="button"
        className={active === 'history' ? 'is-active' : ''}
        onClick={onHistoryClick}
        aria-current={active === 'history' ? 'page' : undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
        <span>Activity</span>
      </button>
    </nav>
  );
}

export default MobileNav;
