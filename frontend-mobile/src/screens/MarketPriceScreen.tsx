import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
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

interface MarketPriceScreenProps {
  onNavigate: (screen: string) => void;
}

const MarketPriceScreen: React.FC<MarketPriceScreenProps> = ({ onNavigate }) => {
  const [crop, setCrop] = useState('');
  const [data, setData] = useState<MarketPriceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function handleSearch() {
    if (!crop.trim()) return;
    setLoading(true);
    setErrorCode('');
    setErrorMessage('');
    setData(null);

    marketApi
      .getPrices(crop.trim())
      .then((res) => {
        setData(res.data?.data ?? res.data);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { error?: { code?: string; message?: string } | string } } };
        const errBody = e.response?.data?.error;
        const code = typeof errBody === 'object' ? errBody?.code ?? '' : '';
        const msg = typeof errBody === 'object' ? errBody?.message ?? 'Market price data unavailable.' : typeof errBody === 'string' ? errBody : 'Market price data unavailable.';
        setErrorCode(code);
        setErrorMessage(msg);
      })
      .finally(() => setLoading(false));
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Market Prices</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={crop}
          onChangeText={setCrop}
          placeholder="Enter crop name (e.g. wheat)"
        />
        <TouchableOpacity
          style={[styles.searchButton, (loading || !crop.trim()) && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={loading || !crop.trim()}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? <Text style={styles.muted}>Loading market prices…</Text> : null}

      {errorCode === 'MARKET_UNAVAILABLE' ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Market price service unavailable. Showing last cached prices if available.</Text>
        </View>
      ) : errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {data && (
        <>
          {data.stale && (
            <View style={styles.staleBox}>
              <Text style={styles.staleText}>⚠️ Price data is older than 24 hours — may not reflect current rates.</Text>
            </View>
          )}

          {data.prices.length === 0 ? (
            <Text style={styles.muted}>No market data found for "{crop}".</Text>
          ) : (
            data.prices.map((mandi, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.mandiName}>{mandi.mandiName}</Text>
                  <Text style={styles.distance}>{mandi.distanceKm} km away</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Min Price</Text>
                  <Text style={styles.rowValue}>₹{mandi.minPrice}/q</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Max Price</Text>
                  <Text style={styles.rowValue}>₹{mandi.maxPrice}/q</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Modal Price</Text>
                  <Text style={[styles.rowValue, { fontWeight: '700' }]}>₹{mandi.modalPrice}/q</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Last Updated</Text>
                  <Text style={[styles.rowValue, { fontSize: 12, color: '#666' }]}>
                    {new Date(mandi.lastUpdated).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
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
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
  },
  searchButton: {
    backgroundColor: '#2980b9',
    paddingHorizontal: 18,
    borderRadius: 6,
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#aaa' },
  searchButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  mandiName: { fontSize: 16, fontWeight: '700' },
  distance: { fontSize: 13, color: '#666' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLabel: { color: '#555', fontSize: 14 },
  rowValue: { fontSize: 14, color: '#333' },
  staleBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  staleText: { color: '#7a5c00', fontSize: 13 },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: 'red', fontSize: 14 },
  muted: { color: '#555', fontSize: 14, marginBottom: 8 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 16 },
});

export default MarketPriceScreen;
