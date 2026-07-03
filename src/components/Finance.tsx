import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Wallet, ArrowDownRight, ArrowUpRight, PhilippinePeso, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ModuleId } from './Dashboard';

type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface FinanceProps {
  onNavigate: (module: ModuleId) => void;
}

const CATEGORIES = {
  income: ['Per Diem / Allowance', 'Salary', 'Other Income'],
  expense: ['Meals', 'Transport', 'Shopping', 'Accommodation', 'Entertainment', 'Other Expense']
};

const CHART_COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE'];

export function Finance({ onNavigate }: FinanceProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('study-me-finance');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('study-me-finance', JSON.stringify(transactions));
  }, [transactions]);

  // When type changes, update category to the first of that type
  useEffect(() => {
    setCategory(CATEGORIES[type][0]);
  }, [type]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type,
      amount: parsedAmount,
      category,
      description: description.trim() || category,
      date
    };

    setTransactions([newTransaction, ...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    setAmount('');
    setDescription('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Calculate expense data for chart
  const expenseData = CATEGORIES.expense.map(cat => {
    const amount = transactions
      .filter(t => t.type === 'expense' && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: cat, value: amount };
  }).filter(d => d.value > 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 min-h-screen flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-12"
      >
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Flight Deck
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <Wallet className="w-4 h-4" />
          Layover Ledger
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col"
      >
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Finance</h1>
            <p className="text-neutral-500">Track your layover allowances and daily expenses.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="hidden md:flex px-6 py-3 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors items-center gap-2"
          >
            <Plus className={`w-4 h-4 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} /> 
            {isAdding ? 'Cancel' : 'Add Entry'}
          </button>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="md:hidden w-full mb-8 px-6 py-4 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className={`w-4 h-4 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
          {isAdding ? 'Cancel' : 'Add Entry'}
        </button>

        {/* Top Section: Overview & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Overview Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2 p-8 border border-neutral-200 bg-white shadow-sm hover:border-black transition-colors">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-4">Total Balance</h2>
              <div className={`text-5xl font-light tracking-tighter flex items-center gap-2 ${balance < 0 ? 'text-red-500' : 'text-black'}`}>
                <PhilippinePeso className="w-10 h-10 opacity-50" />
                {balance.toFixed(2)}
              </div>
            </div>
            <div className="p-8 border border-neutral-200 bg-neutral-50 hover:border-black transition-colors group">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-4 group-hover:text-black transition-colors">Income</h2>
              <div className="text-3xl font-medium tracking-tight text-green-600 flex items-center gap-2">
                <ArrowUpRight className="w-6 h-6" />
                ₱{totalIncome.toFixed(2)}
              </div>
            </div>
            <div className="p-8 border border-neutral-200 bg-neutral-50 hover:border-black transition-colors group">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-4 group-hover:text-black transition-colors">Expenses</h2>
              <div className="text-3xl font-medium tracking-tight text-black flex items-center gap-2">
                <ArrowDownRight className="w-6 h-6 text-neutral-400" />
                ₱{totalExpense.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="lg:col-span-1 p-8 border border-neutral-200 bg-white flex flex-col justify-between shadow-sm hover:border-black transition-colors min-h-[320px]">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-6 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" /> Expense Breakdown
            </h2>
            {expenseData.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `₱${value.toFixed(2)}`}
                      contentStyle={{ borderRadius: '0px', border: '1px solid #000', padding: '12px', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#000', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-300">
                <PieChartIcon className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">No expenses yet</p>
              </div>
            )}
            
            {expenseData.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {expenseData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                    {entry.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.form 
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              onSubmit={handleAddTransaction}
              className="mb-12 p-8 border border-neutral-200 bg-white overflow-hidden"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-6">New Transaction</h3>
              
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-3 text-sm font-semibold tracking-wide border transition-colors ${type === 'expense' ? 'border-black bg-black text-white' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-3 text-sm font-semibold tracking-wide border transition-colors ${type === 'income' ? 'border-black bg-black text-white' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}
                >
                  Income
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Amount</label>
                  <div className="relative">
                    <PhilippinePeso className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-4 pl-10 border border-neutral-200 focus:border-black outline-none bg-transparent transition-colors font-medium text-lg"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-4 border border-neutral-200 focus:border-black outline-none bg-white transition-colors"
                  >
                    {CATEGORIES[type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full p-4 border border-neutral-200 focus:border-black outline-none bg-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-4 pl-10 border border-neutral-200 focus:border-black outline-none bg-transparent transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)} 
                  className="px-8 py-4 border border-neutral-200 text-neutral-500 font-semibold text-sm hover:border-black hover:text-black transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-black text-white font-semibold text-sm hover:bg-neutral-800 transition-colors"
                >
                  Save Transaction
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Ledger List */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-6">Recent Transactions</h2>
          
          {transactions.length === 0 ? (
            <div className="py-16 border border-dashed border-neutral-200 text-center text-neutral-400 flex flex-col items-center">
              <Wallet className="w-12 h-12 mb-4 opacity-20" />
              <p>No transactions yet. Add your first income or expense.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map(transaction => (
                <motion.div 
                  key={transaction.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 border border-neutral-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-black transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-green-50' : 'bg-neutral-50'}`}>
                      {transaction.type === 'income' 
                        ? <ArrowUpRight className="w-5 h-5 text-green-600" />
                        : <ArrowDownRight className="w-5 h-5 text-black" />
                      }
                    </div>
                    <div>
                      <h3 className="font-semibold text-black">{transaction.description}</h3>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span className="uppercase tracking-wider">{transaction.category}</span>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 self-end sm:self-auto">
                    <span className={`text-xl font-medium tracking-tight ${transaction.type === 'income' ? 'text-green-600' : 'text-black'}`}>
                      {transaction.type === 'income' ? '+' : '-'}₱{transaction.amount.toFixed(2)}
                    </span>
                    <button 
                      onClick={() => handleDelete(transaction.id)}
                      className="p-2 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
