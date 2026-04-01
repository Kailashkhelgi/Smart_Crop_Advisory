import axios from 'axios';
import { config } from '../config';
import { query } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  farmerId: string;
  type: string;
  payload: Record<string, unknown>;
  sentAt: Date;
}

// ─── Notification Service ─────────────────────────────────────────────────────

/**
 * Send a weather or frost alert to a farmer via FCM push notification,
 * and persist the notification to the database.
 *
 * FCM failures are logged but do not prevent the notification from being persisted.
 */
export async function sendWeatherAlert(
  farmerId: string,
  alertType: 'weather_alert' | 'frost_alert',
  payload: Record<string, unknown>
): Promise<void> {
  // Look up the farmer's FCM token
  const result = await query<{ fcm_token: string | null }>(
    'SELECT fcm_token FROM farmers WHERE id = $1',
    [farmerId]
  );

  const fcmToken = result.rows[0]?.fcm_token ?? null;

  // Send FCM push notification if token is available
  if (fcmToken) {
    const title = alertType === 'frost_alert' ? 'Frost Alert' : 'Weather Alert';
    const body =
      alertType === 'frost_alert'
        ? 'Frost risk detected for your location. Take protective action.'
        : 'Heavy rainfall forecast for your location. Take protective action.';

    try {
      await axios.post(
        'https://fcm.googleapis.com/fcm/send',
        {
          to: fcmToken,
          notification: { title, body },
          data: payload,
        },
        {
          headers: {
            Authorization: `key=${config.fcmServerKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      console.error('[NotificationService] FCM push failed:', err);
      // Do not rethrow — notification will still be persisted
    }
  }

  // Persist notification to the database
  await query(
    'INSERT INTO notifications (farmer_id, type, payload) VALUES ($1, $2, $3)',
    [farmerId, alertType, JSON.stringify(payload)]
  );
}

/**
 * Retrieve all notifications for a farmer, ordered by most recent first.
 */
export async function getNotifications(farmerId: string): Promise<Notification[]> {
  const result = await query<{
    id: string;
    farmer_id: string;
    type: string;
    payload: Record<string, unknown>;
    sent_at: Date;
  }>(
    'SELECT * FROM notifications WHERE farmer_id = $1 ORDER BY sent_at DESC',
    [farmerId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    farmerId: row.farmer_id,
    type: row.type,
    payload: row.payload,
    sentAt: row.sent_at,
  }));
}
