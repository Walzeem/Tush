import React from 'react';
import './TushLogo.css';

export interface TushLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * The Tush hang-tag mark: a luggage tag with the "T" punched clean through it,
 * hanging from a pink string. "Your name. Your tag." — literally.
 * Geometry lives on a 64×64 grid; keep it in sync with public/favicon.svg,
 * extension/build-extension.mjs and the 3D coin emblem in three/TushCoin3D.tsx.
 */
export function TushMark({ className = '' }: { className?: string }) {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <mask id={`tush-punch-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <rect x="23" y="19" width="18" height="7" rx="3.5" fill="#000" />
          <rect x="28.5" y="19" width="7" height="25" rx="3.5" fill="#000" />
        </mask>
      </defs>
      <path
        className="tush-mark__string"
        d="M29 20.5 C 27.5 8, 15 2.5, 6 9"
        stroke="#ff5cdb"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <g className="tush-mark__tag">
        <g transform="rotate(-12 32 34)">
          <path
            d="M18 22 L27 11 H37 L46 22 V54 Q46 58 42 58 H22 Q18 58 18 54 Z"
            fill="#c8ff4d"
            stroke="#c8ff4d"
            strokeWidth="3"
            strokeLinejoin="round"
            mask={`url(#tush-punch-${uid})`}
          />
        </g>
      </g>
    </svg>
  );
}

export default function TushLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  onClick,
  className = '',
}: TushLogoProps) {
  const content = (
    <>
      <span className={`tush-logo__mark tush-logo__mark--${size}`} aria-hidden="true">
        <TushMark className="tush-logo__svg" />
      </span>

      {showWordmark && (
        <span className="tush-logo__text">
          <span className="tush-logo__title">tush</span>
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

  return (
    <div className={`tush-logo ${className}`.trim()} role="img" aria-label="Tush">
      {content}
    </div>
  );
}
