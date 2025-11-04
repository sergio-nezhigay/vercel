'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/contexts/CompanyContext';

interface CompanyFormData {
  name: string;
  tax_id: string;
  pb_merchant_id: string;
  pb_api_token: string;
  checkbox_license_key: string;
  checkbox_cashier_pin: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { companies, loadCompanies, error: companiesError } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    tax_id: '',
    pb_merchant_id: '',
    pb_api_token: '',
    checkbox_license_key: '',
    checkbox_cashier_pin: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      tax_id: '',
      pb_merchant_id: '',
      pb_api_token: '',
      checkbox_license_key: '',
      checkbox_cashier_pin: '',
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (company: any) => {
    setFormData({
      name: company.name,
      tax_id: company.tax_id,
      pb_merchant_id: company.pb_merchant_id || '',
      pb_api_token: company.pb_api_token || '',
      checkbox_license_key: company.checkbox_license_key || '',
      checkbox_cashier_pin: company.checkbox_cashier_pin || '',
    });
    setEditingId(company.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const url = editingId
        ? `/api/companies/${editingId}`
        : '/api/companies';

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingId ? 'Компанію оновлено успішно' : 'Компанію створено успішно');
        resetForm();
        await loadCompanies();
      } else {
        setError(data.error || 'Помилка при збереженні компанії');
      }
    } catch (err) {
      console.error('Error saving company:', err);
      setError('Помилка при збереженні компанії');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Ви впевнені, що хочете видалити компанію "${name}"?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Компанію видалено успішно');
        await loadCompanies();
      } else {
        setError(data.error || 'Помилка при видаленні компанії');
      }
    } catch (err) {
      console.error('Error deleting company:', err);
      setError('Помилка при видаленні компанії');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Налаштування компаній</h1>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Назад
        </button>
      </div>

      {companiesError && (
        <div style={{
          padding: '15px',
          background: '#fee',
          color: '#c33',
          borderRadius: '5px',
          marginBottom: '20px',
        }}>
          <strong>Помилка завантаження компаній:</strong> {companiesError}
        </div>
      )}

      {error && (
        <div style={{
          padding: '15px',
          background: '#fee',
          color: '#c33',
          borderRadius: '5px',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '15px',
          background: '#efe',
          color: '#3c3',
          borderRadius: '5px',
          marginBottom: '20px',
        }}>
          {success}
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '20px',
          }}
        >
          + Додати компанію
        </button>
      )}

      {showForm && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>
            {editingId ? 'Редагувати компанію' : 'Нова компанія'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Назва компанії *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                ЄДРПОУ *
              </label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                PrivatBank Merchant ID
              </label>
              <input
                type="text"
                value={formData.pb_merchant_id}
                onChange={(e) => setFormData({ ...formData, pb_merchant_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                PrivatBank API Token
              </label>
              <input
                type="password"
                value={formData.pb_api_token}
                onChange={(e) => setFormData({ ...formData, pb_api_token: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Checkbox License Key
              </label>
              <input
                type="password"
                value={formData.checkbox_license_key}
                onChange={(e) => setFormData({ ...formData, checkbox_license_key: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Checkbox Cashier PIN
              </label>
              <input
                type="password"
                value={formData.checkbox_cashier_pin}
                onChange={(e) => setFormData({ ...formData, checkbox_cashier_pin: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                }}
              >
                {loading ? 'Збереження...' : 'Зберегти'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                }}
              >
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h2>Список компаній</h2>
        {companies.length === 0 ? (
          <p style={{ color: '#666' }}>Немає доданих компаній</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {companies.map((company) => (
              <div
                key={company.id}
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 10px 0' }}>{company.name}</h3>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      <strong>ЄДРПОУ:</strong> {company.tax_id}
                    </p>
                    {company.pb_merchant_id && (
                      <p style={{ margin: '5px 0', color: '#666' }}>
                        <strong>PrivatBank ID:</strong> {company.pb_merchant_id}
                      </p>
                    )}
                    <p style={{ margin: '5px 0', color: '#999', fontSize: '14px' }}>
                      Створено: {new Date(company.created_at).toLocaleString('uk-UA')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleEdit(company)}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => handleDelete(company.id, company.name)}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
