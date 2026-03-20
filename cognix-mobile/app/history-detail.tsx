import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import HistoryService from '../services/history';
import { useLanguage } from '../services/language';

export interface BehavioralMetrics {
  timeTakenPerQuestion: number[];
  delayBeforeFirstInput: number[];
  editCount: number[];
  backspaceCount: number[];
  typingSpeedChanges: number[];
  answerModificationFrequency: number;
  // Indicators
  hesitationIndex?: number;
  responseInstabilityScore?: number;
  cognitiveFrictionScore?: number;
  aiBehavioralSummary?: string;
}

export interface HistoryItem {
  _id: string;
  userId: string;
  type: 'scan' | 'test' | 'clinical' | 'report' | 'speech';
  createdAt: string;
  behavioralMetrics?: BehavioralMetrics;
  testInfo?: {
    score: number;
    maxScore: number;
    percentage: number;
    testType?: string;
  };
  clinicalInfo?: {
    totalScore: number;
    maxScore: number;
    mmseEquivalent: number;
  };
  prediction?: {
    disease: string;
    confidence: number;
    severity: string;
    riskLevel: string;
  };
  report?: {
    reportId: string;
    reportUrl: string;
    generatedAt: string;
    reportType: string;
  };
  summary?: string;
  recommendations?: string[];
  documentInfo?: {
    type: string;
    imageUrl?: string;
    extractedText?: string;
  };
  aiAnalysis?: any;
  speechAnalysis?: {
    transcript: string;
    taskType: string;
    coherenceScore: number;
    fluencyScore: number;
    recallDifficulty: string;
    pauseCount: number;
    duration: number;
    markers: string[];
    clinicalInsight: string;
  };
  pdfUrl?: string;
}


const riskColors: Record<string, { bg: string; light: string; text: string }> = {
  Low: { bg: '#10B981', light: '#D1FAE5', text: '#065F46' },
  Moderate: { bg: '#F59E0B', light: '#FEF3C7', text: '#92400E' },
  High: { bg: '#EF4444', light: '#FEE2E2', text: '#991B1B' },
  Critical: { bg: '#DC2626', light: '#FEE2E2', text: '#7F1D1D' },
};

export default function HistoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const [record, setRecord] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRecord(id as string);
    }
  }, [id]);

  const loadRecord = async (recordId: string) => {
    setLoading(true);
    const result = await HistoryService.getHistoryRecord(recordId);
    if (result.success && result.data) {
      setRecord(result.data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getRiskColorSet = (level: string) => {
    return riskColors[level] || riskColors.Low;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('recordDetails')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{t('error')}: Record not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const colors = getRiskColorSet(record.prediction?.riskLevel || 'Low');
  const typeIcon = record.type === 'scan' ? 'document-text' : 
                   record.type === 'report' ? 'folder-open' : 
                   record.type === 'speech' ? 'mic' : 'flash';
  const typeColor = record.type === 'scan' ? '#6366F1' : 
                    record.type === 'report' ? '#10B981' : 
                    record.type === 'speech' ? '#EC4899' : '#F59E0B';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('recordDetails')}</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Type Badge */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.typeBadge}>
          <View style={[styles.typeIcon, { backgroundColor: `${typeColor}20` }]}>
            <Ionicons name={typeIcon as any} size={20} color={typeColor} />
          </View>
          <Text style={[styles.typeText, { color: typeColor }]}>
            {record.type === 'report' ? t('personalReport') : t('cognitiveTest')}
          </Text>
        </Animated.View>

        {/* Main Card - Redesigned */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <LinearGradient 
            colors={record.type === 'scan' ? ['#6366F1', '#4F46E5'] : [colors.bg, colors.bg + 'DD']} 
            style={styles.mainCard}
          >
            <View style={styles.mainCardHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialCommunityIcons 
                    name={record.type === 'scan' ? "file-document-outline" : "brain"} 
                    size={18} 
                    color="rgba(255,255,255,0.8)" 
                  />
                  <Text style={styles.diseaseLabel}>
                    {record.type === 'scan' ? " AI Analysis Result" : t('prediction')}
                  </Text>
                </View>
                
                <Text style={styles.diseaseValue}>
                  {record.prediction?.disease && record.prediction.disease !== 'N/A' && record.prediction.disease !== 'NA'
                    ? record.prediction.disease
                    : 'Assessment Complete'}
                </Text>

                <View style={styles.metaContainer}> 
                  <View style={styles.riskBadge}>
                    <Text style={styles.riskText}>
                      {record.prediction?.riskLevel || 'Moderate'} Risk
                    </Text>
                  </View>
                  
                  {record.prediction?.confidence != null && (
                    <View style={styles.confidencePill}>
                      <Text style={styles.confidenceText}>
                        {(record.prediction.confidence * 100).toFixed(0)}% Confidence
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Date & Time */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#6366F1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('dateTime')}</Text>
              <Text style={styles.infoValue}>{formatDate(record.createdAt)}</Text>
              <Text style={styles.infoSubvalue}>{formatTime(record.createdAt)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Test Info (Hidden for Scans and Speech) */}
        {(record.testInfo || record.clinicalInfo) && record.type !== 'scan' && record.type !== 'speech' && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('score')}</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>
                {record.testInfo?.score ?? record.clinicalInfo?.totalScore ?? 0}/{record.testInfo?.maxScore ?? record.clinicalInfo?.maxScore ?? 100}
              </Text>
              <Text style={styles.scorePercentage}>
                {record.testInfo?.percentage != null 
                  ? record.testInfo.percentage.toFixed(0) 
                  : (record.clinicalInfo?.totalScore || 0).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.scoreBar}>
              <View 
                style={[
                  styles.scoreBarFill, 
                  { 
                    width: `${record.testInfo?.percentage || record.clinicalInfo?.totalScore || 0}%`, 
                    backgroundColor: colors.bg 
                  }
                ]} 
              />
            </View>
          </Animated.View>
        )}

        {/* Document Insights (Enhanced for Scan) */}
        {record.documentInfo && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.infoCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="file-document-outline" size={24} color="#6366F1" />
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Document Insights</Text>
              </View>
              <View style={styles.docTypeBadge}>
                 <Text style={styles.docTypeText}>{record.documentInfo.type || 'Medical Report'}</Text>
              </View>
            </View>
            
            {/* Image Preview */}
            {record.documentInfo.imageUrl && (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: record.documentInfo.imageUrl }} 
                  style={styles.documentImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.imageOverlay}
                />
                <View style={styles.expandButton}>
                  <Ionicons name="expand" size={24} color="#fff" />
                </View>
              </View>
            )}

            {/* Extracted Content Preview */}
            {record.documentInfo.extractedText ? (
               <View style={styles.extractedTextContainer}>
                  <Text style={styles.extractedLabel}>EXTRACTED CONTENT</Text>
                  <Text style={styles.extractedText} numberOfLines={4}>
                    {record.documentInfo.extractedText}
                  </Text>
                  {record.documentInfo.extractedText.length > 200 && (
                    <TouchableOpacity style={styles.readMoreBtn}>
                      <Text style={styles.readMoreText}>View Full Text</Text>
                      <Ionicons name="chevron-forward" size={14} color="#6366F1" />
                    </TouchableOpacity>
                  )}
               </View>
            ) : (
              <View style={styles.extractedTextContainer}>
                <Text style={styles.extractedLabel}>CONTENT ANALYSIS</Text>
                <View style={styles.metaGrid}>
                   <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Scan Quality</Text>
                      <Text style={styles.metaValue}>High Accuracy</Text>
                   </View>
                   <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Analysis Type</Text>
                      <Text style={styles.metaValue}>OCR + NLP</Text>
                   </View>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* View PDF Report Button */}
        {(record.report || record.pdfUrl) && (
          <Animated.View entering={FadeInDown.delay(450)} style={styles.reportCard}>
            <TouchableOpacity 
              style={styles.reportButton}
              onPress={async () => {
                const flaskBase = process.env.EXPO_PUBLIC_FLASK_URL || 'https://cognix-flask-server-x2u5.onrender.com';
                const nodeBase = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.0.235:3000';
                
                let fullUrl = '';
                if (record.pdfUrl) {
                  fullUrl = record.pdfUrl;
                } else if (record.report?.reportUrl) {
                  // If it's a test report (quick or clinical), it's served by Flask
                  const isFlaskReport = record.report?.reportType === 'quick_test' || 
                                      record.report?.reportType === 'clinical_test' ||
                                      record.report?.reportUrl?.startsWith('/test/reports/') ||
                                      record.report?.reportUrl?.startsWith('/speech/download/');
                                      
                  const baseUrl = isFlaskReport ? flaskBase : nodeBase;
                  fullUrl = `${baseUrl}${record.report!.reportUrl}`;
                }
                
                if (!fullUrl) return;

                router.push({
                  pathname: '/pdf-viewer',
                  params: {
                    url: fullUrl,
                    title: 'Medical Report'
                  }
                });
              }}
            >
              <LinearGradient colors={['#7E57C2', '#9575CD']} style={styles.reportGradient}>
                <View style={styles.reportIconContainer}>
                  <Ionicons name="document-text" size={28} color="#fff" />
                </View>
                <View style={styles.reportTextContainer}>
                  <Text style={styles.reportTitle}>Neuro-Linguistic Report</Text>
                  <Text style={styles.reportSubtitle}>Professional PDF • Tap to view</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* AI Analysis (if available) */}
        {record.summary && (
          <Animated.View entering={FadeInDown.delay(480)} style={[styles.infoCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialCommunityIcons name="doctor" size={20} color="#92400E" />
              <Text style={[styles.sectionTitle, { color: '#92400E', marginBottom: 0 }]}>Clinical Summary</Text>
            </View>
            <Text style={[styles.assessmentText, { color: '#78350F' }]}>
              {record.summary}
            </Text>
          </Animated.View>
        )}

        {record.aiAnalysis?.cognitiveAssessment && (
          <Animated.View entering={FadeInDown.delay(500)} style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Cognitive Assessment</Text>
            <Text style={styles.assessmentText}>
              {record.aiAnalysis.cognitiveAssessment.explanation}
            </Text>
          </Animated.View>
        )}

        {/* Key Findings */}
        {record.aiAnalysis?.keyFindings && record.aiAnalysis.keyFindings.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600)} style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('keyFindings')}</Text>
            {record.aiAnalysis.keyFindings.map((finding: any, index: number) => (
              <View key={index} style={styles.findingItem}>
                <View style={[
                  styles.findingBadge,
                  { backgroundColor: finding.status === 'Normal' ? '#D1FAE5' : '#FEE2E2' }
                ]}>
                  <Text style={[
                    styles.findingBadgeText,
                    { color: finding.status === 'Normal' ? '#059669' : '#DC2626' }
                  ]}>
                    {finding.status}
                  </Text>
                </View>
                <Text style={styles.findingText}>{finding.finding}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* AI Recommendations from GROQ (New) */}
        {record.recommendations && record.recommendations.length > 0 && (
          <Animated.View entering={FadeInDown.delay(750)} style={[styles.infoCard, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#10B981" />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>AI Recommendations</Text>
            </View>
            
            {record.recommendations.map((rec, i) => (
              <View key={`ai-rec-${i}`} style={styles.recItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginTop: 2 }} />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Behavioral Insights (Hidden for Scans) */}
        {record.behavioralMetrics && record.type !== 'scan' && (
          <Animated.View entering={FadeInDown.delay(800)} style={[styles.infoCard, { borderLeftColor: '#6366F1', borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MaterialCommunityIcons name="brain" size={24} color="#6366F1" />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Professional Behavioral Analysis</Text>
            </View>

            {/* Cognitive Indicators */}
            <View style={styles.indicatorGrid}>
              <View style={styles.indicatorBox}>
                <Text style={styles.indicatorLabel}>Hesitation Index</Text>
                <Text style={[styles.indicatorValue, { color: (record.behavioralMetrics.hesitationIndex || 0) > 5 ? '#EF4444' : '#10B981' }]}>
                  {record.behavioralMetrics.hesitationIndex != null ? record.behavioralMetrics.hesitationIndex.toFixed(1) : '0.0'}/10
                </Text>
              </View>
              <View style={styles.indicatorBox}>
                <Text style={styles.indicatorLabel}>Instability Score</Text>
                <Text style={[styles.indicatorValue, { color: (record.behavioralMetrics.responseInstabilityScore || 0) > 5 ? '#EF4444' : '#10B981' }]}>
                  {record.behavioralMetrics.responseInstabilityScore != null ? record.behavioralMetrics.responseInstabilityScore.toFixed(1) : '0.0'}/10
                </Text>
              </View>
              <View style={styles.indicatorBox}>
                <Text style={styles.indicatorLabel}>Friction Score</Text>
                <Text style={[styles.indicatorValue, { color: (record.behavioralMetrics.cognitiveFrictionScore || 0) > 5 ? '#EF4444' : '#10B981' }]}>
                  {record.behavioralMetrics.cognitiveFrictionScore != null ? record.behavioralMetrics.cognitiveFrictionScore.toFixed(1) : '0.0'}/10
                </Text>
              </View>
            </View>

            {/* AI Behavioral Summary */}
            {record.behavioralMetrics.aiBehavioralSummary && (
              <View style={styles.aiSummaryBox}>
                <Text style={styles.aiSummaryLabel}>AI Behavioral Insight:</Text>
                <Text style={styles.aiSummaryText}>{record.behavioralMetrics.aiBehavioralSummary}</Text>
              </View>
            )}

            {/* Detailed Signals */}
            <View style={styles.detailedSignals}>
              <View style={styles.signalRow}>
                <Text style={styles.signalLabel}>Avg Delay Before Input</Text>
                <Text style={styles.signalValue}>
                  {record.behavioralMetrics.delayBeforeFirstInput && record.behavioralMetrics.delayBeforeFirstInput.length > 0 ? ((record.behavioralMetrics.delayBeforeFirstInput.reduce((a, b) => a + b, 0) / record.behavioralMetrics.delayBeforeFirstInput.length) / 1000).toFixed(2) : '0.00'}s
                </Text>
              </View>
              <View style={styles.signalRow}>
                <Text style={styles.signalLabel}>Total Edits/Backspaces</Text>
                <Text style={styles.signalValue}>
                  {(record.behavioralMetrics.editCount?.reduce((a, b) => a + b, 0) || 0) + (record.behavioralMetrics.backspaceCount?.reduce((a, b) => a + b, 0) || 0)}
                </Text>
              </View>
              <View style={styles.signalRow}>
                <Text style={styles.signalLabel}>Answer Modifications</Text>
                <Text style={styles.signalValue}>{record.behavioralMetrics.answerModificationFrequency || 0}</Text>
              </View>
            </View>
          </Animated.View>
        )}


        {/* Speech & Language Analysis (Shown only for speech tests) */}
        {record.speechAnalysis && record.type === 'speech' && (
          <Animated.View entering={FadeInDown.delay(750)} style={[styles.infoCard, { borderLeftColor: '#EC4899', borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MaterialCommunityIcons name="microphone" size={24} color="#EC4899" />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Speech & Language Analysis</Text>
            </View>

            <View style={styles.indicatorGrid}>
              <View style={styles.indicatorBox}>
                <Text style={styles.indicatorLabel}>Coherence</Text>
                <Text style={[styles.indicatorValue, { color: record.speechAnalysis.coherenceScore < 6 ? '#EF4444' : '#10B981' }]}>
                  {record.speechAnalysis.coherenceScore}/10
                </Text>
              </View>
              <View style={styles.indicatorBox}>
                <Text style={styles.indicatorLabel}>Fluency</Text>
                <Text style={[styles.indicatorValue, { color: record.speechAnalysis.fluencyScore < 6 ? '#EF4444' : '#10B981' }]}>
                  {record.speechAnalysis.fluencyScore}/10
                </Text>
              </View>
              <View style={styles.indicatorBox}>
                <Text style={styles.indicatorLabel}>Recall Difficulty</Text>
                <Text style={[styles.indicatorValue, { color: record.speechAnalysis.recallDifficulty === 'High' ? '#EF4444' : '#10B981' }]}>
                  {record.speechAnalysis.recallDifficulty}
                </Text>
              </View>
            </View>

            <View style={styles.aiSummaryBox}>
              <Text style={styles.aiSummaryLabel}>Clinical Linguistic Insight:</Text>
              <Text style={styles.aiSummaryText}>{record.speechAnalysis.clinicalInsight}</Text>
            </View>

            <View style={styles.markersContainer}>
              {record.speechAnalysis.markers.map((marker, i) => (
                <View key={i} style={styles.markerBadge}>
                  <Text style={styles.markerText}>{marker}</Text>
                </View>
              ))}
            </View>

            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptLabel}>Transcript:</Text>
              <Text style={styles.transcriptText}>{record.speechAnalysis.transcript}</Text>
            </View>

            <View style={styles.detailedSignals}>
              <View style={styles.signalRow}>
                <Text style={styles.signalLabel}>Phonetic Pauses ({'>'}1.5s)</Text>
                <Text style={styles.signalValue}>{record.speechAnalysis.pauseCount}</Text>
              </View>
              <View style={styles.signalRow}>
                <Text style={styles.signalLabel}>Total Speech Duration</Text>
                <Text style={styles.signalValue}>{record.speechAnalysis.duration != null ? record.speechAnalysis.duration.toFixed(1) : '0.0'}s</Text>
              </View>
            </View>
          </Animated.View>
        )}


        {/* Existing Recommendations if available */}
        {record.aiAnalysis?.recommendations && (
          <Animated.View entering={FadeInDown.delay(700)} style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('recommendations')}</Text>
            
            {record.aiAnalysis.recommendations.immediate?.map((rec: string, i: number) => (
              <View key={`imm-${i}`} style={styles.recItem}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
            
            {record.aiAnalysis.recommendations.medical?.map((rec: string, i: number) => (
              <View key={`med-${i}`} style={styles.recItem}>
                <Ionicons name="medkit" size={16} color="#6366F1" />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
            
            {record.aiAnalysis.recommendations.lifestyle?.map((rec: string, i: number) => (
              <View key={`life-${i}`} style={styles.recItem}>
                <Ionicons name="heart" size={16} color="#10B981" />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#64748B', marginTop: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#64748B', marginTop: 16 },
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
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  typeText: { fontSize: 14, fontWeight: '600' },
  mainCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  diseaseLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  diseaseValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
  confidenceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  riskBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  riskText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoContent: { marginLeft: 14, flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  infoSubvalue: { fontSize: 14, color: '#64748B', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 16 },
  scoreContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  scoreValue: { fontSize: 36, fontWeight: '800', color: '#1E293B', marginRight: 12 },
  scorePercentage: { fontSize: 20, fontWeight: '600', color: '#64748B' },
  scoreBar: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  documentType: { fontSize: 18, fontWeight: '600', color: '#6366F1', marginBottom: 16 },
  documentImage: { width: '100%', height: 200, borderRadius: 12 },
  assessmentText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  findingItem: { marginBottom: 12 },
  findingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  findingBadgeText: { fontSize: 11, fontWeight: '600' },
  findingText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  recText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 },
  // Report Button Styles
  reportCard: { marginBottom: 16 },
  reportButton: { borderRadius: 16, overflow: 'hidden', elevation: 6 },
  reportGradient: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  reportIconContainer: { 
    width: 56, 
    height: 56, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 16
  },
  reportTextContainer: { flex: 1 },
  reportTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  reportSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  // Behavioral Analysis Styles
  indicatorGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  indicatorBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  indicatorLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  indicatorValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  aiSummaryBox: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  aiSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },
  aiSummaryText: {
    fontSize: 13,
    color: '#3730A3',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  detailedSignals: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  signalLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  signalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  // Speech Analysis Specific Styles
  markersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    marginTop: 10,
  },
  markerBadge: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markerText: {
    fontSize: 12,
    color: '#9D174D',
    fontWeight: '600',
  },
  transcriptContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // New Styles for Redesign
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  confidencePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8, // Match height with risk badge
    borderRadius: 20,
    height: 35, // Ensure consistency
    justifyContent: 'center',
  },
  confidenceText: {
    color: '#fff',
    fontSize: 13, // Match risk text
    fontWeight: '600',
  },
  docTypeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  docTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    textTransform: 'uppercase',
  },
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 220,
    backgroundColor: '#F1F5F9',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  expandButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  extractedTextContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  extractedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  extractedText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    marginRight: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
});
