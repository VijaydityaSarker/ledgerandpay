import React, { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Sun, Moon } from 'lucide-react';

export function TopNav() {
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.classList.contains('dark')
    );

    const toggleDark = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    };

    return (
        <header className="glass-card flex items-center justify-between px-6 py-4">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Ledger & Pay
            </h1>
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleDark}
                    className="p-2 rounded-full hover:bg-white hover:bg-opacity-30 dark:hover:bg-gray-800 dark:hover:bg-opacity-30 transition"
                    aria-label="Toggle dark mode"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {/* this button shows “Connect Wallet” / wallet address once connected */}
                <WalletMultiButton className="btn-primary !px-4 !py-2" />
            </div>
        </header>
    );
}