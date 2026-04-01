import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { advisoryApi } from '../api/client';

interface CropRecommendation {
  rank: number;
  cropName: string;
  expectedYieldRange: string;
  waterRequirement: string;
  estimatedInputCost: string;
}

interface CropAdvisoryScreenProps {
  plotId: string;
  onNavigate: (screen: string) => void;
}

const CropAdvisoryScreen: React.FC<CropAdvisoryScreenProps> = ({ plotId, onNavigate }) => {
  const [crops, setCrops] = useState<CropRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  useEffect(() => {
    advisoryApi
      .getCrops(plotId)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setCrops(Array.isArray(data) ? data : data?.crops ?? []);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { error?: { code?: string; message?: string } | string; message?: string } } };
        const errBody = e.response?.data?.error;
        const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
        const msg = typeof errBody === 'object' ? errBody?.message : typeof errBody === 'string' ? errBody : e.response?.data?.message ?? 'Failed to load recommendations.';
        setErrorCode(code);
        setError(msg ?? 'Failed to load recommendations.');
      })
      .finally(() => setLoading(false));
  }, [plotId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading crop recommendations…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crop Recommendations</Text>

      {error ? (
        <View style={styles.warningBox}>
          {errorCode === 'INCOMPLETE_SOIL_PROFILE' ? (
            <Text style={styles.warningText}>
              Soil profile is incomplete. Please complete your soil profile first.
            </Text>
          ) : (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      ) : null}

      {!error && crops.length === 0 ? (
        <Text style={styles.muted}>No recommendations available for this plot.</Text>
      ) : null}

      {crops.map((crop) => (
        <View key={crop.rank} style={styles.card}>
          <Text style={styles.cropName}>{crop.rank}. {crop.cropName}</Text>
          <Text style={styles.row}><Text style={styles.rowLabel}>Expected Yield: </Text>{crop.expectedYieldRange}</Text>
          <Text style={styles.row}><Text style={styles.rowLabel}>Water Requirement: </Text>{crop.waterRequirement}</Text>
          <Text style={styles.row}><Text style={styles.rowLabel}>Input Cost: </Text>{crop.estimatedInputCost}</Text>
        </View>
      ))}

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
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
  },
  cropName: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  row: { fontSize: 14, marginBottom: 4, color: '#333' },
  rowLabel: { color: '#555', fontWeight: '600' },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  warningText: { color: '#7a5c00', fontSize: 14 },
  errorText: { color: 'red', fontSize: 14 },
  muted: { color: '#555', fontSize: 14 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 16 },
});

export default CropAdvisoryScreen;
