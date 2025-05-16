// src/contexts/WalletConnectionProvider.tsx
import React, { FC, ReactNode, useMemo, useState, useEffect, createContext, useContext, useCallback } from "react";
import {
    ConnectionProvider,
    WalletProvider,
    useWallet,
    useConnection,
} from "@solana/wallet-adapter-react";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { TipLinkWalletAdapter } from "@tiplink/wallet-adapter";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

// Create a context for wallet status information
interface WalletStatusContextType {
    isConnecting: boolean;
    connectionError: string | null;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    solBalance: number | null;
    hasLowBalance: boolean;
    refreshBalance: () => Promise<void>;
}

const WalletStatusContext = createContext<WalletStatusContextType>({
    isConnecting: false,
    connectionError: null,
    connectionStatus: 'disconnected',
    solBalance: null,
    hasLowBalance: false,
    refreshBalance: async () => { },
});

export const useWalletStatus = () => useContext(WalletStatusContext);

// Wallet Status Provider component
const WalletStatusProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { connection } = useConnection();
    const { publicKey, connecting, connected } = useWallet();

    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

    // Function to refresh SOL balance - defined with useCallback before it's used
    const refreshBalance = useCallback(async () => {
        if (!publicKey || !connection) {
            setSolBalance(null);
            return;
        }

        try {
            const balance = await connection.getBalance(publicKey);
            // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
            const solBalanceValue = balance / 1_000_000_000;
            setSolBalance(solBalanceValue);
        } catch (error) {
            console.error('Error fetching balance:', error);
            setSolBalance(null);
        }
    }, [publicKey, connection]);

    // Update connection status based on wallet state
    useEffect(() => {
        if (connecting) {
            setIsConnecting(true);
            setConnectionStatus('connecting');
            setConnectionError(null);
        } else if (connected && publicKey) {
            setIsConnecting(false);
            setConnectionStatus('connected');
            refreshBalance();
        } else if (connectionError) {
            setIsConnecting(false);
            setConnectionStatus('error');
        } else {
            setIsConnecting(false);
            setConnectionStatus('disconnected');
        }
    }, [connecting, connected, publicKey, connectionError, refreshBalance]);

    // Check if balance is low (less than 0.1 SOL)
    const hasLowBalance = solBalance !== null && solBalance < 0.1;

    const value = {
        isConnecting,
        connectionError,
        connectionStatus,
        solBalance,
        hasLowBalance,
        refreshBalance,
    };

    return (
        <WalletStatusContext.Provider value={value}>
            {children}
        </WalletStatusContext.Provider>
    );
};

// Main Wallet Connection Provider
export const WalletConnectionProvider: FC<{ children: ReactNode }> = ({
    children,
}) => {
    // Use Devnet for development
    const network = WalletAdapterNetwork.Devnet;

    // Use a custom RPC endpoint for better reliability
    const endpoint = "https://api.devnet.solana.com";

    // Configure wallet adapters with more options
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TipLinkWalletAdapter({
                title: "Ledger & Pay",
                clientId: "ledger-and-pay-app",
                theme: "dark",
                walletAdapterNetwork: network,
            }),
        ],
        [network]
    );

    console.log('WalletConnectionProvider initialized with endpoint:', endpoint);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletStatusProvider>
                        {children}
                    </WalletStatusProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
