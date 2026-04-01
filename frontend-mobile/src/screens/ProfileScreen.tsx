import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { farmerApi } from '../api/client';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'pa', label: 'Punjabi' },
];

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [preferredLang, setPreferredLang] = useState('en');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [landSizeAcres, setLandSizeAcres] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    farmerApi
      .getProfile()
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setName(d.name ?? '');
        setPreferredLang(d.preferredLang ?? 'en');
        setVillage(d.village ?? '');
        setDistrict(d.district ?? '');
        setState(d.state ?? '');
        setLandSizeAcres(d.landSizeAcres != null ? String(d.landSizeAcres) : '');
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await farmerApi.updateProfile({
        name,
        preferredLang,
        village,
        district,
        state,
        landSizeAcres: landSizeAcres !== '' ? Number(landSizeAcres) : undefined,
      });
      setSuccess('Profile saved.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setError(e.response?.data?.error || e.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading profile…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />

      <Text style={styles.label}>Preferred Language</Text>
      <View style={styles.langRow}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity
            key={l.value}
            style={[styles.langBtn, preferredLang === l.value && styles.langBtnActive]}
            onPress={() => setPreferredLang(l.value)}
          >
            <Text style={[styles.langBtnText, preferredLang === l.value && styles.langBtnTextActive]}>
              {l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Village</Text>
      <TextInput style={styles.input} value={village} onChangeText={setVillage} placeholder="Village name" />

      <Text style={styles.label}>District</Text>
      <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="District name" />

      <Text style={styles.label}>State</Text>
      <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="State name" />

      <Text style={styles.label}>Land Size (acres)</Text>
      <TextInput
        style={styles.input}
        value={landSizeAcres}
        onChangeText={setLandSizeAcres}
        placeholder="e.g. 2.5"
        keyboardType="decimal-pad"
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onNavigate('home')}>
        <Text style={styles.link}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  langBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2e7d32',
  },
  langBtnActive: { backgroundColor: '#2e7d32' },
  langBtnText: { color: '#2e7d32', fontSize: 13 },
  langBtnTextActive: { color: '#fff' },
  button: {
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  buttonDisabled: { backgroundColor: '#aaa' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: 'red', marginBottom: 10, fontSize: 13 },
  success: { color: '#2e7d32', marginBottom: 10, fontSize: 13 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 8 },
});

export default ProfileScreen;
