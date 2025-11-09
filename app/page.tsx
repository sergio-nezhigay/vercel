'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/contexts/CompanyContext';
import PaymentList from '@/components/PaymentList';
import Dashboard from '@/components/Dashboard';

type ViewMode = 'dashboard' | 'payments';

export default function Home() {
  const router = useRouter();
  const { selectedCompany, companies, setSelectedCompany, isLoading: companiesLoading, error: companiesError } = useCompany();
  const [fetchingPayments, setFetchingPayments] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('payments');

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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const summary = data.summary;
        setFetchStatus(
          `Успішно! Отримано: ${summary.total_fetched}, нових платежів: ${summary.new_payments}, дублікатів: ${summary.duplicates}`
        );
        console.log('Fetch summary:', summary);

        // Refresh the payment list if there were new payments
        if (summary.new_payments > 0) {
          // The PaymentList component will auto-refresh
          window.location.reload();
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
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                <button
                  onClick={() => setViewMode('dashboard')}
                  style={{
                    padding: '10px 20px',
                    background: viewMode === 'dashboard' ? '#667eea' : '#e5e7eb',
                    color: viewMode === 'dashboard' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: viewMode === 'dashboard' ? 'bold' : 'normal',
                  }}
                >
                  📊 Панель
                </button>
                <button
                  onClick={() => setViewMode('payments')}
                  style={{
                    padding: '10px 20px',
                    background: viewMode === 'payments' ? '#667eea' : '#e5e7eb',
                    color: viewMode === 'payments' ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: viewMode === 'payments' ? 'bold' : 'normal',
                  }}
                >
                  📋 Платежі
                </button>
              </div>
            </div>
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

      {/* Dashboard or Payment List */}
      {selectedCompany ? (
        viewMode === 'dashboard' ? (
          <Dashboard
            companyId={selectedCompany.id}
            onRefresh={() => {
              // Trigger any additional refresh logic if needed
              console.log('Dashboard refreshed');
            }}
          />
        ) : (
          <PaymentList companyId={selectedCompany.id} />
        )
      ) : (
        <div className="content" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>Система управління платежами та чеками</h2>
          <p style={{ color: '#666', marginTop: '20px' }}>
            Оберіть компанію зі списку вище, щоб переглянути дані
          </p>
        </div>
      )}
    </main>
  );
}
