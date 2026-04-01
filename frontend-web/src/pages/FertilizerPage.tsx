import React, { useEffect, useState } from 'react';
import { advisoryApi } from '../api/client';

interface FertilizerEntry {
  type: string;
  quantity: number;
  unit: string;
  timing: string;
}

interface SoilAmendment {
  type: string;
  quantity: number;
  unit: string;
  reason: string;
}

interface FertilizerSchedule {
  schedule: FertilizerEntry[];
  organicAlternatives: FertilizerEntry[];
  soilAmendments: SoilAmendment[];
}

interface FertilizerPageProps {
  plotId: string;
  cropId: string;
  onNavigate?: (page: string) => void;
}

const FertilizerPage: React.FC<FertilizerPageProps> = ({ plotId, cropId, onNavigate }) => {
  const [data, setData] = useState<FertilizerSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setErrorCode('');
    advisoryApi
      .getFertilizer(plotId, cropId)
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setData(payload);
      })
      .catch((err: unknown) => {
        const axiosErr = err as {
          response?: { data?: { error?: { code?: string; message?: string } | string; message?: string } };
        };
        const errBody = axiosErr.response?.data?.error;
        const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
        const message =
          typeof errBody === 'object'
            ? errBody?.message
            : typeof errBody === 'string'
            ? errBody
            : axiosErr.response?.data?.message ?? 'Failed to load fertilizer guidance.';
        setErrorCode(code);
        setError(message ?? 'Failed to load fertilizer guidance.');
      })
      .finally(() => setLoading(false));
  }, [plotId, cropId]);

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p>Loading fertilizer guidance…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24 }}>Fertilizer Guidance</h2>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4 }}>
          {errorCode === 'NO_SOIL_PROFILE' ? (
            <p style={{ margin: 0 }}>
              No soil profile found. Please{' '}
              {onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate('soil-profile')}
                  style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
                >
                  create a soil profile
                </button>
              ) : (
                'create a soil profile'
              )}{' '}
              first.
            </p>
          ) : errorCode === 'ADVISORY_ENGINE_UNAVAILABLE' ? (
            <p style={{ margin: 0 }}>
              The advisory service is currently unavailable. Please try again later.
            </p>
          ) : (
            <p style={{ margin: 0, color: 'red' }}>{error}</p>
          )}
        </div>
      )}

      {!error && data && (
        <div>
          {/* Chemical fertilizer schedule */}
          <h3 style={{ marginBottom: 12 }}>Chemical Fertilizer Schedule</h3>
          {data.schedule.length === 0 ? (
            <p style={{ color: '#555' }}>No chemical fertilizers recommended.</p>
          ) : (
            data.schedule.map((item, i) => (
              <div key={i} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                <strong>{item.type}</strong>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 8 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', color: '#555', whiteSpace: 'nowrap' }}>Quantity</td>
                      <td style={{ padding: '3px 0' }}>{item.quantity} {item.unit}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', color: '#555', whiteSpace: 'nowrap' }}>Timing</td>
                      <td style={{ padding: '3px 0' }}>{item.timing}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}

          {/* Organic alternatives */}
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>Organic Alternatives</h3>
          {data.organicAlternatives.length === 0 ? (
            <p style={{ color: '#555' }}>No organic alternatives available.</p>
          ) : (
            data.organicAlternatives.map((item, i) => (
              <div key={i} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                <strong>{item.type}</strong>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 8 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', color: '#555', whiteSpace: 'nowrap' }}>Quantity</td>
                      <td style={{ padding: '3px 0' }}>{item.quantity} {item.unit}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 8px 3px 0', color: '#555', whiteSpace: 'nowrap' }}>Timing</td>
                      <td style={{ padding: '3px 0' }}>{item.timing}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}

          {/* Soil amendments */}
          {data.soilAmendments.length > 0 && (
            <div>
              <h3 style={{ marginTop: 24, marginBottom: 12 }}>Soil Amendments</h3>
              {data.soilAmendments.map((item, i) => (
                <div key={i} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '12px 16px', marginBottom: 12 }}>
                  <strong>{item.type}</strong>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 8 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 8px 3px 0', color: '#555', whiteSpace: 'nowrap' }}>Quantity</td>
                        <td style={{ padding: '3px 0' }}>{item.quantity} {item.unit}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 8px 3px 0', color: '#555', whiteSpace: 'nowrap' }}>Reason</td>
                        <td style={{ padding: '3px 0' }}>{item.reason}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onNavigate && (
        <p style={{ marginTop: 24, textAlign: 'center' }}>
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

export default FertilizerPage;
