// src/App.tsx
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletConnectionProvider } from "./contexts/WalletConnectionProvider";
import { Toaster, toast } from "sonner";
import CreateGroup from "./components/CreateGroup";
import JoinGroup from "./components/JoinGroup";
import RenameGroup from "./components/RenameGroup";
import RemoveMember from "./components/RemoveMember";
import ViewMyGroups from "./components/ViewMyGroups";
import LogExpense from "./components/LogExpense";

// UI Components
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
// Import Tabs components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/Tabs";
import type { TabsProps } from "./components/ui/Tabs";

export default function App() {
    const [lastCreateTx, setLastCreateTx] = useState<string | null>(null);
    const [groupPdaInput, setGroupPdaInput] = useState<string>("");
    const [groupPda, setGroupPda] = useState<PublicKey | null>(null);
    const [activeTab, setActiveTab] = useState("groups");

    // Handle successful group creation
    const handleGroupCreated = (tx: string, groupPda: string) => {
        setLastCreateTx(tx);
        setGroupPdaInput(groupPda);
        setGroupPda(new PublicKey(groupPda));
        setActiveTab("expenses"); // Switch to expenses tab
        toast.success("Group created successfully!");
    };

    // Handle group selection
    const handleGroupSelect = (publicKey: PublicKey) => {
        setGroupPda(publicKey);
        setGroupPdaInput(publicKey.toString());
        setActiveTab("expenses"); // Switch to expenses tab
        toast.success(`Selected group: ${publicKey.toString().slice(0, 6)}...`);
    };

    // Handle using a group from input
    const handleUseGroup = () => {
        try {
            const pubkey = new PublicKey(groupPdaInput.trim());
            setGroupPda(pubkey);
            toast.success(`Using group: ${pubkey.toString().slice(0, 6)}...`);
        } catch (error) {
            toast.error("Invalid group address");
            setGroupPda(null);
        }
    };

    return (
        <WalletConnectionProvider>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="header-blur bg-white/80 shadow-sm sticky top-0 z-10 transition-base">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 tracking-tight drop-shadow-lg transition-base">Ledger & Pay</h1>
                        <div className="wallet-adapter-button-trigger">
                            <WalletMultiButton className="transition-base hover:scale-105 focus-visible:ring-2 focus-visible:ring-indigo-500" />
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="hero-gradient relative text-white py-20 sm:py-28 overflow-hidden">
                    {/* Animated background shapes */}
                    <div className="hero-animated-bg">
                        <span className="circle1"></span>
                        <span className="circle2"></span>
                        <span className="circle3"></span>
                    </div>
                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg">
                            Split bills the easy way
                        </h1>
                        <p className="mt-6 text-xl max-w-3xl mx-auto text-indigo-100">
                            Create a group. Log expenses. Settle in USDC.
                        </p>
                        <div className="mt-10 flex justify-center">
                            <a href="#main-app" className="btn-cta bg-white text-indigo-700 font-semibold px-8 py-4 rounded-lg shadow-lg text-lg hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-base">
                                Get Started
                            </a>
                        </div>
                    </div>
                </section>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Tabs 
                    value={activeTab} 
                    onValueChange={setActiveTab}
                    className="space-y-6"
                    defaultValue="groups"
                >
                    <div className="flex justify-center">
                        <TabsList>
                            <TabsTrigger value="groups">My Groups</TabsTrigger>
                            <TabsTrigger value="expenses" disabled={!groupPda}>
                                {groupPda ? 'Log Expense' : 'Select a Group'}
                            </TabsTrigger>
                            <TabsTrigger value="manage" disabled={!groupPda}>
                                {groupPda ? 'Manage Group' : 'Select a Group'}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                        {/* My Groups Tab */}
                        <TabsContent value="groups" className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Create Group</CardTitle>
                                        <CardDescription>Start a new expense sharing group</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <CreateGroup onSuccess={handleGroupCreated} />
                                    </CardContent>
                                    {lastCreateTx && (
                                        <CardFooter className="text-sm text-green-600">
                                            ✅ Created! View on{" "}
                                            <a
                                                href={`https://explorer.solana.com/tx/${lastCreateTx}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-1 text-indigo-600 hover:underline"
                                            >
                                                Solana Explorer
                                            </a>
                                        </CardFooter>
                                    )}
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Join Group</CardTitle>
                                        <CardDescription>Join an existing group with an invite</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <JoinGroup />
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mt-8">
                                <h2 className="text-2xl font-bold mb-4">My Groups</h2>
                                <ViewMyGroups 
                                    onGroupSelect={handleGroupSelect} 
                                    onNewGroupTx={lastCreateTx}
                                />
                            </div>
                        </TabsContent>

                        {/* Log Expense Tab */}
                        <TabsContent value="expenses">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Log an Expense</CardTitle>
                                    <CardDescription>Record a new expense for your group</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Group PDA
                                            </label>
                                            <div className="flex space-x-2">
                                                <Input
                                                    type="text"
                                                    placeholder="Paste group public key"
                                                    value={groupPdaInput}
                                                    onChange={(e) => setGroupPdaInput(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button onClick={handleUseGroup}>
                                                    Use
                                                </Button>
                                            </div>
                                        </div>

                                        {groupPda && (
                                            <div className="mt-4">
                                                <LogExpense groupPda={groupPda} />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Manage Group Tab */}
                        <TabsContent value="manage">
                            <div className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Rename Group</CardTitle>
                                        <CardDescription>Update your group's name</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <RenameGroup />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Remove Member</CardTitle>
                                        <CardDescription>Remove a member from your group</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <RemoveMember />
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 mt-12">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-sm text-gray-500">
                            Built on Solana • © {new Date().getFullYear()} Ledger & Pay
                        </p>
                    </div>
                </footer>

                {/* Toaster */}
                <Toaster 
                    position="top-center"
                    toastOptions={{
                        duration: 5000,
                        style: {
                            background: '#1F2937',
                            color: '#fff',
                            border: '1px solid #374151',
                        },
                        className: 'toast',
                        classNames: {
                            toast: '!bg-gray-800 !text-white !border !border-gray-700',
                            success: '!bg-green-800 !text-white !border !border-green-700',
                            error: '!bg-red-800 !text-white !border !border-red-700',
                            loading: '!bg-gray-800 !text-white !border !border-gray-700',
                        },
                    }}
                />
            </div>
        </WalletConnectionProvider>
    );
}
