import React, { useRef, useState } from 'react';
import { imageApi } from '../api/client';

interface Treatment {
  name: string;
  dosage: string;
  method: string;
}

interface DiagnosisResult {
  pestOrDiseaseName: string;
  confidence: number;
  chemicalTreatments: Treatment[];
  organicTreatments: Treatment[];
}

interface ImageAnalysisPageProps {
  onNavigate?: (page: string) => void;
}

const LOW_CONFIDENCE_THRESHOLD = 60;

const ImageAnalysisPage: React.FC<ImageAnalysisPageProps> = ({ onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setResult(null);
    setError('');
    setErrorCode('');
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setResult(null);
    setError('');
    setErrorCode('');

    try {
      const res = await imageApi.analyze(selectedFile);
      const data = res.data?.data ?? res.data;
      setResult(data as DiagnosisResult);
    } catch (err: unknown) {
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
          : axiosErr.response?.data?.message ?? 'Analysis failed. Please try again.';
      setErrorCode(code);
      setError(message ?? 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function errorMessage() {
    if (errorCode === 'UNSUPPORTED_MEDIA_TYPE') {
      return 'Unsupported file format. Please upload a JPEG or PNG image.';
    }
    if (errorCode === 'PAYLOAD_TOO_LARGE') {
      return 'Image is too large. Maximum allowed size is 10 MB.';
    }
    if (errorCode === 'VISION_ENGINE_UNAVAILABLE') {
      return 'The image analysis service is currently unavailable. Please try again later.';
    }
    return error;
  }

  const isLowConfidence = result && result.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24 }}>Pest & Disease Detection</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="crop-image" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Upload crop image (JPEG or PNG, max 10 MB)
          </label>
          <input
            id="crop-image"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            style={{ display: 'block' }}
          />
        </div>

        {previewUrl && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={previewUrl}
              alt="Selected crop"
              style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 6, border: '1px solid #ddd' }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFile || loading}
          style={{
            padding: '10px 24px',
            background: !selectedFile || loading ? '#aaa' : '#2e7d32',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: !selectedFile || loading ? 'not-allowed' : 'pointer',
            fontSize: 15,
          }}
        >
          {loading ? 'Analyzing…' : 'Analyze Image'}
        </button>
      </form>

      {loading && (
        <p style={{ marginTop: 20, color: '#555' }}>Analyzing image, please wait…</p>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#fdecea', border: '1px solid #f44336', borderRadius: 4 }}>
          <p style={{ margin: 0, color: '#c62828' }}>{errorMessage()}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 28 }}>
          <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{result.pestOrDiseaseName}</h3>
            <p style={{ margin: '0 0 4px 0', color: '#555' }}>
              Confidence: <strong>{result.confidence}%</strong>
            </p>

            {isLowConfidence && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4 }}>
                <p style={{ margin: 0, color: '#7a5c00' }}>
                  ⚠ Low confidence — please consult an Extension Officer.
                </p>
              </div>
            )}
          </div>

          {result.chemicalTreatments?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 10 }}>Chemical Treatments</h4>
              {result.chemicalTreatments.map((t, i) => (
                <div key={i} style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: 4, marginBottom: 8 }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{t.name}</p>
                  <p style={{ margin: '0 0 2px 0', fontSize: 13, color: '#555' }}>Dosage: {t.dosage}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Method: {t.method}</p>
                </div>
              ))}
            </div>
          )}

          {result.organicTreatments?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 10 }}>Organic Treatments</h4>
              {result.organicTreatments.map((t, i) => (
                <div key={i} style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: 4, marginBottom: 8 }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{t.name}</p>
                  <p style={{ margin: '0 0 2px 0', fontSize: 13, color: '#555' }}>Dosage: {t.dosage}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Method: {t.method}</p>
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

export default ImageAnalysisPage;
