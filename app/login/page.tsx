'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token in localStorage
      localStorage.setItem('auth_token', data.token);
      console.log('[Login] Token stored:', data.token.substring(0, 20) + '...');
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('Login successful:', data.user.email);

      // Redirect to home page
      // Force full page reload to remount CompanyContext and load companies
      window.location.href = '/';
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Вхід до системи</h1>
        <p className="subtitle">Система управління платежами та чеками</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введіть пароль"
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Вхід...' : 'Увійти'}
          </button>
        </form>

        <div className="help-text">
          <p>
            <strong>Для першого входу:</strong> створіть користувача через API
          </p>
          <code>
            POST /api/auth/register
            <br />
            {`{ "email": "admin@test.com", "password": "test123", "name": "Admin" }`}
          </code>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .login-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          padding: 40px;
          max-width: 450px;
          width: 100%;
        }

        h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #333;
          text-align: center;
        }

        .subtitle {
          margin: 0 0 30px 0;
          color: #666;
          text-align: center;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }

        input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: #667eea;
        }

        input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .help-text {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          font-size: 13px;
          color: #666;
        }

        .help-text p {
          margin: 0 0 10px 0;
        }

        .help-text code {
          display: block;
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          overflow-x: auto;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .login-card {
            padding: 30px 20px;
          }

          h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
