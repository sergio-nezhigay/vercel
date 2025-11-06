'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  overall: {
    total_payments: number;
    pending_receipts: number;
    issued_receipts: number;
    total_amount: number;
    pending_amount: number;
    issued_amount: number;
    receipt_issuance_rate: number;
    earliest_payment: string | null;
    latest_payment: string | null;
  };
  this_month: {
    total_payments: number;
    pending_receipts: number;
    issued_receipts: number;
    total_amount: number;
  };
  last_7_days: {
    total_payments: number;
    total_amount: number;
  };
  recent_activity: Array<{
    id: number;
    amount: string;
    sender_name: string;
    description: string;
    payment_date: string;
    receipt_issued: boolean;
    created_at: string;
  }>;
  top_senders: Array<{
    sender_name: string;
    payment_count: number;
    total_amount: number;
  }>;
  daily_trend: Array<{
    date: string;
    payment_count: number;
    total_amount: number;
  }>;
}

interface DashboardProps {
  companyId: number;
  onRefresh?: () => void;
}

export default function Dashboard({ companyId, onRefresh }: DashboardProps) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchStats();
    }
  }, [companyId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/stats?companyId=${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Не вдалося завантажити статистику');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    if (onRefresh) {
      onRefresh();
    }
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="content" style={{ textAlign: 'center', padding: '40px' }}>
        <p>⏳ Завантаження статистики...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="content" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#c33' }}>❌ {error || 'Помилка завантаження статистики'}</p>
        <button
          onClick={fetchStats}
          style={{
            marginTop: '15px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Спробувати ще раз
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with refresh button */}
      <div className="content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>📊 Панель управління</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: '10px 20px',
            background: refreshing ? '#9ca3af' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {refreshing ? '⏳ Оновлення...' : '🔄 Оновити'}
        </button>
      </div>

      {/* Overall Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
        <div className="content" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Всього платежів</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.overall.total_payments}</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            {formatCurrency(stats.overall.total_amount)}
          </div>
        </div>

        <div className="content" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Чеків до видачі</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.overall.pending_receipts}</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            {formatCurrency(stats.overall.pending_amount)}
          </div>
        </div>

        <div className="content" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Видано чеків</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.overall.issued_receipts}</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            {formatCurrency(stats.overall.issued_amount)}
          </div>
        </div>

        <div className="content" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Рівень видачі чеків</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.overall.receipt_issuance_rate}%</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
            {stats.overall.issued_receipts} / {stats.overall.total_payments}
          </div>
        </div>
      </div>

      {/* This Month & Last 7 Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        <div className="content">
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>📅 Цей місяць</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Платежів:</span>
              <strong>{stats.this_month.total_payments}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Сума:</span>
              <strong>{formatCurrency(stats.this_month.total_amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Видано чеків:</span>
              <strong style={{ color: '#10b981' }}>{stats.this_month.issued_receipts}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Очікують чеків:</span>
              <strong style={{ color: '#f59e0b' }}>{stats.this_month.pending_receipts}</strong>
            </div>
          </div>
        </div>

        <div className="content">
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>📆 Останні 7 днів</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Платежів:</span>
              <strong>{stats.last_7_days.total_payments}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Сума:</span>
              <strong>{formatCurrency(stats.last_7_days.total_amount)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Top Senders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '15px' }}>
        {/* Recent Activity */}
        <div className="content">
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>🕐 Остання активність</h3>
          {stats.recent_activity.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Немає платежів</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.recent_activity.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: '10px',
                    background: activity.receipt_issued ? '#f0fdf4' : '#fef9f3',
                    borderRadius: '5px',
                    borderLeft: `4px solid ${activity.receipt_issued ? '#10b981' : '#f59e0b'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <strong style={{ fontSize: '14px' }}>{activity.sender_name}</strong>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#667eea' }}>
                      {formatCurrency(parseFloat(activity.amount))}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {activity.description || 'Без опису'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatDateTime(activity.payment_date)}</span>
                    <span>{activity.receipt_issued ? '✅ Чек видано' : '⏳ Очікує чека'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Senders */}
        <div className="content">
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>👥 Топ відправників</h3>
          {stats.top_senders.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Немає даних</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.top_senders.map((sender, index) => (
                <div
                  key={sender.sender_name}
                  style={{
                    padding: '10px',
                    background: '#f9fafb',
                    borderRadius: '5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {index + 1}. {sender.sender_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                      {sender.payment_count} {sender.payment_count === 1 ? 'платіж' : 'платежів'}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#667eea' }}>
                    {formatCurrency(sender.total_amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Trend (Last 30 Days) */}
      <div className="content">
        <h3 style={{ marginTop: 0, borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>📈 Динаміка платежів (останні 30 днів)</h3>
        {stats.daily_trend.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>Немає даних</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '14px' }}>Дата</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '14px' }}>Кількість платежів</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>Сума</th>
                </tr>
              </thead>
              <tbody>
                {stats.daily_trend.map((day) => (
                  <tr key={day.date} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px', fontSize: '14px' }}>{formatDate(day.date)}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '14px' }}>{day.payment_count}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#667eea' }}>
                      {formatCurrency(day.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
