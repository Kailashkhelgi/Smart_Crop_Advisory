import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { soilApi } from '../api/client';

interface SoilProfileScreenProps {
  profileId?: string;
  onNavigate: (screen: string) => void;
}

const SoilProfileScreen: React.FC<SoilProfileScreenProps> = ({ profileId, onNavigate }) => {
  const [plotName, setPlotName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [soilType, setSoilType] = useState('');
  const [ph, setPh] = useState('');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function validate(): string | null {
    if (!plotName.trim()) return 'Plot name is required.';
    const latN = parseFloat(lat);
    if (isNaN(latN) || latN < -90 || latN > 90) return 'Latitude must be between -90 and 90.';
    const lonN = parseFloat(lon);
    if (isNaN(lonN) || lonN < -180 || lonN > 180) return 'Longitude must be between -180 and 180.';
    if (!soilType.trim()) return 'Soil type is required.';
    const phN = parseFloat(ph);
    if (isNaN(phN) || phN < 0 || phN > 14) return 'pH must be between 0 and 14.';
    if (isNaN(parseFloat(nitrogen)) || parseFloat(nitrogen) < 0) return 'Nitrogen must be non-negative.';
    if (isNaN(parseFloat(phosphorus)) || parseFloat(phosphorus) < 0) return 'Phosphorus must be non-negative.';
    if (isNaN(parseFloat(potassium)) || parseFloat(potassium) < 0) return 'Potassium must be non-negative.';
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setSuccess('');
    setError('');
    const payload = {
      plotName: plotName.trim(),
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      soilType: soilType.trim(),
      ph: parseFloat(ph),
      nitrogen: parseFloat(nitrogen),
      phosphorus: parseFloat(phosphorus),
      potassium: parseFloat(potassium),
    };
    try {
      if (profileId) {
        await soilApi.update(profileId, payload);
        setSuccess('Soil profile updated.');
      } else {
        await soilApi.create(payload);
        setSuccess('Soil profile created.');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      setError(e.response?.data?.error || e.response?.data?.message || 'Failed to save soil profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{profileId ? 'Edit Soil Profile' : 'Add Soil Profile'}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Text style={styles.label}>Plot Name</Text>
      <TextInput style={styles.input} value={plotName} onChangeText={setPlotName} placeholder="e.g. North Field" />

      <Text style={styles.label}>Latitude</Text>
      <TextInput style={styles.input} value={lat} onChangeText={setLat} placeholder="e.g. 30.7333" keyboardType="decimal-pad" />

      <Text style={styles.label}>Longitude</Text>
      <TextInput style={styles.input} value={lon} onChangeText={setLon} placeholder="e.g. 76.7794" keyboardType="decimal-pad" />

      <Text style={styles.label}>Soil Type</Text>
      <TextInput style={styles.input} value={soilType} onChangeText={setSoilType} placeholder="e.g. Loamy, Sandy, Clay" />

      <Text style={styles.label}>pH (0–14)</Text>
      <TextInput style={styles.input} value={ph} onChangeText={setPh} placeholder="e.g. 6.5" keyboardType="decimal-pad" />

      <Text style={styles.label}>Nitrogen (kg/acre)</Text>
      <TextInput style={styles.input} value={nitrogen} onChangeText={setNitrogen} placeholder="e.g. 40" keyboardType="decimal-pad" />

      <Text style={styles.label}>Phosphorus (kg/acre)</Text>
      <TextInput style={styles.input} value={phosphorus} onChangeText={setPhosphorus} placeholder="e.g. 20" keyboardType="decimal-pad" />

      <Text style={styles.label}>Potassium (kg/acre)</Text>
      <TextInput style={styles.input} value={potassium} onChangeText={setPotassium} placeholder="e.g. 30" keyboardType="decimal-pad" />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : profileId ? 'Update Profile' : 'Create Profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onNavigate('home')}>
        <Text style={styles.link}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
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

export default SoilProfileScreen;
