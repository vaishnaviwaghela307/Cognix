import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  StatusBar,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HistoryService from '../../services/history';
import useAppLanguage, { languageNames, Language } from '../../services/language';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { language, setLanguage, t } = useAppLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [stats, setStats] = useState({ tests: 0, reports: 0, scans: 0 });
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const loadStats = React.useCallback(async () => {
    if (!user?.id) return;
    const result = await HistoryService.getStats(user.id);
    if (result.success && result.data) {
      const byType = result.data.byType || [];
      setStats({
        tests: (byType.find((t: any) => t._id === 'test')?.count || 0) + 
               (byType.find((t: any) => t._id === 'clinical')?.count || 0),
        reports: byType.find((t: any) => t._id === 'report')?.count || 0,
        scans: byType.find((t: any) => t._id === 'scan')?.count || 0,
      });
    }
  }, [user?.id]);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, [loadStats]);

  const loadSettings = async () => {
    const notifSetting = await AsyncStorage.getItem('@notifications_enabled');
    if (notifSetting !== null) {
      setNotificationsEnabled(JSON.parse(notifSetting));
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('@notifications_enabled', JSON.stringify(value));
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => signOut()
        }
      ]
    );
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { 
          icon: 'medical', 
          label: 'Medical History', 
          color: '#10B981', 
          bg: '#D1FAE5',
          onPress: () => router.push('/(tabs)/history'),
        },
        { 
          icon: 'people', 
          label: 'Family & Caregiver', 
          color: '#8B5CF6', 
          bg: '#F3E8FF',
          description: 'Manage shared health access',
          onPress: () => router.push('/caregiver-mode'),
        },
        { 
          icon: 'document-text', 
          label: 'Test Reports', 
          color: '#F59E0B', 
          bg: '#FEF3C7',
          onPress: () => router.push('/test-reports'),
        },
      ]
    },
    {
      title: t('preferences'),
      items: [
        { 
          icon: 'notifications', 
          label: t('notifications'), 
          color: '#8B5CF6', 
          bg: '#F3E8FF', 
          toggle: true,
          value: notificationsEnabled,
          onToggle: toggleNotifications,
        },
        { 
          icon: 'language', 
          label: t('language'), 
          color: '#3B82F6', 
          bg: '#DBEAFE', 
          value: languageNames[language],
          onPress: () => setShowLanguageModal(true),
        },
      ]
    },
    {
      title: 'Support',
      items: [
        { 
          icon: 'help-circle', 
          label: 'Help Center', 
          color: '#14B8A6', 
          bg: '#CCFBF1',
          onPress: () => router.push('/help-center'),
        },
        { 
          icon: 'chatbubbles', 
          label: 'Contact Us', 
          color: '#6366F1', 
          bg: '#EEF2FF',
          onPress: () => router.push('/contact-us'),
        },
        { 
          icon: 'shield-checkmark', 
          label: 'Privacy Policy', 
          color: '#64748B', 
          bg: '#F1F5F9',
          onPress: () => router.push('/privacy-policy'),
        },
        { 
          icon: 'document', 
          label: 'Terms of Service', 
          color: '#64748B', 
          bg: '#F1F5F9',
          onPress: () => router.push('/terms-of-service'),
        },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={['#6366F1', '#4F46E5', '#4338CA']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user?.imageUrl || 'https://i.pravatar.cc/150' }}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress || ''}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.tests}</Text>
              <Text style={styles.statLabel}>Tests</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.reports}</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.scans}</Text>
              <Text style={styles.statLabel}>Scans</Text>
            </View>
          </View>
        </Animated.View>

        {menuSections.map((section, sectionIndex) => (
          <Animated.View 
            key={section.title}
            entering={FadeInDown.delay(200 + sectionIndex * 100)}
            style={styles.menuSection}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    itemIndex !== section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={(item as any).onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: item.bg }]}>
                    <Ionicons name={(item as any).icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {(item as any).description && (
                      <Text style={styles.menuDescription}>{(item as any).description}</Text>
                    )}
                  </View>
                  {(item as any).toggle ? (
                    <Switch
                      value={(item as any).value}
                      onValueChange={(item as any).onToggle}
                      trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                      thumbColor={(item as any).value ? '#6366F1' : '#94A3B8'}
                    />
                  ) : (item as any).value ? (
                    <Text style={styles.menuValue}>{(item as any).value}</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(500)} style={styles.signOutContainer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <MaterialCommunityIcons name="brain" size={24} color="#6366F1" />
            <Text style={styles.footerLogoText}>Cognix</Text>
          </View>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 Cognix AI. All rights reserved.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.languageModal}>
            <Text style={styles.languageModalTitle}>{t('language')}</Text>
            
            {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageOption,
                  language === lang && styles.languageOptionActive,
                ]}
                onPress={() => {
                  setLanguage(lang);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.languageOptionText,
                  language === lang && styles.languageOptionTextActive,
                ]}>
                  {languageNames[lang]}
                </Text>
                {language === lang && (
                  <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={styles.languageCloseBtn}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.languageCloseBtnText}>{t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6366F1' },
  header: { paddingTop: 16, paddingBottom: 80, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1, marginTop: -60, backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 0 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 30, borderWidth: 3, borderColor: '#EEF2FF' },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  userEmail: { fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', paddingHorizontal: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0' },
  menuSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 10, paddingLeft: 4 },
  menuCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  menuDescription: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  menuValue: { fontSize: 14, color: '#94A3B8' },
  signOutContainer: { marginTop: 10, marginBottom: 30 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#FEE2E2', borderRadius: 16, gap: 8 },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  footer: { alignItems: 'center', paddingVertical: 30 },
  footerLogo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  footerLogoText: { fontSize: 18, fontWeight: '700', color: '#6366F1' },
  versionText: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  copyrightText: { fontSize: 12, color: '#CBD5E1' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  languageModal: { width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  languageModalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  languageOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 10, backgroundColor: '#F8FAFC' },
  languageOptionActive: { backgroundColor: '#EEF2FF', borderWidth: 2, borderColor: '#6366F1' },
  languageOptionText: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
  languageOptionTextActive: { color: '#6366F1', fontWeight: '600' },
  languageCloseBtn: { backgroundColor: '#6366F1', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  languageCloseBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
