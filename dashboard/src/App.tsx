import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import logger from './logger';
import LoadingSpinner from './components/LoadingSpinner';
import WalletLayout from './components/layout/WalletLayout';
import { HORIZON_BASE, API_BASE, walletKit } from './views/shared';

const LandingPage = lazy(() => import('./views/LandingPage'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const HelpPage = lazy(() => import('./views/HelpPage'));
const AnalyticsPage = lazy(() => import('./views/AnalyticsPage'));
const HistoryPage = lazy(() => import('./views/HistoryPage'));
const RegistrationPage = lazy(() => import('./views/RegistrationPage'));

function ViewFallback({ label = 'Loading view...' }) {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <LoadingSpinner color="text-blue" />
      <span>{label}</span>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div
      style={{
        backgroundColor: '#DC2626',
        color: '#FFFFFF',
        padding: '12px 16px',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      ⚠️ You are currently offline. Transactions will fail.
    </div>
  );
}

function App() {
  // On the web app, the landing page is ALWAYS the first screen on every fresh load.
  // Inside the Chrome Extension popup/sidepanel, open directly to the wallet dashboard.
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const isExtension =
      window.location.protocol === 'chrome-extension:' ||
      mode === 'popup' ||
      mode === 'sidepanel';

    if (isExtension) {
      document.documentElement.classList.add('tush-extension-mode');
      if (mode === 'popup') {
        document.documentElement.classList.add('tush-extension-popup');
      }
      return 'dashboard';
    }

    if (window.location.hash !== '#welcome') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#welcome`);
    }
    return 'landing';
  });

  const [pendingModal, setPendingModal] = useState<string | null>(null);
  const [userPublicKey, setUserPublicKey] = useState(() => {
    return localStorage.getItem('walletPublicKey') || '';
  });
  const [registrationState, setRegistrationState] = useState('unknown');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const withWalletLayout = useCallback(
    (children: React.ReactNode) => (
      <WalletLayout>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              borderRadius: '14px',
              padding: '14px 18px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(0, 240, 255, 0.3)',
            },
          }}
        />
        {isOffline && <OfflineBanner />}
        {children}
      </WalletLayout>
    ),
    [isOffline],
  );

  const handleNavigate = useCallback((view: string) => {
    setActiveView(view);
    if (view === 'landing') {
      window.location.hash = 'welcome';
      return;
    }
    if (view === 'register') {
      window.location.hash = 'register';
      return;
    }
    if (view === 'help') {
      window.location.hash = 'help';
      return;
    }
    if (view === 'analytics') {
      window.location.hash = 'analytics';
      return;
    }
    if (view === 'history') {
      window.location.hash = 'history';
      return;
    }
    window.location.hash = 'dashboard';
  }, []);

  const handleConnectWallet = async () => {
    try {
      await walletKit.openModal({
        onWalletSelected: async (option) => {
          try {
            walletKit.setWallet(option.id);
            const addressResponse = await walletKit.getAddress();

            const publicKey =
              typeof addressResponse === 'string'
                ? addressResponse
                : addressResponse.address;

            const dbResponse = await fetch(
              `${API_BASE}/lookup?address=${encodeURIComponent(publicKey)}`,
            );

            if (dbResponse.ok) {
              setRegistrationState('existing');
            } else if (dbResponse.status === 404) {
              setRegistrationState('new');
              handleNavigate('register');
            }

            localStorage.setItem('walletPublicKey', publicKey);
            setUserPublicKey(publicKey);
          } catch (err) {
            logger.error({ err }, 'Wallet connection failed');
            toast.error('Failed to connect wallet.');
          }
        },
      });

      return { ok: true };
    } catch (error) {
      toast.error('Connection cancelled.');
      logger.error({ error }, 'User closed modal or an error occurred');
      return { ok: false, error: 'Wallet connection process cancelled.' };
    }
  };

  const handleDisconnectWallet = () => {
    localStorage.removeItem('walletPublicKey');
    setUserPublicKey('');
    setBalance(null);
  };

  const [balance, setBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  const loadBalance = useCallback(async () => {
    setIsRefreshing(true);
    setBalanceError('');
    try {
      const response = await fetch(`${HORIZON_BASE}/accounts/${userPublicKey}`);
      if (!response.ok) {
        throw new Error(`Horizon error (${response.status}).`);
      }

      const data = await response.json();
      const nativeBalance = data?.balances?.find(
        (item: any) => item.asset_type === 'native',
      );
      const value = nativeBalance?.balance;
      setBalance(value ? Number(value) : null);
    } catch (error: any) {
      setBalance(null);
      setBalanceError(error.message || 'Unable to load balance.');
    } finally {
      setIsRefreshing(false);
    }
  }, [userPublicKey]);

  useEffect(() => {
    if (!userPublicKey) {
      return;
    }
    loadBalance();
  }, [userPublicKey, loadBalance]);

  useEffect(() => {
    const syncView = () => {
      const hash = window.location.hash;
      if (hash === '#welcome' || hash === '#landing') {
        setActiveView('landing');
        return;
      }
      if (hash === '#register') {
        setActiveView('register');
        return;
      }
      if (hash === '#help') {
        setActiveView('help');
        return;
      }
      if (hash === '#analytics') {
        setActiveView('analytics');
        return;
      }
      if (hash === '#history') {
        setActiveView('history');
        return;
      }
      if (hash === '#dashboard' || hash === '#nfts') {
        setActiveView('dashboard');
      }
    };

    window.addEventListener('hashchange', syncView);
    return () => window.removeEventListener('hashchange', syncView);
  }, []);

  const handleRegistrationStateChange = useCallback(
    (nextState: string) => {
      setRegistrationState(nextState);

      if (nextState === 'new') {
        handleNavigate('register');
      }

      if (nextState === 'existing' && activeView === 'register') {
        handleNavigate('dashboard');
      }
    },
    [activeView, handleNavigate],
  );

  if (activeView === 'landing') {
    const savedAddress =
      localStorage.getItem('tush_wallet_address') || userPublicKey || '';
    const savedTag = localStorage.getItem('tush_user_tag') || '';

    return withWalletLayout(
      <Suspense fallback={<ViewFallback label="Loading Tush Wallet..." />}>
        <LandingPage
          hasActiveWallet={Boolean(savedAddress)}
          userTag={savedTag}
          onLaunchDashboard={() => handleNavigate('dashboard')}
          onCreateWallet={() => {
            setPendingModal('create-wallet');
            handleNavigate('dashboard');
          }}
          onExploreApps={() => handleNavigate('analytics')}
          onViewActivity={() => handleNavigate('history')}
          onOpenHelp={() => handleNavigate('help')}
        />
      </Suspense>,
    );
  }

  if (
    activeView === 'register' &&
    (registrationState === 'new' || registrationState === 'skipped')
  ) {
    return withWalletLayout(
      <Suspense fallback={<ViewFallback label="Loading registration..." />}>
        <RegistrationPage
          userPublicKey={userPublicKey}
          setUserPublicKey={setUserPublicKey}
          onBack={() => {
            setRegistrationState('skipped');
            handleNavigate('dashboard');
          }}
          onRegistered={() => handleRegistrationStateChange('existing')}
        />
      </Suspense>,
    );
  }

  if (activeView === 'help') {
    return withWalletLayout(
      <Suspense fallback={<ViewFallback label="Loading help center..." />}>
        <HelpPage
          userPublicKey={userPublicKey}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          onDashboardClick={() => handleNavigate('dashboard')}
          onAnalyticsClick={() => handleNavigate('analytics')}
          onHistoryClick={() => handleNavigate('history')}
          onLandingClick={() => handleNavigate('landing')}
          onRegisterClick={() => handleNavigate('register')}
          canRegister={registrationState !== 'existing'}
        />
      </Suspense>,
    );
  }

  if (activeView === 'analytics') {
    return withWalletLayout(
      <Suspense fallback={<ViewFallback label="Loading apps & analytics..." />}>
        <AnalyticsPage
          userPublicKey={userPublicKey}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          onDashboardClick={() => handleNavigate('dashboard')}
          onHistoryClick={() => handleNavigate('history')}
          onHelpClick={() => handleNavigate('help')}
          onLandingClick={() => handleNavigate('landing')}
          onRegisterClick={() => handleNavigate('register')}
          canRegister={registrationState === 'new'}
        />
      </Suspense>,
    );
  }

  if (activeView === 'history') {
    return withWalletLayout(
      <Suspense fallback={<ViewFallback label="Loading activity..." />}>
        <HistoryPage
          userPublicKey={userPublicKey}
          setUserPublicKey={setUserPublicKey}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          onRefreshBalance={loadBalance}
          onDashboardClick={() => handleNavigate('dashboard')}
          onAnalyticsClick={() => handleNavigate('analytics')}
          onHelpClick={() => handleNavigate('help')}
          onLandingClick={() => handleNavigate('landing')}
          onRegisterClick={() => handleNavigate('register')}
          canRegister={registrationState === 'new'}
        />
      </Suspense>,
    );
  }

  return withWalletLayout(
    <Suspense fallback={<ViewFallback label="Loading dashboard..." />}>
      <Dashboard
        userPublicKey={userPublicKey}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        balance={balance}
        isRefreshing={isRefreshing}
        balanceError={balanceError}
        onRefreshBalance={loadBalance}
        onRegisterClick={() => handleNavigate('register')}
        onAnalyticsClick={() => handleNavigate('analytics')}
        onHistoryClick={() => handleNavigate('history')}
        onHelpClick={() => handleNavigate('help')}
        onLandingClick={() => handleNavigate('landing')}
        onRegistrationStateChange={handleRegistrationStateChange}
        canRegister={registrationState === 'new'}
        initialModal={pendingModal}
        onClearInitialModal={() => setPendingModal(null)}
      />
    </Suspense>,
  );
}

export default App;
