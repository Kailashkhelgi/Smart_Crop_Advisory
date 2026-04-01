import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { advisoryApi } from '../api/client';

interface FertilizerEntry {
  type: string;
  quantity: number;
  unit: string;
  timing: string;
}

interface SoilAmendment {
  type: string;
  quantity: number;
  unit: string;
  reason: string;
}

interface FertilizerSchedule {
  schedule: FertilizerEntry[];
  organicAlternatives: FertilizerEntry[];
  soilAmendments: SoilAmendment[];
}

interface FertilizerScreenProps {
  plotId: string;
  cropId: string;
  onNavigate: (screen: string) => void;
}

const FertilizerScreen: React.FC<FertilizerScreenProps> = ({ plotId, cropId, onNavigate }) => {
  const [data, setData] = useState<FertilizerSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  useEffect(() => {
    advisoryApi
      .getFertilizer(plotId, cropId)
      .then((res) => {
        setData(res.data?.data ?? res.data);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { error?: { code?: string; message?: string } | string; message?: string } } };
        const errBody = e.response?.data?.error;
        const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
        const msg = typeof errBody === 'object' ? errBody?.message : typeof errBody === 'string' ? errBody : e.response?.data?.message ?? 'Failed to load fertilizer guidance.';
        setErrorCode(code);
        setError(msg ?? 'Failed to load fertilizer guidance.');
      })
      .finally(() => setLoading(false));
  }, [plotId, cropId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading fertilizer guidance…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Fertilizer Guidance</Text>

      {error ? (
        <View style={styles.warningBox}>
          {errorCode === 'NO_SOIL_PROFILE' ? (
            <Text style={styles.warningText}>No soil profile found. Please create a soil profile first.</Text>
          ) : (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      ) : null}

      {data && (
        <>
          <Text style={styles.sectionTitle}>Chemical Fertilizer Schedule</Text>
          {data.schedule.length === 0 ? (
            <Text style={styles.muted}>No chemical fertilizers recommended.</Text>
          ) : (
            data.schedule.map((item, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{item.type}</Text>
                <Text style={styles.row}><Text style={styles.rowLabel}>Quantity: </Text>{item.quantity} {item.unit}</Text>
                <Text style={styles.row}><Text style={styles.rowLabel}>Timing: </Text>{item.timing}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Organic Alternatives</Text>
          {data.organicAlternatives.length === 0 ? (
            <Text style={styles.muted}>No organic alternatives available.</Text>
          ) : (
            data.organicAlternatives.map((item, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{item.type}</Text>
                <Text style={styles.row}><Text style={styles.rowLabel}>Quantity: </Text>{item.quantity} {item.unit}</Text>
                <Text style={styles.row}><Text style={styles.rowLabel}>Timing: </Text>{item.timing}</Text>
              </View>
            ))
          )}

          {data.soilAmendments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Soil Amendments</Text>
              {data.soilAmendments.map((item, i) => (
                <View key={i} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.type}</Text>
                  <Text style={styles.row}><Text style={styles.rowLabel}>Quantity: </Text>{item.quantity} {item.unit}</Text>
                  <Text style={styles.row}><Text style={styles.rowLabel}>Reason: </Text>{item.reason}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  row: { fontSize: 14, marginBottom: 3, color: '#333' },
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
  muted: { color: '#555', fontSize: 14, marginBottom: 8 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 16 },
});

export default FertilizerScreen;
