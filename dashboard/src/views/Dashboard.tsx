import { useEffect, useRef, useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import freighterApi from '@stellar/freighter-api';
import toast from 'react-hot-toast';
import NetworkBadge from '../NetworkBadge';
import { useDebounce } from '../useDebounce';
import ScrollToTop from '../ScrollToTop';
import MobileNav from './MobileNav';
import RecentAddresses from '../components/RecentAddresses';
import { useRecentAddresses } from '../useRecentAddresses';
import {
  API_BASE,
  CONTRACT_ID,
  NAV_STORAGE_KEY,
  TOKEN_ADDRESS,
  TREASURY_ADDRESS,
  formatShortAddress,
  formatUsername,
  loadStellarSdk,
  resolveRecipient,
  apiErrorMessage,
  useNavState,
  useWalletMenu,
} from './shared';
import BottomSheet from '../components/modals/BottomSheet';
import ReceiveModal from '../components/modals/ReceiveModal';
import SendModal from '../components/modals/SendModal';
import SwapModal from '../components/modals/SwapModal';
import CreateWalletModal from '../components/modals/CreateWalletModal';
import ClaimTagModal from '../components/modals/ClaimTagModal';
import WalletSettingsModal from '../components/modals/WalletSettingsModal';
import TushLogo from '../components/TushLogo';
import { useVault, CANCELLED } from '../components/vaultContext';
import { getCachedTag, setCachedTag, syncTag } from '../utils/tags';
import { parseSep7Uri, type Sep7PayRequest } from '../utils/sep7';

function Dashboard({
  userPublicKey,
  onConnectWallet,
  onDisconnectWallet,
  balance,
  isRefreshing,
  balanceError,
  onRefreshBalance,
  onRegisterClick,
  onAnalyticsClick,
  onHistoryClick,
  onHelpClick,
  onLandingClick,
  onRegistrationStateChange,
  canRegister,
  initialModal,
  onClearInitialModal,
}: any) {
  const [isNavOpen, setIsNavOpen] = useNavState();
  const {
    menuRef,
    isOpen: isWalletMenuOpen,
    setIsOpen: setIsWalletMenuOpen,
  } = useWalletMenu();
  const closeNav = () => {
    sessionStorage.setItem(NAV_STORAGE_KEY, "false");
    setIsNavOpen(false);
  };
  const handleNav = (action) => {
    sessionStorage.setItem(NAV_STORAGE_KEY, 'false')
    setIsNavOpen(false)
    action()
  }
  const [nameTag, setNameTag] = useState('')
  const { ensureUnlocked } = useVault();
  const [activeModal, setActiveModal] = useState(null);
  const [showRecent, setShowRecent] = useState(false);
  const { recentAddresses, saveAddress, clearAddresses } = useRecentAddresses();
  const recipientRef = useRef(null);
  const debouncedNameTag = useDebounce(nameTag, 300)
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [receiveAddress, setReceiveAddress] = useState('')
  const [receiveTag, setReceiveTag] = useState('')
  const [receiveStatus, setReceiveStatus] = useState({
    text: '',
    color: '#1F2937',
    bgColor: '#F3F4F6',
  })
  const [status, setStatus] = useState({
    text: "",
    color: "#1F2937",
    bgColor: "#F3F4F6",
  });
  
  const [xlmBalance, setXlmBalance] = useState('0.00');
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isActivatingUSDC, setIsActivatingUSDC] = useState(false);
  const [hasUSDC, setHasUSDC] = useState(false);
  const [extraTokens, setExtraTokens] = useState<Array<{ symbol: string; amount: string }>>([]);
  const [onChainData, setOnChainData] = useState<Record<string, string>>({});
  const [portfolioTab, setPortfolioTab] = useState<'tokens' | 'nfts' | 'earn'>('tokens');
  const [stakeAmount, setStakeAmount] = useState('');
  const [isMintingBadge, setIsMintingBadge] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [sep7PayReq, setSep7PayReq] = useState<Sep7PayRequest | null>(null);
  const [activeWallet, setActiveWallet] = useState(() => localStorage.getItem('tush_wallet_address') || null);
  const [userTag, setUserTag] = useState(() => getCachedTag());
  // A tag from before tags moved to the federation server; offered as a starting point when claiming.
  const [legacyTag] = useState(() => getCachedTag());

  // The federation server is the source of truth for tags: ask it who owns this
  // address, so an imported wallet on a new device gets its tag back. Only prompt
  // to claim when the server positively says there is none (never on a lookup error).
  useEffect(() => {
    if (!activeWallet) return undefined;
    const controller = new AbortController();
    syncTag(activeWallet, { signal: controller.signal })
      .then((tag) => {
        setUserTag(tag);
        setActiveModal((current) => {
          if (tag) return current === 'claim-tag' ? null : current;
          return current ?? 'claim-tag';
        });
      })
      .catch(() => {
        // Offline or server down: keep the cached tag and don't nag.
      });
    return () => controller.abort();
  }, [activeWallet]);

  const walletLabel = userPublicKey
    ? `Connected: ${userPublicKey.substring(0, 5)}...${userPublicKey.substring(51)}`
    : "";

  const assetRows = [
    {
      name: 'Stellar',
      symbol: 'XLM',
      amount: `${xlmBalance} XLM`,
      value: `$${(parseFloat(xlmBalance || '0') * 0.12).toFixed(2)}`,
      accent: 'stellar',
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      amount: `${usdcBalance} USDC`,
      value: `$${usdcBalance}`,
      accent: 'usdc',
    },
    ...extraTokens.map((t) => ({
      name: `${t.symbol} Token`,
      symbol: t.symbol,
      amount: `${t.amount} ${t.symbol}`,
      value: `$${t.amount}`,
      accent: 'usdc',
    })),
  ];

  // Automatically detect ?sep7=... payment request deep links on load, and sync #nfts hash
  useEffect(() => {
    if (initialModal) {
      setActiveModal(initialModal);
      onClearInitialModal?.();
    }
  }, [initialModal, onClearInitialModal]);

  useEffect(() => {
    const parsed = parseSep7Uri(window.location.href);
    if (parsed && parsed.type === 'pay') {
      setSep7PayReq(parsed);
      setActiveModal('send');
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
    const syncHashTab = () => {
      if (window.location.hash === '#nfts') {
        setPortfolioTab('nfts');
      }
    };
    syncHashTab();
    window.addEventListener('hashchange', syncHashTab);
    return () => window.removeEventListener('hashchange', syncHashTab);
  }, []);

  const displayMessage = (text, color, bgColor) => {
    setStatus({ text, color, bgColor });
  };

  const fetchBalances = async () => {
    if (!activeWallet) return;
    setIsFetchingBalances(true);
    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(activeWallet);
      
      let newXlm = '0.00';
      let newUsdc = '0.00';
      let usdcActive = false;
      const others: Array<{ symbol: string; amount: string }> = [];

      account.balances.forEach((balance) => {
        if (balance.asset_type === 'native') {
          newXlm = parseFloat(balance.balance).toFixed(2);
        } else if ('asset_code' in balance && balance.asset_code === 'USDC') {
          newUsdc = parseFloat(balance.balance).toFixed(2);
          usdcActive = true;
        } else if ('asset_code' in balance && balance.asset_code) {
          others.push({
            symbol: balance.asset_code,
            amount: parseFloat(balance.balance).toFixed(2),
          });
        }
      });

      const decodedData: Record<string, string> = {};
      if (account.data_attr) {
        for (const [k, v] of Object.entries(account.data_attr)) {
          try {
            decodedData[k] = atob(v);
          } catch {
            decodedData[k] = v;
          }
        }
      }

      setXlmBalance(newXlm);
      setUsdcBalance(newUsdc);
      setHasUSDC(usdcActive);
      setExtraTokens(others);
      setOnChainData(decodedData);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setIsFetchingBalances(false);
    }
  };

  const activateUSDC = async () => {
    setIsActivatingUSDC(true);
    try {
      const sourceKeypair = await ensureUnlocked();
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(sourceKeypair.publicKey());
      
      // Generate a valid mock issuer for the testnet prototype
      const mockIssuer = StellarSdk.Keypair.random().publicKey();
      const usdcAsset = new StellarSdk.Asset('USDC', mockIssuer);
      
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
      })
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: usdcAsset,
        limit: "1000000"
      }))
      .setTimeout(30)
      .build();
      
      transaction.sign(sourceKeypair);
      await server.submitTransaction(transaction);
      
      toast.success("USDC activated successfully!");
      await fetchBalances();
    } catch (error) {
      if (error.message !== CANCELLED) {
        console.error("Failed to activate USDC:", error);
        toast.error("Network error while activating USDC.");
      }
    } finally {
      setIsActivatingUSDC(false);
    }
  };

  const fundWallet = async () => {
    if (!activeWallet) return;
    setIsFunding(true);
    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${activeWallet}`);
      if (response.ok) {
        toast.success("Wallet funded successfully!");
        await fetchBalances();
      } else {
        toast.error("Failed to fund wallet with Friendbot.");
      }
    } catch (error) {
      console.error("Funding error:", error);
      toast.error("Network error while funding.");
    } finally {
      setIsFunding(false);
    }
  };

  const mintTagBadgeOnChain = async () => {
    if (!userTag) {
      setActiveModal('claim-tag');
      return;
    }
    setIsMintingBadge(true);
    try {
      const kp = await ensureUnlocked();
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(kp.publicKey());
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.manageData({
            name: 'tush.identity.tag',
            value: userTag,
          }),
        )
        .setTimeout(30)
        .build();
      tx.sign(kp);
      await server.submitTransaction(tx);
      toast.success(`Minted ${userTag} Identity Badge on Stellar!`);
      await fetchBalances();
    } catch (err: any) {
      if (err?.message !== CANCELLED) {
        toast.error(err?.message || 'Failed to mint identity badge.');
      }
    } finally {
      setIsMintingBadge(false);
    }
  };

  const handleStakeXlm = async () => {
    const amt = parseFloat(stakeAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter an XLM amount to stake.');
      return;
    }
    setIsStaking(true);
    try {
      const kp = await ensureUnlocked();
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(kp.publicKey());
      const prevStaked = parseFloat(onChainData['tush.stake.xlm'] || '0') || 0;
      const nextStaked = (prevStaked + amt).toFixed(2);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.manageData({
            name: 'tush.stake.xlm',
            value: nextStaked,
          }),
        )
        .setTimeout(30)
        .build();
      tx.sign(kp);
      await server.submitTransaction(tx);
      toast.success(`Staked ${amt} XLM into Stellar Yield Vault (4.8% APY)!`);
      setStakeAmount('');
      await fetchBalances();
    } catch (err: any) {
      if (err?.message !== CANCELLED) {
        toast.error(err?.message || 'Failed to stake XLM.');
      }
    } finally {
      setIsStaking(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [activeWallet]);

  const handleBalanceAction = (action) => {
    console.log(`Action triggered: ${action}`);
    setActiveModal(action);
  };

  const displayReceiveMessage = (text, color, bgColor) => {
    setReceiveStatus({ text, color, bgColor });
  };

  const handleCreateWallet = () => {
    setActiveModal('create-wallet');
  };

  const onWalletCreated = (address) => {
    // Drop the previous wallet's tag; the sync effect fetches this wallet's (imported
    // wallets may already own one). New wallets go straight to choosing a tag.
    setUserTag('');
    setCachedTag('');
    setActiveWallet(address);
    setActiveModal('claim-tag');
  };

  useEffect(() => {
    if (!userPublicKey) {
      Promise.resolve().then(() => onRegistrationStateChange("unknown"));
      return;
    }

    const loadReceiveDetails = async () => {
      setIsReceiving(true);
      displayReceiveMessage(
        "Loading your receive details...",
        "#1F2937",
        "#F3F4F6",
      );

      try {
        const response = await fetch(
          `${API_BASE}/lookup?address=${encodeURIComponent(userPublicKey)}`,
        );
        const rawBody = await response.text();
        const data = rawBody ? JSON.parse(rawBody) : null;

        if (response.ok && data) {
          setReceiveAddress(data.address);
          setReceiveTag(data.username);
          displayReceiveMessage(
            "Share your username or wallet address.",
            "#059669",
            "#D1FAE5",
          );
          onRegistrationStateChange("existing");
          return;
        }

        if (response.status === 404) {
          setReceiveAddress(userPublicKey);
          setReceiveTag("");
          displayReceiveMessage(
            "No username found. Register to claim one.",
            "#D97706",
            "#FEF3C7",
          );
          // Change "new" to "skipped" to break the infinite redirect loop
          onRegistrationStateChange("skipped"); 
          return;
        }

        throw new Error(apiErrorMessage(data, `Backend error (${response.status}).`))
      } catch (error){
        setReceiveAddress(userPublicKey)
        setReceiveTag('')
        displayReceiveMessage(error.message || 'Unable to load receive details.', '#DC2626', '#FEE2E2')
        onRegistrationStateChange('unknown')
      } finally {
        setIsReceiving(false);
      }
    };

    loadReceiveDetails();
  }, [userPublicKey, onRegistrationStateChange]);

  useEffect(() => {
    recipientRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!debouncedNameTag || !userPublicKey) {
      return;
    }

    const searchRecipient = async () => {
      try {
        const resolved = await resolveRecipient(debouncedNameTag);
        if (resolved.error) {
          return;
        }

        if (resolved.address) {
          return;
        }

        if (resolved.tag) {
          const response = await fetch(
            `${API_BASE}/federation?q=${encodeURIComponent(resolved.tag)}&type=name`,
          );
          const data = response.ok ? await response.json() : null;
          if (!data?.account_id) {
            return;
          }
        }
      } catch  {
        // Silently fail on search errors during typing
      }
    };

    searchRecipient();
  }, [debouncedNameTag, userPublicKey]);

  const handleConnect = async () => {
    const result = await onConnectWallet();
    if (!result.ok) {
      displayMessage(
        result.error || "Wallet connection failed.",
        "#DC2626",
        "#FEE2E2",
      );
      return;
    }

    displayMessage("Wallet connected.", "#059669", "#D1FAE5");
  };

  const handleLookup = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const recipientInput = nameTag.trim();
    const amountValue = parseFloat(amount);

    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      toast.error("Please enter a valid amount greater than zero.");
      setIsSubmitting(false);
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Verifying recipient...");

    try {
      const resolved = await resolveRecipient(recipientInput);
      if (resolved.error)
        throw new Error(`Resolution error: ${resolved.error}`);

      let recipientAddress = resolved.address;
      if (!recipientAddress && resolved.tag) {
        const response = await fetch(
          `${API_BASE}/federation?q=${encodeURIComponent(resolved.tag)}&type=name`,
        );
        const data = response.ok ? await response.json() : null;
        if (!data?.account_id)
          throw new Error(
            "Recipient address could not be resolved from backend.",
          );
        recipientAddress = data.account_id;
      }

      toast.loading("Simulating smart contract execution...", { id: toastId });
      const StellarSdk = await loadStellarSdk();
      const amountStroops = BigInt(Math.floor(amountValue * 10000000));

      const contractArgs = [
        new StellarSdk.Address(userPublicKey).toScVal(),
        new StellarSdk.Address(recipientAddress).toScVal(),
        new StellarSdk.Address(TREASURY_ADDRESS).toScVal(),
        new StellarSdk.Address(TOKEN_ADDRESS).toScVal(),
        StellarSdk.nativeToScVal(amountStroops, { type: "i128" }),
      ];

      const server = new StellarSdk.rpc.Server(
        "https://soroban-testnet.stellar.org",
      );
      const account = await server.getAccount(userPublicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: "100000",
        networkPassphrase: "Test SDF Network ; September 2015",
      })
        .addOperation(contract.call("route_payment", ...contractArgs))
        .setTimeout(300)
        .build();

      let preparedTransaction;
      try {
        preparedTransaction = await server.prepareTransaction(transaction);
        if (preparedTransaction.error) {
          throw new Error(
            preparedTransaction.error.message ||
              "Simulation rejected by network.",
          );
        }
      } catch (err) {
        throw new Error(`Simulation failed: ${err.message}`, { cause: err });
      }

      toast.loading("Approve the transaction in your wallet...", { id: toastId });
      let signedXdrResponse;
      try {
        signedXdrResponse = await freighterApi.signTransaction(
          preparedTransaction.toXDR(),
          {
            networkPassphrase: "Test SDF Network ; September 2015",
          },
        );
        if (signedXdrResponse.error) throw new Error(signedXdrResponse.error);
      } catch (err) {
        throw new Error(`Wallet signature failed: ${err.message}`, {
          cause: err,
        });
      }

      toast.loading("Submitting to Stellar Testnet...", { id: toastId });
      const finalXdr =
        typeof signedXdrResponse === "string"
          ? signedXdrResponse
          : signedXdrResponse.signedTxXdr || signedXdrResponse;

      const rpcResponse = await fetch("https://soroban-testnet.stellar.org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: { transaction: finalXdr },
        }),
      });

      const rpcData = await rpcResponse.json();
      if (rpcData.error)
        throw new Error(`RPC Error: ${rpcData.error.message}`);

      const txStatus = rpcData.result?.status;
      if (txStatus === "PENDING" || txStatus === "SUCCESS") {
        const txHash = rpcData.result?.hash;
        const explorerUrl = txHash
          ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
          : null;

        toast.success(
          (t) => (
            <span>
              Payment successful!
              {explorerUrl && (
                <>
                  {' '}
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0052FF', fontWeight: 600 }}
                    onClick={() => toast.dismiss(t.id)}
                  >
                    View on Stellar Expert
                  </a>
                </>
              )}
            </span>
          ),
          { id: toastId, duration: 8000 },
        );

        displayMessage("Payment successful!", "#059669", "#D1FAE5");
        saveAddress(recipientInput);
        setAmount("");
        onRefreshBalance();
        window.dispatchEvent(new Event("stellar:tx-update"));
      } else {
        throw new Error(
          `Blockchain rejected transaction: ${txStatus || "Unknown"}`,
        );
      }
    } catch (error) {
      toast.error(error.message || "Transaction failed.", { id: toastId });
      displayMessage(
        error.message || "A critical error occurred.",
        "#DC2626",
        "#FEE2E2",
      );
    } finally {
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };

  const handleCopy = async (value, label) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      displayReceiveMessage(
        `${label} copied to clipboard.`,
        "#059669",
        "#D1FAE5",
      );
    } catch {
      displayReceiveMessage(
        "Copy failed. Please copy manually.",
        "#DC2626",
        "#FEE2E2",
      );
    }
  };

  const handleDisconnect = () => {
    setIsWalletMenuOpen(false);
    onDisconnectWallet();
    displayMessage("Wallet disconnected.", "#1F2937", "#F3F4F6");
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
          <TushLogo size="md" subtitle="Stellar Wallet" onClick={onLandingClick} />
        </div>
        <div className="nav">
          <button
            type="button"
            aria-current={portfolioTab !== 'nfts' ? 'page' : undefined}
            onClick={() => {
              setPortfolioTab('tokens');
              window.location.hash = 'dashboard';
              closeNav();
            }}
          >
            Home
          </button>
          <button
            type="button"
            aria-current={portfolioTab === 'nfts' ? 'page' : undefined}
            onClick={() => {
              setPortfolioTab('nfts');
              window.location.hash = 'nfts';
              closeNav();
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
          <button type="button" onClick={() => handleNav(onHelpClick)}>
            Support
          </button>
          {onLandingClick && (
            <button type="button" onClick={() => handleNav(onLandingClick)}>
              Landing Page
            </button>
          )}
          {canRegister && (
            <button type="button" onClick={() => handleNav(onRegisterClick)}>
              Registration
            </button>
          )}
        </div>
        <div className="sidebar-card">
          <h3>Network pulse</h3>
          <p>Testnet status is healthy. Avg confirmation 3.9s.</p>
        </div>
        <div className="sidebar-card">
          <h3>Support</h3>
          <p>Need a hand? Open the help panel for quick answers.</p>
        </div>
        {userPublicKey && (
          <button
            type="button"
            className="disconnect-button"
            onClick={handleDisconnect}
          >
            Disconnect wallet
          </button>
        )}
      </aside>

      <main className="main">
        <section className="topbar reveal wallet-app-bar">
          <div className="topbar-brand-group">
            <TushLogo size="sm" subtitle="Smart Wallet" onClick={onLandingClick} />
          </div>
          <div className="topbar-actions">
            <div className="header-actions-row">
              <NetworkBadge />
              <div className="wallet-menu" ref={menuRef}>
                {!activeWallet ? (
                  <button
                    type="button"
                    className="connect-pill"
                    onClick={handleCreateWallet}
                    aria-expanded={isWalletMenuOpen}
                  >
                    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                        <path d="M12 17a2 2 0 0 0 2-2v-2a2 2 0 1 0-4 0v2a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.5 11h11A1.5 1.5 0 0 1 19 12.5v5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-5A1.5 1.5 0 0 1 6.5 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>Create Wallet</span>
                  </button>
                ) : (
                  <div className="wallet-chip-group">
                    {userTag ? (
                      <button
                        type="button"
                        className="chip chip--tag"
                        onClick={() => setActiveModal('settings')}
                        title="Account & Security Settings"
                      >
                        <span>{userTag}</span>
                        <span aria-hidden="true">⚙</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="chip chip--claim"
                          onClick={() => setActiveModal('claim-tag')}
                          title="Claim your @tag"
                        >
                          {formatShortAddress(activeWallet)} · Claim @tag
                        </button>
                        <button
                          type="button"
                          className="chip chip--icon"
                          onClick={() => setActiveModal('settings')}
                          title="Account & Security Settings"
                          aria-label="Account Settings"
                        >
                          ⚙
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid columns-1 balance-grid">
          <div className="reveal balance-hero">
            <div className="balance-card balance-card--hero">
              <div className="balance-card__header">
                <span className="balance-eyebrow">TOTAL BALANCE</span>
                <button
                  type="button"
                  className={`refresh-button ${isFetchingBalances ? "is-loading" : ""}`}
                  onClick={fetchBalances}
                  disabled={isFetchingBalances}
                  aria-label="Refresh balance"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                    <path d="M20 4v6h-6" />
                  </svg>
                </button>
              </div>
              {balanceError && (
                <div className="balance-error">{balanceError}</div>
              )}
              <div className="balance-hero-value">
                <span className="balance-hero-amount">
                  {showBalance ? `$${xlmBalance}` : '$***'}
                </span>
                <span className="balance-hero-subvalue">≈ {xlmBalance} XLM</span>
                <button
                  type="button"
                  className="privacy-toggle"
                  onClick={() => setShowBalance(!showBalance)}
                  aria-label={showBalance ? "Hide balance" : "Show balance"}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {showBalance ? (
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-7-11-9 0-2.3 1.52-4.58 3.88-6.35M21 9c0 2 0 7-9 7-.71 0-1.4-.07-2.07-.2M21 3l-6 6m6 6l6 6" />
                    ) : (
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 0 0 3-3 3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3z" />
                    )}
                  </svg>
                </button>
              </div>
              <div className="balance-actions-row">
                <button
                  type="button"
                  className="wallet-action-btn wallet-action-btn--primary"
                  onClick={() => handleBalanceAction('send')}
                >
                  <span className="wallet-action-btn__icon" aria-hidden="true">↗</span>
                  <span>Send</span>
                </button>
                <button
                  type="button"
                  className="wallet-action-btn"
                  onClick={() => handleBalanceAction('receive')}
                >
                  <span className="wallet-action-btn__icon" aria-hidden="true">↙</span>
                  <span>Receive</span>
                </button>
                <button
                  type="button"
                  className="wallet-action-btn"
                  onClick={() => handleBalanceAction('swap')}
                >
                  <span className="wallet-action-btn__icon" aria-hidden="true">⇄</span>
                  <span>Swap</span>
                </button>
              </div>
              <div className="balance-secondary-actions">
                {activeWallet ? (
                  <button
                    type="button"
                    className="fund-wallet-btn"
                    onClick={fundWallet}
                    disabled={isFunding}
                  >
                    <span>💧 {isFunding ? 'Funding Testnet Account...' : 'Fund Wallet (10,000 XLM Testnet)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="fund-wallet-btn fund-wallet-btn--cta"
                    onClick={handleCreateWallet}
                  >
                    <span>✨ Create or Import Your Stellar Smart Wallet</span>
                  </button>
                )}
              </div>
            </div>

            <div className="assets-section">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div className="assets-section__title" style={{ marginBottom: 0 }}>
                  Portfolio
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '4px',
                    borderRadius: '100px',
                  }}
                >
                  {(
                    [
                      ['tokens', 'Tokens'],
                      ['nfts', 'Collectibles'],
                      ['earn', 'Earn (4.8% APY)'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPortfolioTab(id)}
                      style={{
                        background: portfolioTab === id ? 'var(--accent-neon, #00f0ff)' : 'transparent',
                        color: portfolioTab === id ? '#000' : '#9ca3af',
                        border: 'none',
                        borderRadius: '100px',
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {portfolioTab === 'tokens' && (
                <div className="assets-list">
                  {assetRows.map((asset) => (
                    <div key={asset.symbol} className="asset-row">
                      <div className="asset-row__left">
                        <div className={`asset-token-icon asset-token-icon--${asset.accent}`}>
                          {asset.symbol === 'XLM' ? '✦' : '◉'}
                        </div>
                        <div>
                          <div className="asset-row__name">{asset.name}</div>
                          <div className="asset-row__symbol">{asset.symbol}</div>
                        </div>
                      </div>
                      <div className="asset-row__right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                          <div className="asset-row__amount">{asset.amount}</div>
                          <div className="asset-row__value">{asset.value}</div>
                        </div>
                        {asset.symbol === 'USDC' && !hasUSDC && activeWallet && (
                          <button
                            onClick={activateUSDC}
                            disabled={isActivatingUSDC}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--accent-neon, #00f0ff)',
                              color: 'var(--accent-neon, #00f0ff)',
                              padding: '6px 12px',
                              borderRadius: '100px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: isActivatingUSDC ? 'not-allowed' : 'pointer',
                              opacity: isActivatingUSDC ? 0.6 : 1,
                            }}
                          >
                            {isActivatingUSDC ? 'Activating...' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {portfolioTab === 'nfts' && (
                <div className="assets-list">
                  <div className="asset-row">
                    <div className="asset-row__left">
                      <div className="asset-token-icon asset-token-icon--stellar">🏷</div>
                      <div>
                        <div className="asset-row__name">
                          {onChainData['tush.identity.tag']
                            ? `Tush On-Chain Identity: ${onChainData['tush.identity.tag']}`
                            : 'Tush @tag On-Chain Soulbound Badge'}
                        </div>
                        <div className="asset-row__symbol">
                          {onChainData['tush.identity.tag']
                            ? 'Verified on Stellar Ledger (manage_data)'
                            : 'Anchor your @tag permanently onto your Stellar account'}
                        </div>
                      </div>
                    </div>
                    <div className="asset-row__right">
                      {onChainData['tush.identity.tag'] ? (
                        <span style={{ color: 'var(--accent-neon, #00f0ff)', fontWeight: 700, fontSize: '0.85rem' }}>
                          ✓ Minted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={mintTagBadgeOnChain}
                          disabled={isMintingBadge || !activeWallet}
                          style={{
                            background: 'var(--accent-neon, #00f0ff)',
                            color: '#000',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '100px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isMintingBadge ? 'Minting…' : 'Mint Badge'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {portfolioTab === 'earn' && (
                <div className="assets-list">
                  <div className="asset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="asset-row__name">Stellar Native Yield Pool (XLM / yXLM)</div>
                        <div className="asset-row__symbol">
                          Staked: {onChainData['tush.stake.xlm'] || '0.00'} XLM · 4.8% APY
                        </div>
                      </div>
                      <span style={{ color: '#34a853', fontWeight: 700, fontSize: '0.9rem' }}>4.8% APY</span>
                    </div>
                    {activeWallet && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="Amount in XLM"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '100px',
                            padding: '8px 14px',
                            color: '#fff',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleStakeXlm}
                          disabled={isStaking || !stakeAmount}
                          style={{
                            background: 'var(--accent-neon, #00f0ff)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '100px',
                            padding: '8px 18px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isStaking ? 'Staking…' : 'Stake XLM'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


          </div>

        </section>
      </main>
      <MobileNav
        active={portfolioTab === 'nfts' ? 'nfts' : 'dashboard'}
        onDashboardClick={() => {
          setPortfolioTab('tokens');
          window.location.hash = '';
          closeNav();
        }}
        onNftsClick={() => {
          setPortfolioTab('nfts');
          window.location.hash = 'nfts';
          closeNav();
        }}
        onHistoryClick={() => handleNav(onHistoryClick)}
        onAnalyticsClick={() => handleNav(onAnalyticsClick)}
        onHelpClick={() => handleNav(onHelpClick)}
        onRegisterClick={() => handleNav(onRegisterClick)}
        canRegister={canRegister}
      />
      <ScrollToTop />
      <BottomSheet isOpen={!!activeModal} onClose={() => setActiveModal(null)}>
        {activeModal === 'send' && (
          <SendModal
            initialRequest={sep7PayReq}
            onSuccess={() => {
              setSep7PayReq(null);
              fetchBalances();
              setActiveModal(null);
            }}
          />
        )}
        {activeModal === 'receive' && <ReceiveModal />}
        {activeModal === 'swap' && (
          <SwapModal
            onSuccess={() => {
              fetchBalances();
              setActiveModal(null);
            }}
          />
        )}
        {activeModal === 'create-wallet' && <CreateWalletModal onWalletCreated={onWalletCreated} />}
        {activeModal === 'claim-tag' && (
          <ClaimTagModal
            activeAddress={activeWallet}
            suggestion={legacyTag}
            onClaim={(tag) => { setUserTag(tag); setActiveModal(null); toast.success(`You are now ${tag}`); }}
            onSkip={() => setActiveModal(null)}
          />
        )}
        {activeModal === 'settings' && activeWallet && (
          <WalletSettingsModal
            activeAddress={activeWallet}
            userTag={userTag}
            onChangeTag={() => setActiveModal('claim-tag')}
            onWalletRemoved={() => {
              setActiveWallet(null);
              setUserTag('');
              setXlmBalance('0.00');
              setUsdcBalance('0.00');
            }}
            onClose={() => setActiveModal(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}

export default Dashboard;
