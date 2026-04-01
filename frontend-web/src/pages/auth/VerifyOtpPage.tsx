import React, { useState, useRef, useEffect } from 'react';
import { authApi } from '../../api/client';

interface Props {
  mobileNumber: string;
  onNavigate: (page: string) => void;
}

const DEMO_OTP = '123456';

export default function VerifyOtpPage({ mobileNumber, onNavigate }: Props) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [success, setSuccess] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => setResendTimer(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < 5) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => { if (i < 6) newOtp[i] = ch; });
    setOtp(newOtp);
    const focusIdx = Math.min(pasted.length, 5);
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length < 6) { setError('Please enter the complete 6-digit OTP'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await authApi.verifyOtp(mobileNumber, otpStr);
      const { accessToken, refreshToken, farmerId } = res.data?.data ?? res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('farmerId', farmerId);
      setSuccess('✅ Verified! Redirecting to your dashboard...');
      setLoading(false);
      setTimeout(() => onNavigate('home'), 900);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } | string; message?: string } } };
      const errBody = e.response?.data?.error;
      const msg = typeof errBody === 'object' ? errBody?.message
        : typeof errBody === 'string' ? errBody
        : e.response?.data?.message ?? 'Invalid OTP. Please try again.';
      setError(msg ?? 'Invalid OTP.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
      setLoading(false);
    }
  }

  function handleResend() {
    if (resendTimer > 0) return;
    setResendTimer(30);
    setError('');
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }

  function handleBack() {
    onNavigate('register');
  }

  const otpStr = otp.join('');

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">📱</div>
          <h2>Verify Your Number</h2>
          <p>OTP sent to <strong>{mobileNumber}</strong></p>
        </div>

        <div className="step-indicator">
          <div className="step done">✓</div>
          <div className="step-line done"></div>
          <div className="step active">2</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ textAlign: 'center', display: 'block' }}>Enter 6-digit OTP</label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  style={{
                    width: '46px', height: '54px', textAlign: 'center',
                    fontSize: '1.4rem', fontWeight: '700',
                    border: `2px solid ${digit ? 'var(--green-light)' : 'var(--border)'}`,
                    borderRadius: '8px', outline: 'none',
                    background: digit ? 'var(--green-pale)' : '#fafafa',
                    transition: 'all 0.15s',
                    cursor: 'text'
                  }}
                />
              ))}
            </div>
            <div className="otp-hint text-center mt-1">
              {resendTimer > 0
                ? `Resend OTP in ${resendTimer}s`
                : <button type="button" className="link-btn" onClick={handleResend}>Resend OTP</button>
              }
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || otpStr.length < 6}
          >
            {loading ? '⏳ Verifying...' : '✓ Verify & Continue'}
          </button>
        </form>

        <button type="button" className="btn-secondary" onClick={handleBack}>
          ← Change Mobile Number
        </button>

        <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#e8f5e9', borderRadius: '8px', fontSize: '0.82rem', color: '#2e7d32' }}>
          💡 Check the backend console (terminal) for the OTP — it's logged as: <code>[DEV] OTP for ...</code>
        </div>
      </div>
    </div>
  );
}
