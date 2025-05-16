import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStatus } from '../contexts/WalletConnectionProvider';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { toast } from 'sonner';
import programService from '../services/programService';

// Types for our expense tracking system
interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  payer: string;
  payerPublicKey: PublicKey;
  date: string;
  group: string;
  groupPublicKey: PublicKey;
  participants: string[];
  participantPublicKeys: PublicKey[];
  settled: boolean;
  split: 'equal' | 'custom';
  shares?: Record<string, number>;
}

interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  expenseId: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  txId?: string;
}

// We'll use real data from the blockchain instead of mock data

const mockSettlements: Settlement[] = [
  {
    id: 'set-001',
    from: 'You',
    to: 'Alice',
    amount: 16.00,
    currency: 'USDC',
    expenseId: 'exp-002',
    date: '2025-05-13',
    status: 'completed',
    txId: '4zw7ckb72xpsf9qnuv8qs8qn3z7xjk9m5v7z'
  },
  {
    id: 'set-002',
    from: 'Bob',
    to: 'You',
    amount: 30.12,
    currency: 'USDC',
    expenseId: 'exp-001',
    date: '2025-05-15',
    status: 'pending'
  }
];

interface ExpenseTrackerProps {
  selectedGroup: PublicKey | null;
  onTransactionSuccess: (txSignature: string) => void;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ selectedGroup, onTransactionSuccess }) => {
  const { publicKey, connected } = useWallet();
  const { connectionStatus, solBalance } = useWalletStatus();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>(mockSettlements);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements'>('expenses');
  const [showNewExpenseForm, setShowNewExpenseForm] = useState(false);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for new expense
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    description: '',
    amount: 0,
    currency: 'USDC',
    group: '',
    groupPublicKey: selectedGroup || undefined,
    split: 'equal',
    participants: [],
    participantPublicKeys: []
  });
  
  // Fetch expenses when selectedGroup changes
  useEffect(() => {
    const fetchExpenses = async () => {
      if (!selectedGroup || !connected || !publicKey) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const expenseAccounts = await programService.fetchExpenses(selectedGroup);
        
        // Map the blockchain expense accounts to our UI expense format
        const mappedExpenses: Expense[] = expenseAccounts.map((exp: any) => {
          const payerStr = exp.account.payer.toString();
          const isCurrentUserPayer = exp.account.payer.equals(publicKey);
          
          return {
            id: exp.pubkey.toString(),
            description: exp.account.description,
            amount: exp.account.amount.toNumber() / 1000000, // Convert from lamports to SOL
            currency: 'SOL',
            payer: isCurrentUserPayer ? 'You' : payerStr.slice(0, 4) + '...' + payerStr.slice(-4),
            payerPublicKey: exp.account.payer,
            date: new Date(exp.account.timestamp.toNumber() * 1000).toISOString().split('T')[0],
            group: selectedGroup.toString(),
            groupPublicKey: selectedGroup,
            participants: exp.account.participants.map((p: PublicKey) => {
              const pStr = p.toString();
              return p.equals(publicKey) ? 'You' : pStr.slice(0, 4) + '...' + pStr.slice(-4);
            }),
            participantPublicKeys: exp.account.participants,
            settled: exp.account.settled,
            split: 'equal' // Assuming equal split for now
          };
        });
        
        setExpenses(mappedExpenses);
      } catch (err) {
        console.error('Error fetching expenses:', err);
        setError('Failed to fetch expenses');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExpenses();
  }, [selectedGroup, connected, publicKey]);
  
  // Calculate balances
  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    
    expenses.forEach(expense => {
      if (expense.settled) return;
      
      const payer = expense.payer;
      const participants = expense.participants;
      
      if (expense.split === 'equal') {
        const shareAmount = expense.amount / participants.length;
        
        participants.forEach(participant => {
          if (participant === payer) {
            balances[participant] = (balances[participant] || 0) + expense.amount - shareAmount;
          } else {
            balances[participant] = (balances[participant] || 0) - shareAmount;
          }
        });
      } else if (expense.split === 'custom' && expense.shares) {
        participants.forEach(participant => {
          const share = expense.shares![participant] || 0;
          const shareAmount = expense.amount * share;
          
          if (participant === payer) {
            balances[participant] = (balances[participant] || 0) + expense.amount - shareAmount;
          } else {
            balances[participant] = (balances[participant] || 0) - shareAmount;
          }
        });
      }
    });
    
    return balances;
  };
  
  const balances = calculateBalances();
  
  // Handle adding a new expense
  const handleAddExpense = async () => {
    if (!connected || !publicKey || !selectedGroup) {
      toast.error('Please connect your wallet and select a group');
      return;
    }
    
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, we'll use the current user's wallet as the only participant
      // In a real app, you would have UI to select participants
      const participants = [publicKey];
      
      toast.loading('Logging expense...');
      
      // Convert amount to lamports (SOL's smallest unit)
      const amountInLamports = Math.floor(newExpense.amount * 1000000);
      
      // Call the program service to log the expense
      const txSignature = await programService.logExpense(
        publicKey,
        selectedGroup,
        amountInLamports, // This is now handled correctly in programService
        participants,
        newExpense.description || ''
      );
      
      toast.success('Expense logged successfully!');
      onTransactionSuccess(txSignature);
      
      // Reset form
      setShowNewExpenseForm(false);
      setNewExpense({
        description: '',
        amount: 0,
        currency: 'SOL',
        group: '',
        groupPublicKey: selectedGroup,
        split: 'equal',
        participants: [],
        participantPublicKeys: []
      });
    } catch (err) {
      console.error('Error logging expense:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to log expense';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      toast.dismiss();
    }
  };
  
  // Handle settling an expense
  const handleSettle = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowSettleForm(true);
  };
  
  // Process settlement
  const processSettlement = async () => {
    if (!selectedExpense) return;
    
    if (!connected || !publicKey || !selectedGroup) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!selectedExpense?.payerPublicKey) {
      toast.error('Invalid expense data');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      toast.loading('Settling expense...');
      
      // Call the program service to settle the expense
      const txSignature = await programService.settleExpense(
        publicKey,
        selectedGroup,
        new PublicKey(selectedExpense?.id || ''), // The expense pubkey
        selectedExpense?.payerPublicKey ? new PublicKey(selectedExpense.payerPublicKey) : undefined // The payee (original payer)
      );
      
      toast.success('Expense settled successfully!');
      onTransactionSuccess(txSignature);
      
      // Close the settle form
      setShowSettleForm(false);
      setSelectedExpense(null);
    } catch (err) {
      console.error('Error settling expense:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to settle expense';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      toast.dismiss();
    }
  };
  
  return (
    <div className="w-full">
      {/* Wallet Status Bar */}
      <div className="mb-6 glass-card p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' ? 'Wallet Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 
               connectionStatus === 'error' ? 'Connection Error' : 'Wallet Disconnected'}
            </span>
          </div>
          
          {connected && publicKey && (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-indigo-300">Balance:</span>{' '}
                <span className="font-medium">{solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'Loading...'}</span>
              </div>
              <div className="text-sm">
                <span className="text-indigo-300">Address:</span>{' '}
                <span className="font-medium">{`${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-indigo-800 mb-6">
        <button 
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'expenses' ? 'border-b-2 border-indigo-500 text-white' : 'text-indigo-300 hover:text-white'}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'settlements' ? 'border-b-2 border-indigo-500 text-white' : 'text-indigo-300 hover:text-white'}`}
          onClick={() => setActiveTab('settlements')}
        >
          Settlements
        </button>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">{activeTab === 'expenses' ? 'Your Expenses' : 'Your Settlements'}</h2>
        
        {activeTab === 'expenses' && (
          <button 
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            onClick={() => setShowNewExpenseForm(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Expense
          </button>
        )}
      </div>
      
      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-indigo-300 mb-4">You haven't logged any expenses yet.</p>
              <button 
                className="bg-indigo-700/50 hover:bg-indigo-700/70 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={() => setShowNewExpenseForm(true)}
              >
                Add Your First Expense
              </button>
            </div>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="glass-card p-4 hover:translate-y-[-2px] transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{expense.description}</h3>
                    <p className="text-sm text-indigo-300">{expense.group} • {expense.date}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-indigo-700/50 px-2 py-0.5 rounded-full">
                        {expense.participants.length} participants
                      </span>
                      <span className={`text-xs ${expense.settled ? 'bg-green-700/50 text-green-300' : 'bg-yellow-700/50 text-yellow-300'} px-2 py-0.5 rounded-full`}>
                        {expense.settled ? 'Settled' : 'Unsettled'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${expense.payer === 'You' ? 'text-green-400' : 'text-indigo-300'}`}>
                      {expense.amount} {expense.currency}
                    </p>
                    <p className="text-sm text-indigo-300">
                      Paid by {expense.payer}
                    </p>
                    
                    {!expense.settled && (
                      <button 
                        className="mt-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:from-green-600 hover:to-emerald-700 transition-all"
                        onClick={() => handleSettle(expense)}
                      >
                        Settle Up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {/* Balances Summary */}
          <div className="glass-card p-4 mb-6">
            <h3 className="font-medium mb-3">Your Balances</h3>
            <div className="space-y-2">
              {Object.entries(balances).map(([person, amount]) => (
                <div key={person} className="flex justify-between items-center">
                  <span className="text-sm">{person}</span>
                  <span className={`font-medium ${amount > 0 ? 'text-green-400' : amount < 0 ? 'text-red-400' : 'text-indigo-300'}`}>
                    {amount > 0 ? '+' : ''}{amount.toFixed(2)} USDC
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {settlements.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-indigo-300">No settlements yet.</p>
            </div>
          ) : (
            settlements.map(settlement => (
              <div key={settlement.id} className="glass-card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{settlement.from}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="font-medium">{settlement.to}</span>
                    </div>
                    <p className="text-sm text-indigo-300">{settlement.date}</p>
                    
                    {settlement.txId && (
                      <a 
                        href={`https://explorer.solana.com/tx/${settlement.txId}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
                      >
                        View Transaction
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {settlement.amount} {settlement.currency}
                    </p>
                    <span className={`text-xs ${
                      settlement.status === 'completed' ? 'bg-green-700/50 text-green-300' : 
                      settlement.status === 'pending' ? 'bg-yellow-700/50 text-yellow-300' : 
                      'bg-red-700/50 text-red-300'
                    } px-2 py-0.5 rounded-full`}>
                      {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* New Expense Form Modal */}
      {showNewExpenseForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add New Expense</h3>
              <button 
                className="text-indigo-300 hover:text-white"
                onClick={() => setShowNewExpenseForm(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">Description</label>
                <input 
                  type="text" 
                  className="w-full bg-indigo-900/50 border border-indigo-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="e.g. Dinner at Restaurant"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">Amount</label>
                <div className="flex">
                  <input 
                    type="number" 
                    className="flex-1 bg-indigo-900/50 border border-indigo-700 rounded-l-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newExpense.amount || ''}
                    onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <select 
                    className="bg-indigo-800 border border-indigo-700 rounded-r-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newExpense.currency}
                    onChange={(e) => setNewExpense({...newExpense, currency: e.target.value})}
                  >
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">Group</label>
                <select 
                  className="w-full bg-indigo-900/50 border border-indigo-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newExpense.group}
                  onChange={(e) => setNewExpense({...newExpense, group: e.target.value})}
                >
                  <option value="">Select a group</option>
                  <option value="Roommates">Roommates</option>
                  <option value="Trip to Paris">Trip to Paris</option>
                  <option value="Office Lunch">Office Lunch</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">Split Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                      checked={newExpense.split === 'equal'}
                      onChange={() => setNewExpense({...newExpense, split: 'equal'})}
                    />
                    Equal
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                      checked={newExpense.split === 'custom'}
                      onChange={() => setNewExpense({...newExpense, split: 'custom'})}
                    />
                    Custom
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">Participants</label>
                <div className="space-y-2">
                  {['You', 'Alice', 'Bob', 'Charlie'].map(person => (
                    <label key={person} className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                        checked={newExpense.participants?.includes(person) || person === 'You'}
                        onChange={(e) => {
                          if (person === 'You') return; // You're always a participant
                          
                          const updatedParticipants = e.target.checked
                            ? [...(newExpense.participants || ['You']), person]
                            : (newExpense.participants || ['You']).filter(p => p !== person);
                            
                          setNewExpense({...newExpense, participants: updatedParticipants});
                        }}
                        disabled={person === 'You'} // You can't remove yourself
                      />
                      {person}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  className="px-4 py-2 bg-indigo-900/50 hover:bg-indigo-900 text-white rounded-lg text-sm transition-colors"
                  onClick={() => setShowNewExpenseForm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all"
                  onClick={handleAddExpense}
                >
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Settlement Form Modal */}
      {showSettleForm && selectedExpense && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Settle Expense</h3>
              <button 
                className="text-indigo-300 hover:text-white"
                onClick={() => {
                  setShowSettleForm(false);
                  setSelectedExpense(null);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <h4 className="font-medium">{selectedExpense.description}</h4>
              <p className="text-sm text-indigo-300">{selectedExpense.group} • {selectedExpense.date}</p>
              
              <div className="mt-4 p-4 bg-indigo-900/30 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-indigo-300">Total Amount:</span>
                  <span className="font-medium">{selectedExpense.amount} {selectedExpense.currency}</span>
                </div>
                
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-indigo-300">Your Share:</span>
                  <span className="font-medium">
                    {selectedExpense.split === 'equal' 
                      ? (selectedExpense.amount / selectedExpense.participants.length).toFixed(2)
                      : (selectedExpense.amount * (selectedExpense.shares?.['You'] || 0)).toFixed(2)
                    } {selectedExpense.currency}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-indigo-300">
                    {selectedExpense.payer === 'You' ? 'You will receive:' : 'You will pay:'}
                  </span>
                  <span className={`font-medium ${selectedExpense.payer === 'You' ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedExpense.payer === 'You' ? '+' : '-'}
                    {selectedExpense.split === 'equal'
                      ? ((selectedExpense.amount / selectedExpense.participants.length) * 
                         (selectedExpense.participants.length - 1)).toFixed(2)
                      : selectedExpense.payer === 'You'
                        ? (selectedExpense.amount * (1 - (selectedExpense.shares?.['You'] || 0))).toFixed(2)
                        : (selectedExpense.amount * (selectedExpense.shares?.['You'] || 0)).toFixed(2)
                    } {selectedExpense.currency}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3">
              <button 
                className="px-4 py-2 bg-indigo-900/50 hover:bg-indigo-900 text-white rounded-lg text-sm transition-colors"
                onClick={() => {
                  setShowSettleForm(false);
                  setSelectedExpense(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-all"
                onClick={processSettlement}
              >
                {selectedExpense.payer === 'You' ? 'Request Payment' : 'Send Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
