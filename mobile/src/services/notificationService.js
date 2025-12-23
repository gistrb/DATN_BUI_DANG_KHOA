import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Work start time configuration (8:30 AM)
const WORK_START_HOUR = 8;
const WORK_START_MINUTE = 30;
const REMINDER_MINUTES_BEFORE = 15;

/**
 * Initialize notifications and request permissions
 * @returns {Promise<boolean>} - Whether permissions were granted
 */
export const initializeNotifications = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Set notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('attendance', {
        name: 'Attendance Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
        sound: 'default',
      });
    }

    console.log('Notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};

/**
 * Register for push notifications and get device token
 * @returns {Promise<string|null>} - Device push token or null if failed
 */
export const registerForPushNotifications = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Try to get device push token (FCM token for Android)
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      console.log('FCM Device Token:', deviceToken.data);
      return deviceToken.data; // This is the actual FCM token
    } catch (deviceTokenError) {
      console.warn('Could not get device push token:', deviceTokenError.message);
      
      // Fallback to Expo Push Token
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId 
          || Constants.easConfig?.projectId
          || Constants.manifest?.extra?.eas?.projectId;
        
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        console.log('Expo Push Token:', tokenData.data);
        return tokenData.data;
      } catch (expoTokenError) {
        console.warn('Could not get Expo push token:', expoTokenError.message);
        console.log('Push notifications require proper FCM setup.');
        console.log('Local scheduled notifications are still functional.');
        return null;
      }
    }
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Schedule daily reminder notification at 8:15 AM (15 minutes before work starts)
 * Excludes Sunday (day 1 in JS)
 */
export const scheduleDailyReminder = async () => {
  try {
    // Cancel existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const reminderHour = WORK_START_HOUR;
    const reminderMinute = WORK_START_MINUTE - REMINDER_MINUTES_BEFORE;

    // Schedule for Monday to Saturday (weekday 2-7 in expo-notifications)
    // Sunday = 1, Monday = 2, ..., Saturday = 7
    for (let weekday = 2; weekday <= 7; weekday++) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Nhắc nhở chấm công',
          body: `Còn ${REMINDER_MINUTES_BEFORE} phút nữa là đến giờ làm việc!`,
          data: { type: 'daily_reminder' },
          sound: 'default',
        },
        trigger: {
          type: 'weekly',
          weekday: weekday,
          hour: reminderHour,
          minute: reminderMinute,
          channelId: 'attendance',
        },
      });
    }

    console.log(`Scheduled daily reminders at ${reminderHour}:${reminderMinute.toString().padStart(2, '0')} (Mon-Sat)`);
    return true;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return false;
  }
};

/**
 * Show immediate notification for successful attendance
 * @param {string} type - 'check_in' or 'check_out'
 * @param {string} time - The time of attendance (e.g., '08:25')
 */
export const showAttendanceSuccess = async (type, time) => {
  try {
    const isCheckIn = type === 'check_in';
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isCheckIn ? '✅ Check-in thành công!' : '✅ Check-out thành công!',
        body: isCheckIn 
          ? `Bạn đã check-in lúc ${time}. Chúc bạn một ngày làm việc hiệu quả!`
          : `Bạn đã check-out lúc ${time}. Hẹn gặp lại ngày mai!`,
        data: { type: 'attendance_success', attendanceType: type },
        sound: 'default',
      },
      trigger: null, // Show immediately
    });

    console.log(`Showed ${type} success notification at ${time}`);
    return true;
  } catch (error) {
    console.error('Error showing attendance notification:', error);
    return false;
  }
};

/**
 * Cancel all scheduled notifications (call on logout)
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications cancelled');
    return true;
  } catch (error) {
    console.error('Error cancelling notifications:', error);
    return false;
  }
};

/**
 * Get all scheduled notifications (for debugging)
 */
export const getScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Scheduled notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};
