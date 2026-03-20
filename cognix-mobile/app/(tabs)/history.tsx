import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import HistoryService, { HistoryItem } from '../../services/history';
import EncryptionService from '../../services/encryption';

const FILTERS = ['All', 'Scans', 'Tests', 'Reports'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [activeFilter, setActiveFilter] = useState('All');
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPassword, setUploadPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  
  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadHistory();
    checkPasswordStatus();
  }, [user?.id]);

  const checkPasswordStatus = async () => {
    const status = await EncryptionService.isPasswordSet();
    setIsPasswordSet(status);
  };

  const loadHistory = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const result = await HistoryService.getHistory(user.id, { limit: 50 });
      if (result.success && result.data) {
        setHistoryData(result.data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [user?.id]);

  const getRiskColor = (result: string) => {
    if (result?.includes('Low') || result?.includes('LOW')) return { bg: '#D1FAE5', text: '#059669' };
    if (result?.includes('Moderate') || result?.includes('MODERATE')) return { bg: '#FEF3C7', text: '#D97706' };
    if (result?.includes('High') || result?.includes('HIGH')) return { bg: '#FEE2E2', text: '#DC2626' };
    return { bg: '#F1F5F9', text: '#64748B' };
  };

  const getFilteredData = () => {
    let filtered = historyData;

    // Filter by type
    if (activeFilter === 'Scans') {
      filtered = filtered.filter(item => item.type === 'scan');
    } else if (activeFilter === 'Tests') {
      filtered = filtered.filter(item => item.type === 'test' || item.type === 'clinical');
    } else if (activeFilter === 'Reports') {
      filtered = filtered.filter(item => item.type === 'report');
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        return (
          itemDate.getDate() === selectedDate.getDate() &&
          itemDate.getMonth() === selectedDate.getMonth() &&
          itemDate.getFullYear() === selectedDate.getFullYear()
        );
      });
    }

    return filtered;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleUploadReport = async () => {
    if (!isPasswordSet) {
      // First time - set password
      if (uploadPassword.length < 4) {
        Alert.alert('Error', 'Password must be at least 4 characters');
        return;
      }
      await EncryptionService.setPassword(uploadPassword);
      setIsPasswordSet(true);
    } else {
      // Verify password
      const valid = await EncryptionService.verifyPassword(uploadPassword);
      if (!valid) {
        Alert.alert('Error', 'Incorrect password');
        return;
      }
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const docId = `report_${Date.now()}`;
        
        // Store encrypted
        await EncryptionService.storeSecureDocument(docId, {
          name: file.name,
          uri: file.uri,
          type: file.mimeType,
          uploadedAt: new Date().toISOString(),
        }, uploadPassword);

        // Also save to history
        if (user?.id) {
          await HistoryService.saveHistory({
            userId: user.id,
            type: 'report' as any,
            documentInfo: {
              type: 'Personal Report',
              rawText: file.name,
            },
            prediction: {
              disease: 'N/A',
              confidence: 0,
              severity: 'N/A',
              riskLevel: 'Personal Document',
            },
          });
        }

        Alert.alert('Success', 'Document uploaded and encrypted securely!');
        setShowUploadModal(false);
        setUploadPassword('');
        loadHistory();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload document');
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const days = [];

    // Empty slots for days before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarYear, calendarMonth, day);
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      const isToday = 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();
      const hasData = historyData.some(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getDate() === day && 
               itemDate.getMonth() === calendarMonth &&
               itemDate.getFullYear() === calendarYear;
      });

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isSelected && styles.calendarDaySelected,
            isToday && styles.calendarDayToday,
          ]}
          onPress={() => {
            setSelectedDate(date);
            setShowCalendar(false);
          }}
        >
          <Text style={[
            styles.calendarDayText,
            isSelected && styles.calendarDayTextSelected,
            isToday && styles.calendarDayTextToday,
          ]}>
            {day}
          </Text>
          {hasData && <View style={styles.calendarDot} />}
        </TouchableOpacity>
      );
    }

    return days;
  };

  const filteredData = getFilteredData();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSubtitle}>Your health journey</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.calendarBtn}
              onPress={() => setShowCalendar(true)}
            >
              <Ionicons name="calendar-outline" size={22} color="#6366F1" />
            </TouchableOpacity>
            {activeFilter === 'Reports' && (
              <TouchableOpacity 
                style={styles.uploadBtn}
                onPress={() => setShowUploadModal(true)}
              >
                <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {selectedDate && (
          <View style={styles.selectedDateBar}>
            <Text style={styles.selectedDateText}>
              Showing: {formatDate(selectedDate.toISOString())}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary Card */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.summaryCard}>
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.summaryGradient}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{historyData.filter(h => h.type === 'scan').length}</Text>
            <Text style={styles.summaryLabel}>Scans</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{historyData.filter(h => h.type === 'test' || h.type === 'clinical').length}</Text>
            <Text style={styles.summaryLabel}>Tests</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{historyData.filter(h => h.type === 'report').length}</Text>
            <Text style={styles.summaryLabel}>Reports</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="clipboard-text-clock" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No {activeFilter === 'All' ? 'History' : activeFilter} Yet</Text>
            <Text style={styles.emptyDescription}>
              {activeFilter === 'Reports' 
                ? 'Tap the upload button to add your personal reports'
                : 'Your assessment history will appear here after you complete your first test'}
            </Text>
            {activeFilter === 'Reports' && (
              <TouchableOpacity 
                style={styles.emptyUploadBtn}
                onPress={() => setShowUploadModal(true)}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.emptyUploadBtnText}>Upload Report</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ) : (
          filteredData.map((item, index) => {
            const riskColors = getRiskColor(item.prediction?.riskLevel || '');
            const icon = item.type === 'scan' ? 'document-text' : 
                        item.type === 'report' ? 'folder-open' : 'flash';
            
            return (
              <Animated.View
                key={item._id}
                entering={FadeInRight.delay(index * 50)}
              >
                <TouchableOpacity 
                  style={styles.historyCard} 
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/history-detail', params: { id: item._id } })}
                >
                  <View style={[styles.cardIcon, { backgroundColor: item.type === 'scan' ? '#EEF2FF' : item.type === 'report' ? '#F0FDF4' : '#FEF3C7' }]}>
                    <Ionicons 
                      name={icon as any} 
                      size={24} 
                      color={item.type === 'scan' ? '#6366F1' : item.type === 'report' ? '#10B981' : '#F59E0B'} 
                    />
                  </View>
                  
                  <View style={styles.cardContent}>
                    <Text style={styles.cardType}>
                      {item.type === 'scan' ? 'Document Scan' : 
                       item.type === 'report' ? 'Personal Report' : 'Cognitive Test'}
                    </Text>
                    <Text style={styles.cardDisease} numberOfLines={1}>
                      {(item.prediction?.disease && item.prediction.disease !== 'N/A' && item.prediction.disease !== 'NA')
                        ? item.prediction.disease
                        : (item.documentInfo?.type || 'Assessment Pending')}
                    </Text>
                    <Text style={styles.cardDate}>
                      {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
                    </Text>
                  </View>

                  <View style={[styles.riskBadge, { backgroundColor: riskColors.bg }]}>
                    <Text style={[styles.riskText, { color: riskColors.text }]}>
                      {item.prediction?.riskLevel || 'N/A'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear(y => y - 1);
                } else {
                  setCalendarMonth(m => m - 1);
                }
              }}>
                <Ionicons name="chevron-back" size={24} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {MONTHS[calendarMonth]} {calendarYear}
              </Text>
              <TouchableOpacity onPress={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear(y => y + 1);
                } else {
                  setCalendarMonth(m => m + 1);
                }
              }}>
                <Ionicons name="chevron-forward" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>

            <View style={styles.calendarActions}>
              <TouchableOpacity 
                style={styles.calendarClearBtn}
                onPress={() => {
                  setSelectedDate(null);
                  setShowCalendar(false);
                }}
              >
                <Text style={styles.calendarClearText}>Clear Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.calendarCloseBtn}
                onPress={() => setShowCalendar(false)}
              >
                <Text style={styles.calendarCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModal}>
            <View style={styles.uploadModalHeader}>
              <MaterialCommunityIcons name="shield-lock" size={40} color="#6366F1" />
              <Text style={styles.uploadModalTitle}>
                {isPasswordSet ? 'Enter Password' : 'Set Password'}
              </Text>
              <Text style={styles.uploadModalSubtitle}>
                {isPasswordSet 
                  ? 'Enter your password to access secured documents'
                  : 'Set a password to encrypt your personal documents'}
              </Text>
            </View>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={uploadPassword}
              onChangeText={setUploadPassword}
            />

            <View style={styles.uploadModalActions}>
              <TouchableOpacity 
                style={styles.uploadCancelBtn}
                onPress={() => {
                  setShowUploadModal(false);
                  setUploadPassword('');
                }}
              >
                <Text style={styles.uploadCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.uploadConfirmBtn}
                onPress={handleUploadReport}
              >
                <Text style={styles.uploadConfirmText}>
                  {isPasswordSet ? 'Upload' : 'Set & Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  calendarBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedDateText: { fontSize: 13, color: '#6366F1', fontWeight: '500' },
  filtersContainer: { maxHeight: 40, marginTop: 4 },
  filtersContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#6366F1' },
  filterChipText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },
  summaryCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  summaryGradient: { flexDirection: 'row', padding: 20 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#64748B' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptyDescription: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyUploadBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardType: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  cardDisease: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  riskText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  calendarWeekDays: { flexDirection: 'row', marginBottom: 10 },
  weekDayText: { flex: 1, textAlign: 'center', fontSize: 12, color: '#64748B', fontWeight: '500' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDaySelected: { backgroundColor: '#6366F1', borderRadius: 12 },
  calendarDayToday: { borderWidth: 2, borderColor: '#6366F1', borderRadius: 12 },
  calendarDayText: { fontSize: 14, color: '#1E293B' },
  calendarDayTextSelected: { color: '#fff', fontWeight: '600' },
  calendarDayTextToday: { color: '#6366F1', fontWeight: '600' },
  calendarDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  calendarActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
  calendarClearBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center' },
  calendarClearText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  calendarCloseBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center' },
  calendarCloseText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  uploadModal: { width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  uploadModalHeader: { alignItems: 'center', marginBottom: 24 },
  uploadModalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 16 },
  uploadModalSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  passwordInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 20,
  },
  uploadModalActions: { flexDirection: 'row', gap: 12 },
  uploadCancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center' },
  uploadCancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  uploadConfirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center' },
  uploadConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
