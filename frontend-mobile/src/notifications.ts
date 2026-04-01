import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permissions and returns the Expo push token.
 * Returns null if permission is denied or token retrieval fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Sets up foreground and background notification handlers.
 * Routes to the appropriate callback based on notification type.
 */
export function setupNotificationHandlers(
  onWeatherAlert: (data: unknown) => void,
  onFrostAlert: (data: unknown) => void,
): void {
  // Foreground: notification received while app is open
  Notifications.addNotificationReceivedListener((notification) => {
    const type = notification.request.content.data?.type as string | undefined;
    const data = notification.request.content.data;

    if (type === 'weather_alert') {
      onWeatherAlert(data);
    } else if (type === 'frost_alert') {
      onFrostAlert(data);
    }
  });

  // Background / killed: user taps on a notification
  Notifications.addNotificationResponseReceivedListener((response) => {
    const type = response.notification.request.content.data?.type as string | undefined;
    const data = response.notification.request.content.data;

    if (type === 'weather_alert') {
      onWeatherAlert(data);
    } else if (type === 'frost_alert') {
      onFrostAlert(data);
    }
  });
}
