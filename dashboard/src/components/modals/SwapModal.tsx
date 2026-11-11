import React from 'react';
import './SwapModal.css';

export default function SwapModal() {
  return (
    <div className="swap-modal">
      <div className="swap-cards-container">
        <div className="swap-card">
          <div className="swap-card-header">Pay with</div>
          <div className="swap-card-body">
            <div className="swap-asset-selector">XLM</div>
            <input 
              type="number" 
              className="swap-input" 
              placeholder="0" 
              dir="rtl"
            />
          </div>
        </div>
        
        <button className="swap-switch-btn">⇅</button>
        
        <div className="swap-card">
          <div className="swap-card-header">Receive</div>
          <div className="swap-card-body">
            <div className="swap-asset-selector">USDC</div>
            <input 
              type="number" 
              className="swap-input" 
              placeholder="0" 
              dir="rtl"
              readOnly 
            />
          </div>
        </div>
      </div>
      
      <div className="swap-rate">1 XLM ≈ 0.12 USDC</div>
      <button className="modal-btn-primary">Review Swap</button>
    </div>
  );
}
