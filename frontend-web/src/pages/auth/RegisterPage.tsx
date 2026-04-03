import React, { useState } from 'react';
import { authApi } from '../../api/client';

interface Props {
  onNavigate: (page: string, state?: Record<string, string>) => void;
  mode?: 'register' | 'login';
}

export default function RegisterPage({ onNavigate, mode = 'register' }: Props) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  function validate() {
    const cleaned = mobileNumber.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Enter a valid 10-digit mobile number';
    if (!password) return 'Password is required';
    if (!isLogin && password.length < 6) return 'Password must be at least 6 characters';
    if (!isLogin && password !== confirmPassword) return 'Passwords do not match';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');

    try {
      const res = isLogin
        ? await authApi.login(mobileNumber.trim(), password)
        : await authApi.register(mobileNumber.trim(), password);

      const { accessToken, refreshToken, farmerId } = res.data?.data ?? res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('farmerId', farmerId);
      onNavigate('home');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } | string; message?: string } } };
      const errBody = e.response?.data?.error;
      const msg = typeof errBody === 'object' ? errBody?.message
        : typeof errBody === 'string' ? errBody
        : e.response?.data?.message ?? (isLogin ? 'Invalid credentials.' : 'Registration failed.');
      setError(msg ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🌿</div>
          <h2>Smart Crop Advisory</h2>
          <p>{isLogin ? 'Login to your account' : 'Create your free account'}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="mobile">Mobile Number</label>
            <input
              id="mobile"
              type="tel"
              value={mobileNumber}
              onChange={e => { setMobileNumber(e.target.value); setError(''); }}
              placeholder="Enter 10-digit mobile number"
              maxLength={13}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={isLogin ? 'Enter your password' : 'Min 6 characters'}
                required
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Re-enter your password"
                required
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '⏳ Please wait...' : isLogin ? 'Login →' : 'Register →'}
          </button>
        </form>

        <div className="divider">— or —</div>
        <div className="text-center">
          {isLogin ? (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Don't have an account? </span>
              <button className="link-btn" onClick={() => onNavigate('register')}>Register Free</button>
            </>
          ) : (
            <>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Already registered? </span>
              <button className="link-btn" onClick={() => onNavigate('login')}>Login</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
