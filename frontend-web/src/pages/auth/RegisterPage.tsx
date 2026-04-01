import React, { useState } from 'react';
import { authApi } from '../../api/client';

interface Props {
  onNavigate: (page: string, state?: Record<string, string>) => void;
  mode?: 'register' | 'login';
}

export default function RegisterPage({ onNavigate, mode = 'register' }: Props) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  function validateMobile(num: string) {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Enter a valid 10-digit mobile number';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErr = validateMobile(mobileNumber);
    if (validationErr) { setError(validationErr); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    // Real backend call
    try {
      await authApi.register(mobileNumber.trim());
      setSuccess('OTP sent successfully! Check your phone (or backend console for dev OTP).');
      setTimeout(() => {
        onNavigate('verify-otp', { mobileNumber: mobileNumber.trim() });
      }, 1200);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } | string; message?: string } } };
      const errBody = e.response?.data?.error;
      const msg = typeof errBody === 'object' ? errBody?.message
        : typeof errBody === 'string' ? errBody
        : e.response?.data?.message ?? 'Failed to send OTP. Please try again.';
      setError(msg ?? 'Failed to send OTP.');
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
          <p>{mode === 'login' ? 'Login with your mobile number' : 'Register to get personalized farming advice'}</p>
        </div>

        <div className="step-indicator">
          <div className="step active">1</div>
          <div className="step-line"></div>
          <div className="step pending">2</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

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
            <div className="otp-hint">We'll send a 6-digit OTP to verify your number</div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !mobileNumber.trim()}>
            {loading ? '⏳ Sending OTP...' : 'Send OTP →'}
          </button>
        </form>

        <div className="divider">— or —</div>
        <div className="text-center">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Already registered? </span>
          <button className="link-btn" onClick={() => onNavigate('register')}>Login with OTP</button>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#e8f5e9', borderRadius: '8px', fontSize: '0.82rem', color: '#2e7d32' }}>
          💡 OTP will be logged in the backend console for dev. Real SMS requires an OTP provider API key.
        </div>
      </div>
    </div>
  );
}
