import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { backendAPI } from '@/services/backend-api';
import NotificationService from '@/services/notifications';

// Image width logic if needed later
// const { width } = Dimensions.get('window');

// Disease data
const DISEASES = [
  { id: 'alzheimers', name: "Alzheimer's", icon: '🧠', color: '#EF4444', accuracy: 98 },
  { id: 'parkinsons', name: "Parkinson's", icon: '🫀', color: '#F59E0B', accuracy: 96 },
  { id: 'mci', name: 'MCI', icon: '💭', color: '#3B82F6', accuracy: 94 },
  { id: 'vascular', name: 'Vascular', icon: '🩸', color: '#8B5CF6', accuracy: 95 },
  { id: 'ftd', name: 'FTD', icon: '🎭', color: '#EC4899', accuracy: 93 },
  { id: 'lbd', name: 'LBD', icon: '💫', color: '#14B8A6', accuracy: 92 },
];

// Quick action items
const QUICK_ACTIONS = [
  { id: 'neural', title: 'Quick Test', icon: 'analytics', color: '#6366F1', bg: '#EEF2FF', route: '/(tabs)/simple-test' },
  { id: 'scan', title: 'Scan Doc', icon: 'camera', color: '#F59E0B', bg: '#FEF3C7', route: '/(tabs)/document-scan' },
  { id: 'speech', title: 'Speech', icon: 'mic', color: '#EC4899', bg: '#FCE7F3', route: '/(tabs)/speech-test' },
  { id: 'clinical', title: 'Clinical', icon: 'medical', color: '#10B981', bg: '#D1FAE5', route: '/(tabs)/clinical-test' },
  { id: 'trends', title: 'Trends', icon: 'trending-up', color: '#8B5CF6', bg: '#F3E8FF', route: '/progression-dashboard' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Hello');
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({ scans: 0, tests: 0, score: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = React.useCallback(async () => {
    if (!user) return;
    try {
      const statsData = await backendAPI.getStats(user.id);
      if (statsData.success) {
        const byType = statsData.data.byType || [];
        const tests = byType.filter((s: any) => s._id === 'test' || s._id === 'clinical');
        const scanCount = byType.find((s: any) => s._id === 'scan')?.count || 0;
        const totalScoreSum = tests.reduce((acc: number, curr: any) => acc + ((curr.avgScore || 0) * (curr.count || 0)), 0);
        const totalTestCount = tests.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
        
        const avgScore = totalTestCount > 0 
          ? Math.round(totalScoreSum / totalTestCount)
          : 0;

        setStats({
          scans: scanCount,
          tests: totalTestCount,
          score: avgScore
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  const loadUnreadCount = React.useCallback(async () => {
    const count = await NotificationService.getUnreadCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    // Initialize notifications
    NotificationService.initialize();
    loadUnreadCount();
    if (user) loadStats();
  }, [user, loadStats, loadUnreadCount]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const syncUser = React.useCallback(async () => {
    if (!user) return;
    try {
      await backendAPI.createOrUpdateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profileImageUrl: user.imageUrl,
      });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) syncUser();
  }, [user, syncUser]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([
      syncUser(),
      loadStats(),
      loadUnreadCount()
    ]).finally(() => setRefreshing(false));
  }, [syncUser, loadStats, loadUnreadCount]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <Image
              source={{ uri: user?.imageUrl || 'data:image/png;base64,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' }}
              style={styles.avatar}
            />
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#64748B" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroContainer}>
          <LinearGradient
            colors={['#6366F1', '#4F46E5', '#4338CA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Decorative elements */}
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
            
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={12} color="#FCD34D" />
                <Text style={styles.heroBadgeText}>AI Powered</Text>
              </View>
              
              <Text style={styles.heroTitle}>Start Your Brain Health Check</Text>
              <Text style={styles.heroSubtitle}>
                Get AI-powered cognitive assessment in just 5 minutes
              </Text>

              <View style={styles.heroButtons}>
                <TouchableOpacity 
                  style={styles.heroPrimaryBtn}
                  onPress={() => router.push('/(tabs)/document-scan')}
                  activeOpacity={0.9}
                >
                  <MaterialCommunityIcons name="file-document-outline" size={20} color="#6366F1" />
                  <Text style={styles.heroPrimaryText}>Scan Document</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.heroSecondaryBtn}
                  onPress={() => router.push('/(tabs)/clinical-test')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.heroSecondaryText}>Take Test</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroImage}>
              <View style={styles.brainCircle}>
                <MaterialCommunityIcons name="brain" size={50} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsScroll}
          >
            {QUICK_ACTIONS.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Stats Card */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Your Health Stats</Text>
            <TouchableOpacity onPress={() => router.push('/progression-dashboard' as any)}>
              <Text style={styles.seeAll}>View Trends</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="camera-outline" size={20} color="#3B82F6" />
              </View>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statValue}>{loadingStats ? '...' : stats.scans}</Text>
                <Text style={styles.statLabel}>Scans</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statValue}>{loadingStats ? '...' : stats.tests}</Text>
                <Text style={styles.statLabel}>Tests Done</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="trending-up" size={20} color="#F59E0B" />
              </View>
              <View style={styles.statLabelContainer}>
                <Text style={styles.statValue}>{loadingStats ? '...' : `${stats.score}%`}</Text>
                <Text style={styles.statLabel}>Health Score</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Diseases We Detect */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Diseases We Detect</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.diseasesScroll}
          >
            {DISEASES.map((disease, index) => (
              <Animated.View 
                key={disease.id}
                entering={FadeInRight.delay(100 * index)}
              >
                <TouchableOpacity style={styles.diseaseCard} activeOpacity={0.9}>
                  <View style={[styles.diseaseIcon, { backgroundColor: disease.color + '20' }]}>
                    <Text style={{ fontSize: 28 }}>{disease.icon}</Text>
                  </View>
                  <Text style={styles.diseaseName}>{disease.name}</Text>
                  <View style={styles.accuracyBadge}>
                    <Text style={styles.accuracyText}>{disease.accuracy}%</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Tips Card */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.tipCard}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.tipGradient}
          >
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Daily Brain Tip</Text>
              <Text style={styles.tipText}>
                Regular physical exercise can reduce the risk of cognitive decline by up to 30%
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerText: {
    flex: 1,
    marginLeft: 14,
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '700',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  heroContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 200,
  },
  heroDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroContent: {
    flex: 1,
    zIndex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 200,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  heroPrimaryText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 13,
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  heroSecondaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  heroImage: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  brainCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 20,
    marginBottom: 14,
  },
  actionsScroll: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 12,
    paddingBottom: 24,
  },
  actionCard: {
    width: 85,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  statsCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  seeAll: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabelContainer: {
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 14,
  },
  diseasesScroll: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  diseaseCard: {
    backgroundColor: '#fff',
    width: 120,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  diseaseIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  diseaseName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  accuracyBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  tipCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
  },
  tipGradient: {
    flexDirection: 'row',
    padding: 18,
    alignItems: 'center',
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#A16207',
    lineHeight: 18,
  },
});
