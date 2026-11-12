const NETWORK = (import.meta.env.VITE_NETWORK || 'testnet').toLowerCase();
const isMainnet = NETWORK === 'mainnet' || NETWORK === 'public';

export default function NetworkBadge() {
  return (
    <span
      className="network-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        backgroundColor: isMainnet ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
        color: isMainnet ? '#34D399' : '#FBBF24',
        border: `1px solid ${isMainnet ? 'rgba(52, 211, 153, 0.35)' : 'rgba(251, 191, 36, 0.35)'}`,
        boxShadow: isMainnet
          ? '0 0 16px rgba(16, 185, 129, 0.15)'
          : '0 0 16px rgba(245, 158, 11, 0.12)',
      }}
      aria-label={`Network: ${isMainnet ? 'Mainnet' : 'Testnet'}`}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: isMainnet ? '#10B981' : '#F59E0B',
          boxShadow: isMainnet ? '0 0 8px #10B981' : '0 0 8px #F59E0B',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {isMainnet ? 'Mainnet' : 'Testnet'}
    </span>
  );
}
