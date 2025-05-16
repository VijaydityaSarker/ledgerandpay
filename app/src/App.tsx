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
import SettleExpense from "./components/SettleExpense";

// Import any UI components you need
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./components/ui/Tabs";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/Card";
import { Button } from "./components/ui/Button";

export default function App() {
  const [lastCreateTx, setLastCreateTx] = useState<string | null>(null);
  const [groupPdaInput, setGroupPdaInput] = useState<string>("");
  const [groupPda, setGroupPda] = useState<PublicKey | null>(null);
  const [activeTab, setActiveTab] = useState("groups");

  const handleGroupCreated = (tx: string, pda: string) => {
    setLastCreateTx(tx);
    setGroupPdaInput(pda);
    setGroupPda(new PublicKey(pda));
    setActiveTab("expenses");
    toast.success("Group created successfully!");
  };

  const handleGroupSelect = (pubkey: PublicKey) => {
    setGroupPda(pubkey);
    setGroupPdaInput(pubkey.toString());
    setActiveTab("expenses");
    toast.success(`Selected group ${pubkey.toString().slice(0, 6)}...`);
  };

  const handleUseGroup = () => {
    try {
      const pk = new PublicKey(groupPdaInput.trim());
      setGroupPda(pk);
      toast.success(`Using group ${pk.toString().slice(0, 6)}...`);
    } catch {
      toast.error("Invalid group address");
      setGroupPda(null);
    }
  };

  return (
    <WalletConnectionProvider>
      <div className="min-h-screen" style={{ backgroundColor: "#b4a9f4" }}>
        {/* Header */}
        <header className="header-blur bg-white/80 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-extrabold text-indigo-700">
              Ledger &amp; Pay
            </h1>
            <WalletMultiButton className="!bg-red-600 hover:!bg-red-700 !text-white !font-medium !rounded-lg !px-4 !py-2 !shadow-md hover:!shadow-lg hover:scale-105 transition" />
          </div>
        </header>

        {/* Hero */}
        <section className="hero-gradient text-white py-20">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl font-extrabold">Split bills the easy way</h2>
            <p className="mt-4 text-xl text-white">
              Create a group. Log expenses. Settle in USDC.
            </p>
            <a
              href="#main-app"
              className="mt-8 inline-block bg-white text-indigo-700 px-8 py-4 rounded-lg shadow hover:bg-indigo-50 transition"
            >
              Get Started
            </a>
          </div>
        </section>

        {/* Main Content */}
        <main id="main-app" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            {/* Tabs */}
            <div className="flex justify-center">
              <TabsList>
                <TabsTrigger value="groups">My Groups</TabsTrigger>
                <TabsTrigger value="expenses" disabled={false}>
                  {groupPda ? "Log Expense" : "Log Expense"}
                </TabsTrigger>
                <TabsTrigger value="settle" disabled={false}>
                  {groupPda ? "Settle" : "Settle Up"}
                </TabsTrigger>

              </TabsList>
            </div>

            {/* Groups */}
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
                      ✅ Created!{" "}
                      <a
                        href={`https://explorer.solana.com/tx/${lastCreateTx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-indigo-600"
                      >
                        View on Explorer
                      </a>
                    </CardFooter>
                  )}
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Join Group</CardTitle>
                    <CardDescription>Join an existing group</CardDescription>
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

            {/* Log Expense */}
            <TabsContent value="expenses">
              <Card>
                <CardHeader>
                  <CardTitle>Log an Expense</CardTitle>
                  <CardDescription>Record a new expense</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium">Group PDA</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Paste group public key"
                        value={groupPdaInput}
                        onChange={(e) => setGroupPdaInput(e.target.value)}
                      />
                      <Button onClick={handleUseGroup}>Use</Button>
                    </div>

                    {groupPda && (
                      <div>
                        <LogExpense groupPda={groupPda} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settle Expenses */}
            <TabsContent value="settle">
              <Card>
                <CardHeader>
                  <CardTitle>Settle Expenses</CardTitle>
                  <CardDescription>Pay what you owe to other members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium">Group PDA</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border rounded px-3 py-2"
                        placeholder="Paste group public key"
                        value={groupPdaInput}
                        onChange={(e) => setGroupPdaInput(e.target.value)}
                      />
                      <Button onClick={handleUseGroup}>Use</Button>
                    </div>

                    {groupPda && (
                      <div>
                        <SettleExpense groupPda={groupPda} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manage Group */}
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
                    <CardDescription>Remove someone from your group</CardDescription>
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
              Built on Solana • © {new Date().getFullYear()} Ledger &amp; Pay
            </p>
          </div>
        </footer>

        {/* Toaster */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: { background: "#1F2937", color: "#fff" },
            classNames: {
              success: "!bg-green-800",
              error: "!bg-red-800",
            },
          }}
        />
      </div>
    </WalletConnectionProvider>
  );
}
