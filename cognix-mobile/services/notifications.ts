// Notification Service - Local Notifications and In-App Notifications
// Note: Push notifications require a development build, not Expo Go
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'scan' | 'test' | 'reminder' | 'info';
  data?: any;
  read: boolean;
  createdAt: string;
}

class NotificationService {
  private isInitialized = false;

  /**
   * Initialize notifications (local only - works in Expo Go)
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });

        await Notifications.setNotificationChannelAsync('results', {
          name: 'Test Results',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });
      }

      this.isInitialized = true;
      console.log('✅ Local notifications initialized');
      return true;
    } catch (error) {
      console.log('Notification init skipped (expected in Expo Go)');
      return false;
    }
  }

  /**
   * Send a local notification
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any,
    type: 'scan' | 'test' | 'reminder' | 'info' = 'info'
  ): Promise<string | null> {
    try {
      // Ensure initialized
      await this.initialize();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { ...data, type },
          sound: true,
          badge: 1,
        },
        trigger: null, // Send immediately
      });

      // Save to in-app notifications
      await this.saveNotification({
        id: notificationId,
        title,
        body,
        type,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      });

      console.log('📬 Notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      // Silently save to in-app even if push fails
      const fallbackId = `notif_${Date.now()}`;
      await this.saveNotification({
        id: fallbackId,
        title,
        body,
        type,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      });
      console.log('📬 In-app notification saved:', fallbackId);
      return fallbackId;
    }
  }

  /**
   * Send test completion notification
   */
  async sendTestCompleteNotification(
    testType: string,
    score: number,
    riskLevel: string,
    disease?: string
  ): Promise<void> {
    const title = '🧠 Test Complete!';
    let body = `Your ${testType} score: ${score.toFixed(0)}%. Risk Level: ${riskLevel}`;
    
    if (disease && disease !== 'NORMAL') {
      body = `${testType} completed. Prediction: ${disease}. Risk: ${riskLevel}`;
    }

    await this.sendLocalNotification(title, body, {
      testType,
      score,
      riskLevel,
      disease,
    }, 'test');
  }

  /**
   * Send scan complete notification
   */
  async sendScanCompleteNotification(
    documentType: string,
    disease: string,
    riskLevel: string,
    confidence: number
  ): Promise<void> {
    const title = '📄 Scan Analysis Complete!';
    const body = `Document: ${documentType}. Prediction: ${disease} (${(confidence * 100).toFixed(0)}% confidence). Risk: ${riskLevel}`;

    await this.sendLocalNotification(title, body, {
      documentType,
      disease,
      riskLevel,
      confidence,
    }, 'scan');
  }

  /**
   * Schedule a reminder notification
   */
  async scheduleReminder(
    title: string,
    body: string,
    secondsFromNow: number
  ): Promise<string | null> {
    try {
      await this.initialize();
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          seconds: secondsFromNow,
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        },
      });

      console.log('⏰ Reminder scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.log('Reminder scheduling skipped');
      return null;
    }
  }

  /**
   * Save notification to AsyncStorage for in-app display
   */
  private async saveNotification(notification: NotificationItem): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      const notifications: NotificationItem[] = stored ? JSON.parse(stored) : [];
      
      // Add new notification at the beginning
      notifications.unshift(notification);
      
      // Keep only last 50 notifications
      const trimmed = notifications.slice(0, 50);
      
      await AsyncStorage.setItem('notifications', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  /**
   * Get all in-app notifications
   */
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const updated = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getNotifications();
      const updated = notifications.map(n => ({ ...n, read: true }));
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
      try {
        await Notifications.setBadgeCountAsync(0);
      } catch {}
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem('notifications');
      try {
        await Notifications.dismissAllNotificationsAsync();
        await Notifications.setBadgeCountAsync(0);
      } catch {}
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {}
  }
}

export default new NotificationService();
