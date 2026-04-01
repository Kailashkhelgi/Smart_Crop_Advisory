import React, { useEffect, useState } from 'react';
import { advisoryApi } from '../api/client';

interface CropRecommendation {
  rank: number;
  cropName: string;
  expectedYieldRange: string;
  waterRequirement: string;
  estimatedInputCost: string;
}

interface CropAdvisoryPageProps {
  plotId: string;
  onNavigate?: (page: string) => void;
}

const CropAdvisoryPage: React.FC<CropAdvisoryPageProps> = ({ plotId, onNavigate }) => {
  const [crops, setCrops] = useState<CropRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setErrorCode('');
    advisoryApi
      .getCrops(plotId)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setCrops(Array.isArray(data) ? data : data?.crops ?? []);
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
            : axiosErr.response?.data?.message ?? 'Failed to load crop recommendations.';
        setErrorCode(code);
        setError(message ?? 'Failed to load crop recommendations.');
      })
      .finally(() => setLoading(false));
  }, [plotId]);

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p>Loading crop recommendations…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24 }}>Crop Recommendations</h2>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4 }}>
          {errorCode === 'INCOMPLETE_SOIL_PROFILE' ? (
            <p style={{ margin: 0 }}>
              Your soil profile is incomplete. Please{' '}
              {onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate('soil-profile')}
                  style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
                >
                  complete your soil profile
                </button>
              ) : (
                'complete your soil profile'
              )}{' '}
              before requesting crop recommendations.
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

      {!error && crops.length === 0 && (
        <p>No recommendations available for this plot.</p>
      )}

      {crops.map((crop) => (
        <div
          key={crop.rank}
          style={{
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '16px',
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18 }}>
            {crop.rank}. {crop.cropName}
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px 4px 0', color: '#555', whiteSpace: 'nowrap' }}>Expected Yield</td>
                <td style={{ padding: '4px 0' }}>{crop.expectedYieldRange}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px 4px 0', color: '#555', whiteSpace: 'nowrap' }}>Water Requirement</td>
                <td style={{ padding: '4px 0' }}>{crop.waterRequirement}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px 4px 0', color: '#555', whiteSpace: 'nowrap' }}>Estimated Input Cost</td>
                <td style={{ padding: '4px 0' }}>{crop.estimatedInputCost}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {onNavigate && (
        <p style={{ marginTop: 16, textAlign: 'center' }}>
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

export default CropAdvisoryPage;
