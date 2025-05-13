// src/App.tsx
import React from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletConnectionProvider } from "./contexts/WalletConnectionProvider";
import CreateGroup from "./components/CreateGroup";

function App() {
    return (
        <WalletConnectionProvider>
            <div style={{ padding: "2rem" }}>
                <h1 className="text-2xl font-bold mb-4">Ledger&Pay</h1>
                {/* Wallet connect button */}
                <WalletMultiButton />

                {/* Create Group Component */}
                <div style={{ marginTop: "2rem" }}>
                    <CreateGroup />
                </div>
            </div>
        </WalletConnectionProvider>
    );
}

export default App;
