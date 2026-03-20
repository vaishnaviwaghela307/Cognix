import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import NotificationService, { NotificationItem } from '../services/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    const notifs = await NotificationService.getNotifications();
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const handleMarkAllRead = async () => {
    await NotificationService.markAllAsRead();
    await loadNotifications();
  };

  const handleClearAll = async () => {
    await NotificationService.clearAll();
    setNotifications([]);
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    await NotificationService.markAsRead(notification.id);
    await loadNotifications();
    
    // Navigate based on notification type
    if (notification.type === 'scan') {
      router.push('/(tabs)/document-scan');
    } else if (notification.type === 'test') {
      router.push('/(tabs)/history');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'scan':
        return { name: 'document-text', color: '#8B5CF6', bg: '#F3E8FF' };
      case 'test':
        return { name: 'brain', color: '#6366F1', bg: '#EEF2FF' };
      case 'reminder':
        return { name: 'alarm', color: '#F59E0B', bg: '#FEF3C7' };
      default:
        return { name: 'information-circle', color: '#3B82F6', bg: '#DBEAFE' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.countText}>
            {notifications.filter(n => !n.read).length} unread
          </Text>
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {notifications.length === 0 ? (
          <Animated.View entering={FadeInDown} style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You'll receive notifications after completing tests and document scans
            </Text>
          </Animated.View>
        ) : (
          notifications.map((notification, index) => {
            const iconConfig = getIcon(notification.type);
            return (
              <Animated.View
                key={notification.id}
                entering={FadeInRight.delay(index * 50)}
              >
                <TouchableOpacity
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.unreadCard
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                    {notification.type === 'test' ? (
                      <MaterialCommunityIcons name="brain" size={24} color={iconConfig.color} />
                    ) : (
                      <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
                    )}
                  </View>
                  
                  <View style={styles.contentContainer}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationBody} numberOfLines={2}>
                      {notification.body}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.createdAt)}
                    </Text>
                  </View>

                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  countText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  clearText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#FAFBFF',
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
    marginLeft: 8,
    alignSelf: 'center',
  },
});
