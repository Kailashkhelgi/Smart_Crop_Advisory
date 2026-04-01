import React, { useState } from 'react';
import { marketApi } from '../api/client';

interface MandiPrice {
  mandiName: string;
  distanceKm: number;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  lastUpdated: string;
}

interface MarketPriceResponse {
  stale: boolean;
  prices: MandiPrice[];
}

const MarketPricePage: React.FC = () => {
  const [crop, setCrop] = useState('');
  const [data, setData] = useState<MarketPriceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!crop.trim()) return;

    setLoading(true);
    setErrorCode('');
    setErrorMessage('');
    setData(null);

    marketApi
      .getPrices(crop.trim())
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setData(payload as MarketPriceResponse);
      })
      .catch((err: unknown) => {
        const axiosErr = err as {
          response?: { data?: { error?: { code?: string; message?: string } | string } };
        };
        const errBody = axiosErr.response?.data?.error;
        const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
        const message =
          typeof errBody === 'object'
            ? errBody?.message ?? 'Market price data unavailable.'
            : typeof errBody === 'string'
            ? errBody
            : 'Market price data unavailable.';
        setErrorCode(code);
        setErrorMessage(message);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 16 }}>Market Prices</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          placeholder="Enter crop name (e.g. wheat)"
          style={{ flex: 1, padding: '8px 12px', fontSize: 15, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button
          type="submit"
          disabled={loading || !crop.trim()}
          style={{ padding: '8px 18px', fontSize: 15, cursor: 'pointer', borderRadius: 4, border: '1px solid #2980b9', background: '#2980b9', color: '#fff' }}
        >
          Search
        </button>
      </form>

      {loading && (
        <p style={{ textAlign: 'center', color: '#555' }}>Loading market prices…</p>
      )}

      {errorCode === 'MARKET_UNAVAILABLE' && (
        <div style={{ padding: '12px 16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            Market price service is currently unavailable. Showing last cached prices if available.
          </p>
        </div>
      )}

      {!loading && errorCode !== 'MARKET_UNAVAILABLE' && errorMessage && (
        <p style={{ color: 'red' }}>{errorMessage}</p>
      )}

      {data && (
        <>
          {data.stale && (
            <div style={{ padding: '10px 14px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                ⚠️ Price data is older than 24 hours — these may not reflect current market rates.
              </p>
            </div>
          )}

          {data.prices.length === 0 ? (
            <p style={{ color: '#555' }}>No market data found for "{crop}".</p>
          ) : (
            data.prices.map((mandi, i) => (
              <div
                key={i}
                style={{ border: '1px solid #ddd', borderRadius: 6, padding: '14px 16px', marginBottom: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 16 }}>{mandi.mandiName}</strong>
                  <span style={{ fontSize: 13, color: '#666' }}>{mandi.distanceKm} km away</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 12px 4px 0', color: '#555' }}>Min Price</td>
                      <td style={{ padding: '4px 0' }}>₹{mandi.minPrice}/q</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 12px 4px 0', color: '#555' }}>Max Price</td>
                      <td style={{ padding: '4px 0' }}>₹{mandi.maxPrice}/q</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 12px 4px 0', color: '#555' }}>Modal Price</td>
                      <td style={{ padding: '4px 0', fontWeight: 600 }}>₹{mandi.modalPrice}/q</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 12px 4px 0', color: '#555' }}>Last Updated</td>
                      <td style={{ padding: '4px 0', fontSize: 13, color: '#666' }}>
                        {new Date(mandi.lastUpdated).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};

export default MarketPricePage;
