// Reports Screen - View all saved medical reports
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import HistoryService from '../services/history';
import { useUser } from '@clerk/clerk-expo';

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const result = await HistoryService.getReports(user.id);
    
    if (result.success && result.data) {
      setReports(result.data);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const openReport = (report: any) => {
    if (report.report?.reportUrl) {
      const fullUrl = `https://cognix-flask-server-x2u5.onrender.com${report.report.reportUrl}`;
      router.push({
        pathname: '/pdf-viewer',
        params: {
          url: fullUrl,
          title: `${report.type} Report - ${new Date(report.createdAt).toLocaleDateString()}`
        }
      });
    }
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'scan': return 'document-text';
      case 'test': return 'flash';
      case 'clinical': return 'medkit';
      default: return 'folder-open';
    }
  };

  const getReportColor = (type: string) => {
    switch (type) {
      case 'scan': return '#6366F1';
      case 'test': return '#F59E0B';
      case 'clinical': return '#10B981';
      default: return '#8B5CF6';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        {reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptyText}>
              Your medical reports will appear here after assessments
            </Text>
          </View>
        ) : (
          reports.map((report, index) => (
            <Animated.View
              key={report._id}
              entering={FadeInDown.delay(index * 100)}
            >
              <TouchableOpacity
                style={styles.reportCard}
                onPress={() => openReport(report)}
                activeOpacity={0.7}
              >
                <View style={[styles.reportIconContainer, { backgroundColor: `${getReportColor(report.type)}20` }]}>
                  <Ionicons name={getReportIcon(report.type) as any} size={28} color={getReportColor(report.type)} />
                </View>

                <View style={styles.reportContent}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportType}>
                      {report.type === 'scan' ? 'Document Scan' :
                       report.type === 'test' ? 'Quick Test' :
                       report.type === 'clinical' ? 'Clinical Assessment' : 'Report'}
                    </Text>
                    <View style={[styles.reportTypeBadge, { backgroundColor: `${getReportColor(report.type)}15` }]}>
                      <Text style={[styles.reportTypeBadgeText, { color: getReportColor(report.type) }]}>
                        {report.report?.reportType || 'PDF'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reportDisease} numberOfLines={1}>
                    {report.prediction?.disease || 'Assessment Report'}
                  </Text>

                  <View style={styles.reportMeta}>
                    <View style={styles.reportMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text style={styles.reportMetaText}>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.reportMetaItem}>
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <Text style={styles.reportMetaText}>
                        {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reportContent: { flex: 1 },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reportType: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  reportTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reportTypeBadgeText: { fontSize: 10, fontWeight: '600' },
  reportDisease: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  reportMeta: { flexDirection: 'row', gap: 16 },
  reportMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportMetaText: { fontSize: 12, color: '#64748B' },
});
