import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';

// ← import your context provider:
import { WalletConnectionProvider } from './contexts/WalletConnectionProvider';

// ← import the wallet UI styles ONCE at the root:
import '@solana/wallet-adapter-react-ui/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletConnectionProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletConnectionProvider>
  </React.StrictMode>
);
