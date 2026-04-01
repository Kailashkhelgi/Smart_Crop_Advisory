import crypto from 'crypto';
import { query } from '../db';
import { AppError } from './userService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvisorySession {
  id: string;
  farmerHash: string;
  sessionType: string;
  inputParams: Record<string, unknown>;
  recommendation: Record<string, unknown>;
  createdAt: Date;
}

export interface Feedback {
  id: string;
  advisorySessionId: string;
  rating: number | null;
  dismissed: boolean;
  createdAt: Date;
}

export interface AggregatedReport {
  totalSessions: number;
  averageRating: number | null;
  sessionsByType: Record<string, number>;
  feedbackCount: number;
}

// ─── FeedbackService ──────────────────────────────────────────────────────────

/**
 * Record an advisory session.
 * The farmerId is anonymised via SHA-256 before storage (Requirement 9.2, 9.3).
 */
export async function recordSession(
  farmerId: string,
  sessionType: string,
  inputParams: Record<string, unknown>,
  recommendation: Record<string, unknown>
): Promise<AdvisorySession> {
  const farmerHash = crypto.createHash('sha256').update(farmerId).digest('hex');

  const result = await query<{
    id: string;
    farmer_hash: string;
    session_type: string;
    input_params: Record<string, unknown>;
    recommendation: Record<string, unknown>;
    created_at: Date;
  }>(
    `INSERT INTO advisory_sessions (farmer_hash, session_type, input_params, recommendation)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [farmerHash, sessionType, JSON.stringify(inputParams), JSON.stringify(recommendation)]
  );

  return rowToSession(result.rows[0]);
}

/**
 * Submit a rating for an advisory session (Requirement 9.1, 9.3).
 * Rating must be between 1 and 5 inclusive.
 */
export async function submitFeedback(sessionId: string, rating: number): Promise<Feedback> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('VALIDATION_ERROR', 'Rating must be an integer between 1 and 5', 'rating');
  }

  const result = await query<{
    id: string;
    advisory_session_id: string;
    rating: number | null;
    dismissed: boolean;
    created_at: Date;
  }>(
    `INSERT INTO feedback (advisory_session_id, rating)
     VALUES ($1, $2)
     RETURNING *`,
    [sessionId, rating]
  );

  return rowToFeedback(result.rows[0]);
}

/**
 * Dismiss the feedback prompt for an advisory session (Requirement 9.5).
 * Updates an existing feedback row or inserts a new dismissed row.
 */
export async function dismissFeedback(sessionId: string): Promise<void> {
  const existing = await query<{ id: string }>(
    'SELECT id FROM feedback WHERE advisory_session_id = $1',
    [sessionId]
  );

  if (existing.rows.length > 0) {
    await query(
      'UPDATE feedback SET dismissed = true WHERE advisory_session_id = $1',
      [sessionId]
    );
  } else {
    await query(
      `INSERT INTO feedback (advisory_session_id, dismissed) VALUES ($1, true)`,
      [sessionId]
    );
  }
}

/**
 * Return aggregated usage and feedback stats for the dashboard (Requirement 9.4).
 * No PII is included — farmer identity is only stored as a hash.
 */
export async function getAggregatedReports(): Promise<AggregatedReport> {
  const [sessionsResult, feedbackResult, byTypeResult] = await Promise.all([
    query<{ total: string }>('SELECT COUNT(*) AS total FROM advisory_sessions'),
    query<{ avg_rating: string | null; feedback_count: string }>(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS feedback_count FROM feedback'
    ),
    query<{ session_type: string; count: string }>(
      'SELECT session_type, COUNT(*) AS count FROM advisory_sessions GROUP BY session_type'
    ),
  ]);

  const totalSessions = parseInt(sessionsResult.rows[0].total, 10);
  const avgRatingRaw = feedbackResult.rows[0].avg_rating;
  const averageRating = avgRatingRaw != null ? parseFloat(avgRatingRaw) : null;
  const feedbackCount = parseInt(feedbackResult.rows[0].feedback_count, 10);

  const sessionsByType: Record<string, number> = {};
  for (const row of byTypeResult.rows) {
    sessionsByType[row.session_type] = parseInt(row.count, 10);
  }

  return { totalSessions, averageRating, sessionsByType, feedbackCount };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToSession(row: {
  id: string;
  farmer_hash: string;
  session_type: string;
  input_params: Record<string, unknown>;
  recommendation: Record<string, unknown>;
  created_at: Date;
}): AdvisorySession {
  return {
    id: row.id,
    farmerHash: row.farmer_hash,
    sessionType: row.session_type,
    inputParams: row.input_params,
    recommendation: row.recommendation,
    createdAt: row.created_at,
  };
}

function rowToFeedback(row: {
  id: string;
  advisory_session_id: string;
  rating: number | null;
  dismissed: boolean;
  created_at: Date;
}): Feedback {
  return {
    id: row.id,
    advisorySessionId: row.advisory_session_id,
    rating: row.rating,
    dismissed: row.dismissed,
    createdAt: row.created_at,
  };
}
