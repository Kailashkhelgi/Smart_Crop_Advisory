import React, { useState } from 'react';
import { feedbackApi } from '../api/client';

const DISMISSED_KEY = 'dismissedFeedbackSessions';

function getDismissedSessions(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function markSessionDismissed(sessionId: string) {
  const sessions = getDismissedSessions();
  if (!sessions.includes(sessionId)) {
    sessions.push(sessionId);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(sessions));
  }
}

interface FeedbackPromptProps {
  sessionId: string;
}

export default function FeedbackPrompt({ sessionId }: FeedbackPromptProps) {
  const [visible, setVisible] = useState(() => !getDismissedSessions().includes(sessionId));
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  async function handleSubmit() {
    if (!selected || loading) return;
    setLoading(true);
    try {
      await feedbackApi.submit(sessionId, selected);
      markSessionDismissed(sessionId);
      setSubmitted(true);
      setTimeout(() => setVisible(false), 2000);
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
      markSessionDismissed(sessionId);
      setVisible(false);
      setLoading(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px 20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    zIndex: 1000,
    minWidth: '240px',
    fontFamily: 'sans-serif',
  };

  if (submitted) {
    return (
      <div style={containerStyle}>
        <p style={{ margin: 0, color: '#2e7d32', fontWeight: 600 }}>Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>Rate this advice</span>
        <button
          onClick={handleDismiss}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#888',
            lineHeight: 1,
            padding: '0 2px',
          }}
          aria-label="Dismiss feedback"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setSelected(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: star <= (hovered || selected) ? '#f9a825' : '#ccc',
              padding: 0,
              lineHeight: 1,
            }}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected || loading}
        style={{
          background: selected ? '#388e3c' : '#ccc',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '6px 16px',
          cursor: selected ? 'pointer' : 'not-allowed',
          fontSize: '13px',
          fontWeight: 600,
          width: '100%',
        }}
      >
        {loading ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  );
}
