import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initTheme } from './styles/theme';

// Initialize theme immediately to prevent white flash
initTheme();

function mount() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element "#root" not found in DOM.');
    return;
  }
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// Ensure DOM is ready even if script executes early in <head> or on file:// protocol
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

// Register Service Worker for offline PWA support (when supported and not on file:// protocol)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
    }).catch((err) => {
      console.warn('[PWA] ServiceWorker registration failed:', err);
    });
  });
}
