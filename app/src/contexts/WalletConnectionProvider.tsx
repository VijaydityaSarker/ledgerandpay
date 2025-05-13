// src/contexts/WalletConnectionProvider.tsx
import React, { FC, ReactNode, useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { TipLinkWalletAdapter } from "@tiplink/wallet-adapter";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

export const WalletConnectionProvider: FC<{ children: ReactNode }> = ({
    children,
}) => {
    // 1) Use Devnet
    const network = WalletAdapterNetwork.Devnet;
    // 2) Use a custom RPC endpoint for better reliability
    const endpoint = useMemo(() => 
        // You can replace this with your own RPC endpoint if needed
        'https://api.devnet.solana.com',
        [network]
    );

    // 3) Configure wallet adapters
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
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
