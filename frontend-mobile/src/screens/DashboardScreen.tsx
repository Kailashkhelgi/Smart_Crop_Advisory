import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { dashboardApi } from '../api/client';

interface SessionByType {
  type: string;
  count: number;
}

interface DashboardReport {
  totalSessions: number;
  averageRating: number;
  sessionsByType: SessionByType[];
  totalFeedbackCount: number;
}

interface DashboardScreenProps {
  role: 'officer' | 'admin';
  onNavigate: (screen: string) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ role, onNavigate }) => {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (role !== 'officer' && role !== 'admin') {
      setForbidden(true);
      setLoading(false);
      return;
    }
    dashboardApi
      .getReports(role)
      .then((res) => {
        setReport(res.data?.data ?? res.data);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number; data?: { error?: { message?: string } | string; message?: string } } };
        if (e.response?.status === 403) {
          setForbidden(true);
        } else {
          const errBody = e.response?.data?.error;
          const msg = typeof errBody === 'object' ? errBody?.message : typeof errBody === 'string' ? errBody : e.response?.data?.message ?? 'Failed to load dashboard.';
          setError(msg ?? 'Failed to load dashboard.');
        }
      })
      .finally(() => setLoading(false));
  }, [role]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading dashboard…</Text>
      </View>
    );
  }

  if (forbidden) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.forbiddenBox}>
          <Text style={styles.forbiddenTitle}>403 FORBIDDEN</Text>
          <Text style={styles.forbiddenText}>You do not have permission to view this dashboard.</Text>
        </View>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.link}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{role === 'admin' ? 'Admin' : 'Officer'} Dashboard</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {report && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {typeof report.averageRating === 'number' ? report.averageRating.toFixed(1) : '—'}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{report.totalFeedbackCount}</Text>
              <Text style={styles.statLabel}>Feedback Count</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Sessions by Type</Text>
          {report.sessionsByType && report.sessionsByType.length > 0 ? (
            report.sessionsByType.map((row) => (
              <View key={row.type} style={styles.tableRow}>
                <Text style={styles.tableCell}>{row.type}</Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>{row.count}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No session type data available.</Text>
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
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: 'bold', color: '#2e7d32' },
  statLabel: { fontSize: 12, color: '#555', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableCell: { fontSize: 14, color: '#333' },
  forbiddenBox: { backgroundColor: '#f8d7da', borderWidth: 1, borderColor: '#f5c6cb', borderRadius: 8, padding: 20, marginBottom: 16 },
  forbiddenTitle: { fontSize: 18, fontWeight: 'bold', color: '#721c24', marginBottom: 6 },
  forbiddenText: { color: '#721c24', fontSize: 14 },
  errorBox: { backgroundColor: '#f8d7da', borderWidth: 1, borderColor: '#f5c6cb', borderRadius: 6, padding: 12, marginBottom: 16 },
  errorText: { color: '#721c24', fontSize: 14 },
  muted: { color: '#555', fontSize: 14 },
  link: { color: '#0066cc', textAlign: 'center', marginTop: 16 },
});

export default DashboardScreen;
