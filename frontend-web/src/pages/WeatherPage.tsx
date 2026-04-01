import React, { useEffect, useState } from 'react';
import { weatherApi } from '../api/client';

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall24h: number;
  frostRisk: boolean;
  lastUpdated: string;
}

interface WeatherPageProps {
  lat: number;
  lon: number;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function isStale(lastUpdated: string): boolean {
  return Date.now() - new Date(lastUpdated).getTime() > SIX_HOURS_MS;
}

const WeatherPage: React.FC<WeatherPageProps> = ({ lat, lon }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    setErrorCode('');
    setErrorMessage('');
    weatherApi
      .get(lat, lon)
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setData(payload as WeatherData);
      })
      .catch((err: unknown) => {
        const axiosErr = err as {
          response?: { data?: { error?: { code?: string; message?: string } | string } };
        };
        const errBody = axiosErr.response?.data?.error;
        const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
        const message =
          typeof errBody === 'object'
            ? errBody?.message ?? 'Weather data unavailable.'
            : typeof errBody === 'string'
            ? errBody
            : 'Weather data unavailable.';
        setErrorCode(code);
        setErrorMessage(message);
      })
      .finally(() => setLoading(false));
  }, [lat, lon]);

  if (loading) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p>Loading weather data…</p>
      </div>
    );
  }

  if (errorCode === 'WEATHER_UNAVAILABLE') {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
        <h2 style={{ marginBottom: 16 }}>Weather Alerts</h2>
        <div style={{ padding: '12px 16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4 }}>
          <p style={{ margin: 0 }}>
            Weather data is temporarily unavailable and no cached forecast exists. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
        <h2 style={{ marginBottom: 16 }}>Weather Alerts</h2>
        <p style={{ color: 'red' }}>{errorMessage || 'Failed to load weather data.'}</p>
      </div>
    );
  }

  const stale = isStale(data.lastUpdated);

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 16 }}>Weather Alerts</h2>

      {stale && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            ⚠️ Weather data temporarily unavailable — showing last known forecast
          </p>
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: '16px', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 12px 6px 0', color: '#555', whiteSpace: 'nowrap' }}>Temperature</td>
              <td style={{ padding: '6px 0' }}>{data.temperature} °C</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px 6px 0', color: '#555', whiteSpace: 'nowrap' }}>Humidity</td>
              <td style={{ padding: '6px 0' }}>{data.humidity} %</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px 6px 0', color: '#555', whiteSpace: 'nowrap' }}>Rainfall (next 24h)</td>
              <td style={{ padding: '6px 0' }}>{data.rainfall24h.toFixed(1)} mm</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px 6px 0', color: '#555', whiteSpace: 'nowrap' }}>Frost Risk</td>
              <td style={{ padding: '6px 0', color: data.frostRisk ? '#c0392b' : '#27ae60', fontWeight: 600 }}>
                {data.frostRisk ? '⚠️ Yes' : 'No'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 12px 6px 0', color: '#555', whiteSpace: 'nowrap' }}>Last Updated</td>
              <td style={{ padding: '6px 0', fontSize: 13, color: '#666' }}>
                {new Date(data.lastUpdated).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeatherPage;
