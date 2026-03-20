import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import HistoryService from '@/services/history';

const { width } = Dimensions.get('window');

export default function CognitiveProgressionDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [summary, setSummary] = useState('');
  const [metrics, setMetrics] = useState<any>(null);

  const fetchTimeline = useCallback(async () => {
    if (!user) return;
    try {
      const result = await HistoryService.getTimeline(user.id);
      if (result.success && result.data) {
        setTimelineData(result.data.timeline);
        setSummary(result.data.summary);
        setMetrics(result.data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTimeline();
  };

  const domainColors = {
    memory: '#6366F1',
    attention: '#EC4899',
    language: '#10B981',
    executiveFunction: '#F59E0B',
  };

  const prepareChartData = (domain: string) => {
    if (!timelineData || timelineData.length === 0) return null;

    const labels = timelineData.map((d: any) => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = timelineData.map((d: any) => d.scores[domain] || 0);

    return {
      labels: labels.length > 6 ? labels.slice(-6) : labels,
      datasets: [
        {
          data: data.length > 6 ? data.slice(-6) : data,
          color: (opacity = 1) => domainColors[domain as keyof typeof domainColors],
          strokeWidth: 3,
        },
      ],
    };
  };

  const renderMetricCard = (domain: string, title: string, icon: string) => {
    const domainMetrics = metrics?.[domain] || {};
    const color = domainColors[domain as keyof typeof domainColors];
    
    return (
      <View style={styles.metricCard}>
        <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.metricInfo}>
          <Text style={styles.metricTitle}>{title}</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricSubItem}>
              <Text style={styles.metricLabel}>Decline Rate</Text>
              <Text style={[styles.metricValue, { color: domainMetrics.decline_rate < 0 ? '#EF4444' : '#10B981' }]}>
                {domainMetrics.decline_rate > 0 ? '+' : ''}{domainMetrics.decline_rate || 0}
              </Text>
            </View>
            <View style={styles.metricSubItem}>
              <Text style={styles.metricLabel}>Stability</Text>
              <Text style={styles.metricValue}>{domainMetrics.stability_index || '0.00'}</Text>
            </View>
            <View style={styles.metricSubItem}>
              <Text style={styles.metricLabel}>Drift</Text>
              <Text style={[styles.metricValue, { color: (domainMetrics.drift || 0) < 0 ? '#EF4444' : '#64748B' }]}>
                {domainMetrics.drift || '0.00'}
              </Text>
            </View>
          </View>
          {domainMetrics.sudden_drop && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning" size={12} color="#EF4444" />
              <Text style={styles.warningText}>Sudden Drop Detected</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Analyzing your progress...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cognitive Progression</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="help-circle-outline" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Trend Summary Section */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.summaryCard}>
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.summaryGradient}
          >
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons name="trending-up" size={24} color="#fff" />
              <Text style={styles.summaryTitle}>AI Neural Health Trend</Text>
            </View>
            <Text style={styles.summaryText}>
              {summary || "Generating your neural health progression report. Please complete more tests to see detailed AI insights."}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Domain Charts */}
        <Text style={styles.sectionTitle}>Performance Timeline</Text>
        
        {timelineData.length < 2 ? (
          <View style={styles.emptyState}>
            <Ionicons name="stats-chart" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>Not enough data to show trends.</Text>
            <Text style={styles.emptySubText}>Complete at least 2 cognitive tests to see your timeline charts.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartsScroll}>
            {['memory', 'attention', 'language', 'executiveFunction'].map((domain, index) => {
              const chartData = prepareChartData(domain);
              if (!chartData) return null;
              
              return (
                <View key={domain} style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>{domain.charAt(0).toUpperCase() + domain.slice(1)}</Text>
                  <LineChart
                    data={chartData}
                    width={width * 0.85}
                    height={200}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => domainColors[domain as keyof typeof domainColors],
                      labelColor: (opacity = 1) => '#64748B',
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: '6',
                        strokeWidth: '2',
                        stroke: '#fff',
                      },
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Detailed Metrics */}
        <Text style={styles.sectionTitle}>Stability & Drift Analysis</Text>
        <View style={styles.metricsContainer}>
          {renderMetricCard('memory', 'Memory Score', 'brain')}
          {renderMetricCard('attention', 'Attention Span', 'eye')}
          {renderMetricCard('language', 'Language & Recall', 'translate')}
          {renderMetricCard('executiveFunction', 'Executive Function', 'cog')}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#6366F1" />
          <Text style={styles.infoText}>
            Decline rate shows changes between your first and last test. 
            Stability Index indicates how consistent your responses are.
          </Text>
        </View>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  infoButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    marginTop: 8,
  },
  chartsScroll: {
    marginBottom: 24,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    marginLeft: 8,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  metricsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricInfo: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metricSubItem: {
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 18,
  },
});
