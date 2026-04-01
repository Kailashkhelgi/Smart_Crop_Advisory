import React, { useState, useEffect } from 'react';
import { farmerApi } from '../api/client';

interface ProfilePageProps {
  onNavigate?: (page: string) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [form, setForm] = useState({
    name: '', preferredLang: 'en', village: '', district: '', state: '', landSizeAcres: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || token.startsWith('demo-')) {
      setError('Please log in to view your profile.');
      setLoading(false);
      return;
    }
    farmerApi.getProfile()
      .then(res => {
        const d = res.data?.data ?? res.data;
        setForm({
          name: d.name ?? '',
          preferredLang: d.preferredLang ?? 'en',
          village: d.village ?? '',
          district: d.district ?? '',
          state: d.state ?? '',
          landSizeAcres: d.landSizeAcres != null ? String(d.landSizeAcres) : '',
        });
      })
      .catch(err => {
        const msg = err?.response?.data?.error?.message
          ?? err?.response?.data?.message
          ?? 'Failed to load profile. Please try again.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(''); setError('');
    setSaving(true);
    try {
      await farmerApi.updateProfile({
        ...form,
        landSizeAcres: form.landSizeAcres !== '' ? Number(form.landSizeAcres) : undefined,
      });
      setSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } | string; message?: string } } };
      const errBody = e.response?.data?.error;
      const msg = typeof errBody === 'object' ? errBody?.message
        : typeof errBody === 'string' ? errBody
        : e.response?.data?.message ?? 'Failed to save profile.';
      setError(msg ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      <p>Loading profile…</p>
    </div>
  );

  return (
    <div>
      <h1 className="page-title">My Profile</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your full name" />
          </div>

          <div className="form-group">
            <label>Preferred Language</label>
            <select value={form.preferredLang}
              onChange={e => setForm(f => ({ ...f, preferredLang: e.target.value }))}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="pa">Punjabi</option>
            </select>
          </div>

          <div className="form-group">
            <label>Village</label>
            <input type="text" value={form.village}
              onChange={e => setForm(f => ({ ...f, village: e.target.value }))}
              placeholder="Village name" />
          </div>

          <div className="form-group">
            <label>District</label>
            <input type="text" value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              placeholder="District name" />
          </div>

          <div className="form-group">
            <label>State</label>
            <input type="text" value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              placeholder="State name" />
          </div>

          <div className="form-group">
            <label>Land Size (acres)</label>
            <input type="number" min="0" step="0.01" value={form.landSizeAcres}
              onChange={e => setForm(f => ({ ...f, landSizeAcres: e.target.value }))}
              placeholder="e.g. 2.5" />
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '⏳ Saving…' : '💾 Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
