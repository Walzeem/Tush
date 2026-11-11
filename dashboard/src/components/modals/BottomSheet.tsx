import React, { useEffect, useState } from 'react';
import './BottomSheet.css';

export default function BottomSheet({ isOpen, onClose, children }) {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <div 
      className={`bottom-sheet-overlay ${isOpen ? 'open' : ''}`} 
      onClick={onClose}
    >
      <div 
        className={`bottom-sheet-content ${isOpen ? 'open' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={handleAnimationEnd}
      >
        <div className="bottom-sheet-handle"></div>
        {children}
      </div>
    </div>
  );
}
