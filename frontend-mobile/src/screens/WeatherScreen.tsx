import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { weatherApi } from '../api/client';

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall24h: number;
  frostRisk: boolean;
  lastUpdated: string;
}

interface WeatherScreenProps {
  lat: number;
  lon: number;
  onNavigate: (screen: string) => void;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function isStale(lastUpdated: string): boolean {
  return Date.now() - new Date(lastUpdated).getTime() > SIX_HOURS_MS;
}

const WeatherScreen: React.FC<WeatherScreenProps> = ({ lat, lon, onNavigate }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    weatherApi
      .get(lat, lon)
      .then((res) => {
        setData(res.data?.data ?? res.data);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { error?: { code?: string; message?: string } | string } } };
        const errBody = e.response?.data?.error;
        const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
        const msg = typeof errBody === 'object' ? errBody?.message ?? 'Weather data unavailable.' : typeof errBody === 'string' ? errBody : 'Weather data unavailable.';
        setErrorCode(code);
        setErrorMessage(msg);
      })
      .finally(() => setLoading(false));
  }, [lat, lon]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading weather data…</Text>
      </View>
    );
  }

  if (errorCode === 'WEATHER_UNAVAILABLE') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Weather Alerts</Text>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Weather data is temporarily unavailable. Please try again later.</Text>
        </View>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.link}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!data) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Weather Alerts</Text>
        <Text style={styles.errorText}>{errorMessage || 'Failed to load weather data.'}</Text>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.link}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const stale = isStale(data.lastUpdated);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Weather Alerts</Text>

      {stale && (
        <View style={styles.staleBox}>
          <Text style={styles.staleText}>⚠️ Weather data temporarily unavailable — showing last known forecast</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Temperature</Text>
          <Text style={styles.rowValue}>{data.temperature} °C</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Humidity</Text>
          <Text style={styles.rowValue}>{data.humidity} %</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Rainfall (next 24h)</Text>
          <Text style={styles.rowValue}>{data.rainfall24h.toFixed(1)} mm</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Frost Risk</Text>
          <Text style={[styles.rowValue, { color: data.frostRisk ? '#c0392b' : '#27ae60', fontWeight: '700' }]}>
            {data.frostRisk ? '⚠️ Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Last Updated</Text>
          <Text style={[styles.rowValue, { fontSize: 12, color: '#666' }]}>
            {new Date(data.lastUpdated).toLocaleString()}
          </Text>
        </View>
      </View>

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
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLabel: { color: '#555', fontSize: 14 },
  rowValue: { fontSize: 14, color: '#333' },
  staleBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  staleText: { color: '#7a5c00', fontSize: 13 },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: 'red', fontSize: 14 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 16 },
});

export default WeatherScreen;
