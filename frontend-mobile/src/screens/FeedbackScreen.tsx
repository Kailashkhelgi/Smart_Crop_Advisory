import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { feedbackApi } from '../api/client';

interface FeedbackScreenProps {
  sessionId: string;
  onDismiss: () => void;
}

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ sessionId, onDismiss }) => {
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!selected || loading) return;
    setLoading(true);
    try {
      await feedbackApi.submit(sessionId, selected);
      setSubmitted(true);
      setTimeout(onDismiss, 1500);
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    if (loading) return;
    setLoading(true);
    try {
      await feedbackApi.dismiss(sessionId);
    } finally {
      onDismiss();
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.thanks}>Thanks for your feedback!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rate this advice</Text>
        <TouchableOpacity onPress={handleDismiss} disabled={loading}>
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setSelected(star)}>
            <Text style={[styles.star, star <= selected && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !selected && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!selected || loading}
      >
        <Text style={styles.submitText}>{loading ? 'Submitting…' : 'Submit'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 240,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 15, fontWeight: '700', color: '#333' },
  dismiss: { fontSize: 18, color: '#888', paddingHorizontal: 4 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  star: { fontSize: 32, color: '#ccc' },
  starActive: { color: '#f9a825' },
  submitButton: { backgroundColor: '#388e3c', padding: 10, borderRadius: 6, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  thanks: { color: '#2e7d32', fontWeight: '700', fontSize: 15, textAlign: 'center' },
});

export default FeedbackScreen;
