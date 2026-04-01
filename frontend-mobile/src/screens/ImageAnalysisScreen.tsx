import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
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

interface ImageAnalysisScreenProps {
  onNavigate: (screen: string) => void;
}

const LOW_CONFIDENCE_THRESHOLD = 60;

const ImageAnalysisScreen: React.FC<ImageAnalysisScreenProps> = ({ onNavigate }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // On Expo, image picking requires expo-image-picker. We simulate the interface here.
  // In a real app, call ImagePicker.launchImageLibraryAsync() and set the uri.
  function handlePickImage() {
    // Placeholder: in production use expo-image-picker
    // ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images })
    //   .then(result => { if (!result.canceled) setImageUri(result.assets[0].uri); });
    setError('Image picker requires expo-image-picker. Integrate it to select images.');
  }

  async function handleAnalyze() {
    if (!imageUri) return;
    setLoading(true);
    setResult(null);
    setError('');
    setErrorCode('');
    try {
      const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const res = await imageApi.analyze({ uri: imageUri, name: imageName || `crop.${ext}`, type: mimeType });
      setResult(res.data?.data ?? res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { code?: string; message?: string } | string; message?: string } } };
      const errBody = e.response?.data?.error;
      const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
      const msg = typeof errBody === 'object' ? errBody?.message : typeof errBody === 'string' ? errBody : e.response?.data?.message ?? 'Analysis failed.';
      setErrorCode(code);
      setError(msg ?? 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  }

  function displayError(): string {
    if (errorCode === 'UNSUPPORTED_MEDIA_TYPE') return 'Unsupported format. Please upload JPEG or PNG.';
    if (errorCode === 'PAYLOAD_TOO_LARGE') return 'Image too large. Max 10 MB.';
    if (errorCode === 'VISION_ENGINE_UNAVAILABLE') return 'Image analysis service unavailable. Try again later.';
    return error;
  }

  const isLowConfidence = result && result.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pest & Disease Detection</Text>

      <TouchableOpacity style={styles.pickButton} onPress={handlePickImage}>
        <Text style={styles.pickButtonText}>📷 Pick Crop Image</Text>
      </TouchableOpacity>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      ) : null}

      <TouchableOpacity
        style={[styles.button, (!imageUri || loading) && styles.buttonDisabled]}
        onPress={handleAnalyze}
        disabled={!imageUri || loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Analyzing…' : 'Analyze Image'}</Text>
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{displayError()}</Text>
        </View>
      ) : null}

      {result && (
        <>
          <View style={styles.card}>
            <Text style={styles.diagnosisName}>{result.pestOrDiseaseName}</Text>
            <Text style={styles.confidence}>Confidence: {result.confidence}%</Text>
            {isLowConfidence && (
              <View style={styles.lowConfBox}>
                <Text style={styles.lowConfText}>⚠ Low confidence — consult an Extension Officer.</Text>
              </View>
            )}
          </View>

          {result.chemicalTreatments?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Chemical Treatments</Text>
              {result.chemicalTreatments.map((t, i) => (
                <View key={i} style={styles.treatmentCard}>
                  <Text style={styles.treatmentName}>{t.name}</Text>
                  <Text style={styles.treatmentDetail}>Dosage: {t.dosage}</Text>
                  <Text style={styles.treatmentDetail}>Method: {t.method}</Text>
                </View>
              ))}
            </>
          )}

          {result.organicTreatments?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Organic Treatments</Text>
              {result.organicTreatments.map((t, i) => (
                <View key={i} style={styles.treatmentCard}>
                  <Text style={styles.treatmentName}>{t.name}</Text>
                  <Text style={styles.treatmentDetail}>Dosage: {t.dosage}</Text>
                  <Text style={styles.treatmentDetail}>Method: {t.method}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}

      <TouchableOpacity onPress={() => onNavigate('home')}>
        <Text style={styles.link}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  pickButton: {
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  pickButtonText: { color: '#2e7d32', fontSize: 15, fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 14 },
  button: {
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonDisabled: { backgroundColor: '#aaa' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorBox: {
    backgroundColor: '#fdecea',
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#c62828', fontSize: 14 },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
  },
  diagnosisName: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  confidence: { fontSize: 14, color: '#555', marginBottom: 6 },
  lowConfBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  lowConfText: { color: '#7a5c00', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  treatmentCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  treatmentName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  treatmentDetail: { fontSize: 13, color: '#555', marginBottom: 2 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 16 },
});

export default ImageAnalysisScreen;
