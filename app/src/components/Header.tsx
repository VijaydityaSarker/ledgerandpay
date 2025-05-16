import { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import logo from '../logo.svg';

export default function Header() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'groups', label: 'My Groups' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'settle', label: 'Settle' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-indigo-900/90 border-b border-indigo-700/50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo and brand */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-indigo-800 p-2 rounded-lg shadow-lg">
              <img src={logo} alt="Ledger & Pay Logo" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg" />
            </div>
            <span className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-100 tracking-wide">
              Ledger & Pay
            </span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${activeTab === item.id 
                  ? 'bg-indigo-700/70 text-white' 
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          
          {/* Wallet button */}
          <div className="flex items-center">
            <WalletMultiButton className="!bg-gradient-to-r !from-green-500 !to-emerald-600 !text-white !font-bold !rounded-lg !px-4 !py-2 !text-sm !shadow-lg hover:!shadow-emerald-700/20 hover:!scale-105 !transition-all !duration-200 !border !border-emerald-500/20" />
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === item.id 
                ? 'bg-indigo-700/70 text-white' 
                : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
