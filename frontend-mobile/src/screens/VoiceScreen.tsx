import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { voiceApi } from '../api/client';

type Language = 'en' | 'hi' | 'pa';
type Mode = 'voice' | 'text';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pa', label: 'Punjabi' },
];

interface VoiceScreenProps {
  onNavigate: (screen: string) => void;
}

const VoiceScreen: React.FC<VoiceScreenProps> = ({ onNavigate }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [mode, setMode] = useState<Mode>('voice');
  const [ttsText, setTtsText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [sttUnrecognized, setSttUnrecognized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function resetState() {
    setTranscript('');
    setSttUnrecognized(false);
    setError('');
  }

  // STT: In a real app, record audio with expo-av and pass the blob.
  // Here we show the UI and indicate the integration point.
  async function handleStt() {
    setLoading(true);
    resetState();
    try {
      // Placeholder: replace audioBlob with actual recorded audio
      const audioBlob = new Blob([], { type: 'audio/wav' });
      const res = await voiceApi.stt(audioBlob, language);
      const data = res.data?.data ?? res.data;
      if (data?.transcript) {
        setTranscript(data.transcript);
      } else {
        setSttUnrecognized(true);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } | string } } };
      const errBody = e.response?.data?.error;
      const msg = typeof errBody === 'object' ? errBody?.message : typeof errBody === 'string' ? errBody : 'Speech recognition failed.';
      setError(msg ?? 'Speech recognition failed.');
      setSttUnrecognized(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleTts() {
    if (!ttsText.trim()) return;
    setLoading(true);
    setError('');
    try {
      await voiceApi.tts(ttsText.trim(), language);
      // In a real app, play the returned audio blob with expo-av
    } catch {
      setError('Text-to-speech conversion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Voice Interaction</Text>

      <Text style={styles.label}>Language</Text>
      <View style={styles.langRow}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity
            key={l.value}
            style={[styles.langBtn, language === l.value && styles.langBtnActive]}
            onPress={() => setLanguage(l.value)}
          >
            <Text style={[styles.langBtnText, language === l.value && styles.langBtnTextActive]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.modeRow}>
        {(['voice', 'text'] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => { setMode(m); resetState(); }}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {m === 'voice' ? '🎤 Voice (STT)' : '🔊 Text (TTS)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'voice' && (
        <>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleStt}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Processing…' : 'Transcribe Audio'}</Text>
          </TouchableOpacity>
          {transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>Transcript:</Text>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          ) : null}
          {sttUnrecognized && !transcript ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠ Could not recognize speech. Please try again.</Text>
              <TouchableOpacity onPress={() => { setMode('text'); resetState(); }}>
                <Text style={styles.link}>Switch to text input</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}

      {mode === 'text' && (
        <>
          <Text style={styles.label}>Enter text to speak</Text>
          <TextInput
            style={styles.textArea}
            value={ttsText}
            onChangeText={setTtsText}
            placeholder="Type your message here…"
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.button, (!ttsText.trim() || loading) && styles.buttonDisabled]}
            onPress={handleTts}
            disabled={!ttsText.trim() || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Converting…' : '▶ Play Speech'}</Text>
          </TouchableOpacity>
        </>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity onPress={() => onNavigate('home')}>
        <Text style={styles.link}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  langBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: '#2e7d32' },
  langBtnActive: { backgroundColor: '#2e7d32' },
  langBtnText: { color: '#2e7d32', fontSize: 13 },
  langBtnTextActive: { color: '#fff' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#2e7d32', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#2e7d32' },
  modeBtnText: { color: '#2e7d32', fontSize: 13, fontWeight: '600' },
  modeBtnTextActive: { color: '#fff' },
  button: { backgroundColor: '#2e7d32', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 14 },
  buttonDisabled: { backgroundColor: '#aaa' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  textArea: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, fontSize: 15, marginBottom: 12, minHeight: 100, textAlignVertical: 'top' },
  transcriptBox: { backgroundColor: '#f1f8e9', borderWidth: 1, borderColor: '#aed581', borderRadius: 6, padding: 14, marginBottom: 14 },
  transcriptLabel: { fontWeight: '700', marginBottom: 4 },
  transcriptText: { fontSize: 14 },
  warningBox: { backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffc107', borderRadius: 6, padding: 12, marginBottom: 14 },
  warningText: { color: '#7a5c00', fontSize: 13, marginBottom: 6 },
  errorBox: { backgroundColor: '#fdecea', borderWidth: 1, borderColor: '#f44336', borderRadius: 6, padding: 12, marginBottom: 14 },
  errorText: { color: '#c62828', fontSize: 14 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 8 },
});

export default VoiceScreen;
