import React, { useState, useRef } from 'react';
import { voiceApi } from '../api/client';

type Language = 'en' | 'hi' | 'pa';
type Mode = 'voice' | 'text';

interface VoicePageProps {
  onNavigate?: (page: string) => void;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pa', label: 'Punjabi' },
];

const VoicePage: React.FC<VoicePageProps> = ({ onNavigate }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [mode, setMode] = useState<Mode>('voice');

  // STT state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [sttUnrecognized, setSttUnrecognized] = useState(false);

  // TTS state
  const [ttsText, setTtsText] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function resetState() {
    setTranscript('');
    setSttUnrecognized(false);
    setError('');
  }

  function handleModeSwitch(newMode: Mode) {
    setMode(newMode);
    resetState();
  }

  async function handleSttSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile) return;
    setLoading(true);
    resetState();
    try {
      const res = await voiceApi.stt(audioFile, language);
      const data = res.data?.data ?? res.data;
      if (data?.transcript) {
        setTranscript(data.transcript);
      } else {
        setSttUnrecognized(true);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } | string } } };
      const errBody = axiosErr.response?.data?.error;
      const msg =
        typeof errBody === 'object' ? errBody?.message : typeof errBody === 'string' ? errBody : 'Speech recognition failed.';
      setError(msg ?? 'Speech recognition failed.');
      setSttUnrecognized(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleTtsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ttsText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await voiceApi.tts(ttsText.trim(), language);
      const blob = new Blob([res.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
    } catch {
      setError('Text-to-speech conversion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 24 }}>Voice Interaction</h2>

      {/* Language switcher */}
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="language-select" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
          Language
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          style={{ padding: '8px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #ccc', minWidth: 160 }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Mode toggle */}
      <div style={{ marginBottom: 28, display: 'flex', gap: 8 }}>
        {(['voice', 'text'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            style={{
              padding: '8px 20px',
              borderRadius: 4,
              border: '1px solid #2e7d32',
              background: mode === m ? '#2e7d32' : '#fff',
              color: mode === m ? '#fff' : '#2e7d32',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            {m === 'voice' ? '🎤 Voice (STT)' : '🔊 Text (TTS)'}
          </button>
        ))}
      </div>

      {/* STT mode */}
      {mode === 'voice' && (
        <form onSubmit={handleSttSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="audio-file" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Upload audio file
            </label>
            <input
              id="audio-file"
              type="file"
              accept="audio/*"
              onChange={(e) => { setAudioFile(e.target.files?.[0] ?? null); resetState(); }}
              style={{ display: 'block' }}
            />
          </div>
          <button
            type="submit"
            disabled={!audioFile || loading}
            style={{
              padding: '10px 24px',
              background: !audioFile || loading ? '#aaa' : '#2e7d32',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: !audioFile || loading ? 'not-allowed' : 'pointer',
              fontSize: 15,
            }}
          >
            {loading ? 'Processing…' : 'Transcribe'}
          </button>

          {transcript && (
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#f1f8e9', border: '1px solid #aed581', borderRadius: 4 }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>Transcript:</p>
              <p style={{ margin: 0 }}>{transcript}</p>
            </div>
          )}

          {sttUnrecognized && !transcript && (
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4 }}>
              <p style={{ margin: '0 0 8px 0', color: '#7a5c00' }}>
                ⚠ Could not recognize speech. Please try again with a clearer recording.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                Or switch to <button type="button" onClick={() => handleModeSwitch('text')} style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0, fontSize: 13 }}>text input mode</button>.
              </p>
            </div>
          )}
        </form>
      )}

      {/* TTS mode */}
      {mode === 'text' && (
        <form onSubmit={handleTtsSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="tts-text" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
              Enter text to speak
            </label>
            <textarea
              id="tts-text"
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={4}
              placeholder="Type your message here…"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
          <button
            type="submit"
            disabled={!ttsText.trim() || loading}
            style={{
              padding: '10px 24px',
              background: !ttsText.trim() || loading ? '#aaa' : '#2e7d32',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: !ttsText.trim() || loading ? 'not-allowed' : 'pointer',
              fontSize: 15,
            }}
          >
            {loading ? 'Converting…' : '▶ Play Speech'}
          </button>
          {!loading && ttsText.trim() && (
            <p style={{ marginTop: 10, fontSize: 13, color: '#555' }}>Audio will play automatically after conversion.</p>
          )}
        </form>
      )}

      {/* Shared loading indicator */}
      {loading && (
        <p style={{ marginTop: 20, color: '#555' }}>Please wait…</p>
      )}

      {/* Shared error */}
      {error && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: '#fdecea', border: '1px solid #f44336', borderRadius: 4 }}>
          <p style={{ margin: 0, color: '#c62828' }}>{error}</p>
        </div>
      )}

      {onNavigate && (
        <p style={{ marginTop: 32, textAlign: 'center' }}>
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

export default VoicePage;
