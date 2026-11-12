import React, { Fragment, useEffect, useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import NetworkBadge from '../NetworkBadge';
import ScrollToTop from '../ScrollToTop';
import MobileNav from './MobileNav';
import { NAV_STORAGE_KEY, useNavState, formatShortAddress } from './shared';
import './HistoryPage.css';

function HistoryPage({
  onDashboardClick,
  onAnalyticsClick,
  onHelpClick,
  onRegisterClick,
  canRegister,
}: any) {
  const [isNavOpen, setIsNavOpen] = useNavState();
  const [history, setHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState('');

  const activeAddress = localStorage.getItem('tush_wallet_address');
  const userTag = localStorage.getItem('tush_user_tag');

  const closeNav = () => {
    sessionStorage.setItem(NAV_STORAGE_KEY, "false");
    setIsNavOpen(false);
  };
  const handleNav = (action) => {
    sessionStorage.setItem(NAV_STORAGE_KEY, "false");
    setIsNavOpen(false);
    action();
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeAddress) return;
      setIsHistoryLoading(true);
      setError('');
      try {
        const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
        const response = await server.payments()
          .forAccount(activeAddress)
          .order('desc')
          .limit(15)
          .call();

        const mapped = response.records.map((record: any) => {
          const isReceived = record.to === activeAddress;
          return {
            id: record.id,
            type: isReceived ? 'Received' : 'Sent',
            amount: record.amount || '0',
            asset: record.asset_type === 'native' ? 'XLM' : record.asset_code,
            counterparty: isReceived ? record.from : record.to,
            date: new Date(record.created_at).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            txHash: record.transaction_hash
          };
        });

        setHistory(mapped);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("Network error fetching transaction history.");
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [activeAddress]);

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
          <div className="brand-mark">T</div>
          <h1>Tush Wallet</h1>
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
          <button type="button" aria-current="page" onClick={closeNav}>
            Activity
          </button>
          <button type="button" onClick={() => handleNav(onHelpClick)}>
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
        <section className="topbar reveal" style={{ padding: '24px 0 0 0', display: 'block' }}>
          <button
            type="button"
            className="hamburger"
            onClick={() => setIsNavOpen((prev) => !prev)}
            aria-label="Toggle navigation"
            aria-expanded={isNavOpen}
            style={{ position: 'absolute', top: '24px', right: '16px' }}
          >
            <span />
            <span />
            <span />
          </button>
          
          <div className="history-header">
            <div className="history-title-group">
              <h2>Transaction History</h2>
              <p>Review your recent on-chain activity</p>
            </div>
            <div className="history-pills">
              <span className="pill-testnet">Testnet</span>
              {userTag && <span className="pill-tag">{userTag}</span>}
            </div>
          </div>
        </section>

        <section className="reveal" style={{ marginTop: '24px', paddingBottom: '100px' }}>
          {!activeAddress ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
              Connect a wallet to view history.
            </div>
          ) : isHistoryLoading ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
              Loading transactions...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', color: '#ea4335', marginTop: '40px' }}>
              {error}
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
              No transactions found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
              {history.map((record) => (
                <a 
                  key={record.id}
                  href={`https://stellar.expert/explorer/testnet/tx/${record.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="history-row"
                >
                  <div className="history-row-left">
                    <div className={`history-icon ${record.type === 'Received' ? 'received' : 'sent'}`}>
                      {record.type === 'Received' ? '↙' : '↗'}
                    </div>
                    <div>
                      <div className="history-counterparty">
                        {formatShortAddress(record.counterparty)}
                      </div>
                      <div className="history-date">
                        {record.date}
                      </div>
                    </div>
                  </div>
                  
                  <div className="history-row-right">
                    <div className={`history-amount ${record.type === 'Received' ? 'received' : 'sent'}`}>
                      {record.type === 'Received' ? '+' : '-'}{parseFloat(record.amount).toFixed(2)}
                    </div>
                    <div className="history-asset">
                      {record.asset}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      <MobileNav
        active="history"
        onDashboardClick={() => handleNav(onDashboardClick)}
        onNftsClick={() => {
          window.location.hash = 'nfts';
          handleNav(onDashboardClick);
        }}
        onHistoryClick={closeNav}
        onAnalyticsClick={() => handleNav(onAnalyticsClick)}
        onHelpClick={() => handleNav(onHelpClick)}
        onRegisterClick={() => handleNav(onRegisterClick)}
        canRegister={canRegister}
      />
      <ScrollToTop />
    </div>
  );
}

export default HistoryPage;
