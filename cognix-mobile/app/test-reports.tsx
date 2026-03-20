import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import HistoryService from '../services/history';

export default function TestReportsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const result = await HistoryService.getHistory(user.id);
    
    if (result.success && result.data) {
      // Filter only records that have reports
      const reportsData = result.data.filter((item: any) => item.report && item.report.reportUrl);
      setReports(reportsData);
    }
    setLoading(false);
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'scan': return 'document-text';
      case 'test': return 'clipboard';
      case 'clinical': return 'medical';
      case 'speech': return 'mic';
      default: return 'document';
    }
  };

  const getReportColor = (type: string) => {
    switch (type) {
      case 'scan': return { bg: '#EEF2FF', color: '#6366F1' };
      case 'test': return { bg: '#FEF3C7', color: '#F59E0B' };
      case 'clinical': return { bg: '#D1FAE5', color: '#10B981' };
      case 'speech': return { bg: '#FCE7F3', color: '#EC4899' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'scan': return 'Document Scan';
      case 'test': return 'Cognitive Test';
      case 'clinical': return 'Clinical Assessment';
      case 'speech': return 'Speech Analysis';
      default: return 'Report';
    }
  };

  const handleViewReport = (report: any) => {
    const flaskBase = process.env.EXPO_PUBLIC_FLASK_URL || 'https://cognix-flask-server-x2u5.onrender.com';
    const nodeBase = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.0.235:3000';
    
    const isFlaskReport = report.report?.reportType === 'quick_test' || 
                         report.report?.reportType === 'clinical_test' ||
                         report.report?.reportUrl?.startsWith('/test/reports/');
                         
    const baseUrl = isFlaskReport ? flaskBase : nodeBase;
    const fullUrl = `${baseUrl}${report.report.reportUrl}`;
    
    router.push({
      pathname: '/pdf-viewer',
      params: {
        url: fullUrl,
        title: `${getReportTypeLabel(report.type)} Report`
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Test Reports</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : reports.length === 0 ? (
          <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Reports Yet</Text>
            <Text style={styles.emptyText}>
              Complete tests and scans to generate PDF reports
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={styles.emptyButtonText}>Start a Test</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{reports.length}</Text>
                <Text style={styles.statLabel}>Total Reports</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {reports.filter(r => r.type === 'scan').length}
                </Text>
                <Text style={styles.statLabel}>Scans</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {reports.filter(r => r.type === 'test' || r.type === 'clinical').length}
                </Text>
                <Text style={styles.statLabel}>Tests</Text>
              </View>
            </View>

            {reports.map((report, index) => {
              const colors = getReportColor(report.type);
              return (
                <Animated.View 
                  key={report._id} 
                  entering={FadeInDown.delay(index * 50)}
                >
                  <TouchableOpacity 
                    style={styles.reportCard}
                    onPress={() => handleViewReport(report)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.reportIcon, { backgroundColor: colors.bg }]}>
                      <Ionicons name={getReportIcon(report.type) as any} size={24} color={colors.color} />
                    </View>
                    
                    <View style={styles.reportContent}>
                      <Text style={styles.reportType}>{getReportTypeLabel(report.type)}</Text>
                      <Text style={styles.reportDate}>
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      {report.prediction?.disease && (
                        <View style={styles.reportPrediction}>
                          <Ionicons name="medical" size={12} color="#6366F1" />
                          <Text style={styles.reportPredictionText}>
                            {report.prediction.disease}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.reportAction}>
                      <Ionicons name="document-text" size={20} color="#6366F1" />
                      <Text style={styles.reportActionText}>View PDF</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingVertical: 16, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loadingText: { fontSize: 14, color: '#64748B', marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  emptyButton: { backgroundColor: '#6366F1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },
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
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reportContent: { flex: 1 },
  reportType: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  reportDate: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  reportPrediction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  reportPredictionText: { fontSize: 12, color: '#6366F1', fontWeight: '500' },
  reportAction: {
    alignItems: 'center',
    gap: 4,
  },
  reportActionText: { fontSize: 11, color: '#6366F1', fontWeight: '500' },
});
