import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';

interface SessionByType {
  type: string;
  count: number;
}

interface DashboardReport {
  totalSessions: number;
  averageRating: number;
  sessionsByType: SessionByType[];
  totalFeedbackCount: number;
}

interface DashboardPageProps {
  role: 'officer' | 'admin';
  onNavigate?: (page: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ role, onNavigate }) => {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (role !== 'officer' && role !== 'admin') {
      setForbidden(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setForbidden(false);

    dashboardApi
      .getReports(role)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setReport(data);
      })
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { status?: number; data?: { error?: { message?: string } | string; message?: string } } };
        if (axiosErr.response?.status === 403) {
          setForbidden(true);
        } else {
          const errBody = axiosErr.response?.data?.error;
          const message =
            typeof errBody === 'object'
              ? errBody?.message
              : typeof errBody === 'string'
              ? errBody
              : axiosErr.response?.data?.message ?? 'Failed to load dashboard reports.';
          setError(message ?? 'Failed to load dashboard reports.');
        }
      })
      .finally(() => setLoading(false));
  }, [role]);

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p>Loading dashboard…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <div style={{ padding: '24px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 6 }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#721c24' }}>403 FORBIDDEN</h2>
          <p style={{ margin: 0, color: '#721c24' }}>You do not have permission to view this dashboard.</p>
        </div>
        {onNavigate && (
          <p style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontSize: 14 }}
            >
              ← Back to Home
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24 }}>
        {role === 'admin' ? 'Admin' : 'Officer'} Dashboard
      </h2>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4 }}>
          <p style={{ margin: 0, color: '#721c24' }}>{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Aggregated stats */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px', padding: '16px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold' }}>{report.totalSessions}</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Total Advisory Sessions</div>
            </div>
            <div style={{ flex: '1 1 140px', padding: '16px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold' }}>
                {typeof report.averageRating === 'number' ? report.averageRating.toFixed(1) : '—'}
              </div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Average Rating</div>
            </div>
            <div style={{ flex: '1 1 140px', padding: '16px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold' }}>{report.totalFeedbackCount}</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Total Feedback Count</div>
            </div>
          </div>

          {/* Sessions by type */}
          <h3 style={{ marginBottom: 12 }}>Sessions by Type</h3>
          {report.sessionsByType && report.sessionsByType.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #ddd' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {report.sessionsByType.map((row) => (
                  <tr key={row.type}>
                    <td style={{ padding: '8px 12px', border: '1px solid #ddd' }}>{row.type}</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #ddd', textAlign: 'right' }}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#555' }}>No session type data available.</p>
          )}
        </>
      )}

      {onNavigate && (
        <p style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', fontSize: 14 }}
          >
            ← Back to Home
          </button>
        </p>
      )}
    </div>
  );
};

export default DashboardPage;
