import React from 'react';
import './TushLogo.css';

export interface TushLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export default function TushLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  onClick,
  className = '',
}: TushLogoProps) {
  const uid = React.useId().replace(/:/g, '');

  const content = (
    <>
      <span className={`tush-logo__mark tush-logo__mark--${size}`} aria-hidden="true">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="tush-logo__svg"
        >
          <defs>
            <linearGradient id={`tush-bg-${uid}`} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0B1528" />
              <stop offset="50%" stopColor="#111C38" />
              <stop offset="100%" stopColor="#090D1A" />
            </linearGradient>
            <linearGradient id={`tush-stroke-${uid}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#6366F1" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id={`tush-t-main-${uid}`} x1="14" y1="14" x2="50" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="48%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id={`tush-t-stem-${uid}`} x1="32" y1="20" x2="32" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <radialGradient id={`tush-glow-${uid}`} cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Squircle Base */}
          <rect
            x="3"
            y="3"
            width="58"
            height="58"
            rx="17"
            fill={`url(#tush-bg-${uid})`}
            stroke={`url(#tush-stroke-${uid})`}
            strokeWidth="2"
          />

          {/* Ambient Inner Glow */}
          <circle cx="32" cy="24" r="22" fill={`url(#tush-glow-${uid})`} />

          {/* Stellar Orbital Ring */}
          <ellipse
            cx="32"
            cy="33"
            rx="21"
            ry="7.5"
            transform="rotate(-22 32 33)"
            stroke={`url(#tush-t-main-${uid})`}
            strokeWidth="1.6"
            strokeDasharray="4 3"
            opacity="0.65"
          />

          {/* Stylized Architectural "T" Crossbar (faceted wing) */}
          <path
            d="M15 17C15 15.3431 16.3431 14 18 14H46C47.6569 14 49 15.3431 49 17V19.5C49 21.7091 47.2091 23.5 45 23.5H19C16.7909 23.5 15 21.7091 15 19.5V17Z"
            fill={`url(#tush-t-main-${uid})`}
          />

          {/* Stylized "T" Vertical Pillar with Precision Cut */}
          <path
            d="M27.2 21.5H36.8V45.5C36.8 48.8137 34.1137 51.5 30.8 51.5H29.2C28.0954 51.5 27.2 50.6046 27.2 49.5V21.5Z"
            fill={`url(#tush-t-stem-${uid})`}
          />

          {/* Core Diamond Spark at the T Nexus */}
          <path
            d="M32 15.2L34.4 18.8L32 22.4L29.6 18.8L32 15.2Z"
            fill="#FFFFFF"
          />

          {/* Orbital Satellite Node */}
          <circle cx="49.5" cy="25.5" r="2.6" fill="#00F0FF" />
        </svg>
        <span className="tush-logo__halo" />
      </span>

      {showWordmark && (
        <span className="tush-logo__text">
          <span className="tush-logo__title">
            Tush<span className="tush-logo__dot">.</span>
          </span>
          {subtitle && <span className="tush-logo__subtitle">{subtitle}</span>}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`tush-logo tush-logo--interactive ${className}`.trim()}
        aria-label="Tush Wallet Home"
      >
        {content}
      </button>
    );
  }

  return <div className={`tush-logo ${className}`.trim()}>{content}</div>;
}

