'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'

interface Transaction {
  id: number;
  amount: string;
  description: string;
  date: string;
  category: string;
  type: 'debit' | 'credit';
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const { selectedCompany, companies, setSelectedCompany, isLoading: companiesLoading, error: companiesError } = useCompany();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);
  const [fetchingPayments, setFetchingPayments] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<string>('');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'debit' as 'debit' | 'credit'
  });

  useEffect(() => {
    console.log('Hello Vercel MCP! Page loaded successfully.');
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      console.log('Fetching transactions...');
      const res = await fetch('/api/transactions');
      const data = await res.json();

      if (res.ok) {
        setTransactions(data.transactions || []);
        setBalance(data.balance || '0.00');
        console.log(`Loaded ${data.count} transactions. Balance: $${data.balance}`);
      } else {
        console.error('Failed to fetch transactions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Submitting transaction:', formData);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Transaction created:', data.transaction);
        fetchTransactions();
        setFormData({
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          category: '',
          type: 'debit'
        });
      } else {
        console.error('Failed to create transaction:', data.error);
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error creating transaction. Check console for details.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;

    console.log(`Deleting transaction ${id}...`);

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Transaction deleted:', data.transaction);
        fetchTransactions();
      } else {
        console.error('Failed to delete transaction:', data.error);
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction. Check console for details.');
    }
  };

  const handleFetchPayments = async () => {
    if (!selectedCompany) {
      setFetchStatus('Будь ласка, оберіть компанію');
      return;
    }

    setFetchingPayments(true);
    setFetchStatus('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log(`Fetching payments for company: ${selectedCompany.name}`);

      const response = await fetch('/api/integrations/privatbank/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          // Default to last 30 days
          // You can add date pickers later to customize this
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const summary = data.summary;
        setFetchStatus(
          `Успішно! Отримано: ${summary.total_fetched}, нових платежів: ${summary.new_payments}, дублікатів: ${summary.duplicates}`
        );
        console.log('Fetch summary:', summary);

        // Refresh transactions list if any new payments were added
        if (summary.new_payments > 0) {
          fetchTransactions();
        }
      } else {
        setFetchStatus(`Помилка: ${data.error || data.message || 'Не вдалося завантажити платежі'}`);
        console.error('Fetch payments error:', data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setFetchStatus('Помилка з\'єднання з сервером');
    } finally {
      setFetchingPayments(false);
    }
  };

  return (
    <main className="container">
      {/* Company Selector Header */}
      <div className="content" style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.95)', borderRadius: '10px', padding: '20px' }}>
        {companiesError && (
          <div style={{
            padding: '15px',
            background: '#fee',
            color: '#c33',
            borderRadius: '5px',
            marginBottom: '15px',
            fontSize: '14px',
          }}>
            <strong>Помилка завантаження компаній:</strong> {companiesError}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Обрана компанія:
            </label>
            {companiesLoading ? (
              <p style={{ color: '#666' }}>Завантаження компаній...</p>
            ) : companies.length === 0 ? (
              <p style={{ color: '#666' }}>
                Немає доданих компаній.{' '}
                <a href="/settings" style={{ color: '#667eea', textDecoration: 'underline' }}>
                  Додайте першу компанію
                </a>
              </p>
            ) : (
              <select
                value={selectedCompany?.id || ''}
                onChange={(e) => {
                  const company = companies.find(c => c.id === parseInt(e.target.value));
                  setSelectedCompany(company || null);
                }}
                style={{
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  width: '100%',
                  maxWidth: '400px',
                }}
              >
                <option value="">Виберіть компанію</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} (ЄДРПОУ: {company.tax_id})
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => router.push('/settings')}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              whiteSpace: 'nowrap',
            }}
          >
            ⚙️ Налаштування
          </button>
        </div>
        {selectedCompany && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#f0f9ff', borderRadius: '5px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
              <strong>Активна компанія:</strong> {selectedCompany.name}
            </p>
          </div>
        )}

        {selectedCompany && (
          <div style={{ marginTop: '15px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
            <button
              onClick={handleFetchPayments}
              disabled={fetchingPayments}
              style={{
                padding: '12px 24px',
                background: fetchingPayments ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: fetchingPayments ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {fetchingPayments ? '⏳ Завантаження...' : '💳 Отримати платежі з ПриватБанку'}
            </button>
            {fetchStatus && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: fetchStatus.includes('Помилка') ? '#fee' : '#efe',
                color: fetchStatus.includes('Помилка') ? '#c33' : '#3c3',
                borderRadius: '5px',
                fontSize: '14px',
              }}>
                {fetchStatus}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="content">
        <h1>Hello Vercel MCP!</h1>
        <p>This is a simple test project deployed via Vercel MCP.</p>
        <div className="info">
          <h2>Project Info</h2>
          <ul>
            <li>Framework: Next.js 14</li>
            <li>Deployed using: Vercel MCP</li>
            <li>Database: Vercel Postgres</li>
            <li>Status: ✅ Live and working!</li>
          </ul>
        </div>
      </div>

      <div className="content transactions-section">
        <h2>Bank Transactions</h2>
        <div className="balance-display">
          <span className="balance-label">Current Balance:</span>
          <span className={`balance-amount ${parseFloat(balance) >= 0 ? 'positive' : 'negative'}`}>
            ${balance}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          <h3>Add Transaction</h3>
          <div className="form-row">
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as 'debit' | 'credit'})}
            >
              <option value="debit">Debit (-)</option>
              <option value="credit">Credit (+)</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
          <div className="form-row">
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            />
          </div>
          <button type="submit">Add Transaction</button>
        </form>

        <div className="transactions-list">
          <h3>Recent Transactions ({transactions.length})</h3>
          {loading ? (
            <p className="loading">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="empty">No transactions yet. Add one above!</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className={`transaction-item ${tx.type}`}>
                <div className="transaction-main">
                  <div className="transaction-info">
                    <strong>{tx.description}</strong>
                    <span className="transaction-category">{tx.category}</span>
                  </div>
                  <div className="transaction-amount">
                    <span className={`amount ${tx.type}`}>
                      {tx.type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="transaction-meta">
                  <span className="transaction-date">
                    {new Date(tx.date).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
