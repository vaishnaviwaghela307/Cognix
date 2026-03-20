// Quick Test Screen - GROQ-powered cognitive screening
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useUser } from '@clerk/clerk-expo';
import HistoryService from '../../services/history';
import { useCognitiveTracking } from '../../hooks/useCognitiveTracking';

const FLASK_URL = process.env.EXPO_PUBLIC_FLASK_URL || 'https://cognix-flask-server-x2u5.onrender.com';

export default function QuickTestScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { getLatestMetrics, startQuestion, endQuestion, calculateIndicators } = useCognitiveTracking();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [testComplete, setTestComplete] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0 && currentQuestion < questions.length && !loading) {
      startQuestion();
    }
  }, [currentQuestion, questions.length, loading, startQuestion]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${FLASK_URL}/test/quick/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions);
      } else {
        Alert.alert('Error', 'Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: any) => {
    endQuestion();
    const newAnswers = [...answers, {
      question_id: questions[currentQuestion].id,
      score: option.score,
      max_score: 3
    }];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitTest(newAnswers);
    }
  };

  const submitTest = async (finalAnswers: any[]) => {
    try {
      setLoading(true);
      const latestMetrics = getLatestMetrics();
      const response = await fetch(`${FLASK_URL}/test/quick/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          user_id: user?.id || 'anonymous',
          behavioral_metrics: latestMetrics
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data);
        setTestComplete(true);

        // Save to history
        if (user?.id && data.report) {
          const latestMetrics = getLatestMetrics();
          const indicators = calculateIndicators(latestMetrics);
          await HistoryService.saveHistory({
            userId: user.id,
            type: 'test',
            testInfo: {
              score: 0,
              maxScore: 100,
              percentage: (data.prediction?.confidence || 0) * 100
            },
            prediction: {
              disease: data.prediction?.disease || 'Unknown',
              confidence: data.prediction?.confidence || 0,
              riskLevel: data.prediction?.risk || 'Low'
            },
            report: {
              reportId: data.report.report_id,
              reportUrl: data.report.report_url,
              generatedAt: new Date().toISOString(),
              reportType: 'quick_test'
            },
            behavioralMetrics: {
              ...latestMetrics,
              ...indicators,
              aiBehavioralSummary: data.behavioral_summary || ''
            },
            cognitiveScores: {
              memory: data.prediction?.explainability?.symptom_breakdown?.Memory || 0.5,
              attention: data.prediction?.explainability?.symptom_breakdown?.Attention || 0.5,
              language: data.prediction?.explainability?.symptom_breakdown?.Language || 0.5,
              executiveFunction: data.prediction?.explainability?.symptom_breakdown?.['Executive Function'] || 0.5
            }
          } as any);
        }
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      Alert.alert('Error', 'Failed to submit test');
    } finally {
      setLoading(false);
    }
  };

  const viewReport = () => {
    if (result?.report) {
      const fullUrl = `${FLASK_URL}${result.report.report_url}`;
      router.push({
        pathname: '/pdf-viewer',
        params: {
          url: fullUrl,
          title: 'Quick Test Report'
        }
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>
            {testComplete ? 'Analyzing results...' : 'Loading questions...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (testComplete && result) {
    const summaryText = result.summary || 'Based on your responses, our AI has analyzed potential cognitive patterns. Please consult a healthcare professional for a comprehensive evaluation.';
    const diseaseText = result.prediction?.disease || 'Assessment Pending';
    const confidenceVal = (result.prediction?.confidence || 0) * 100;
    const riskLevel = result.prediction?.risk || 'Low';
    
    // Calculate category scores from answers
    const categoryScores: Record<string, { score: number; total: number }> = {};
    answers.forEach((ans: any) => {
      const cat = ans.category || 'General';
      if (!categoryScores[cat]) categoryScores[cat] = { score: 0, total: 0 };
      categoryScores[cat].total += 3;
      categoryScores[cat].score += (3 - (ans.score || 0));
    });

    const categoryIcons: Record<string, string> = {
      'Memory': '🧠',
      'Attention': '🎯',
      'Language': '💬',
      'Motor': '🖐️',
      'Orientation': '🧭',
      'Daily Living': '🏠',
      'Mood': '😊',
      'General': '📋'
    };
    
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <Text style={styles.resultHeaderTitle}>Test Results</Text>
          </View>

          {/* Main Prediction Card */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <LinearGradient 
              colors={riskLevel === 'High' ? ['#EF4444', '#DC2626'] : riskLevel === 'Moderate' ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']} 
              style={styles.predictionCard}
            >
              <View style={styles.predictionHeader}>
                <Text style={styles.predictionLabel}>AI Prediction</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceBadgeText}>{confidenceVal.toFixed(0)}% Match</Text>
                </View>
              </View>
              <Text style={styles.predictionDisease}>{diseaseText}</Text>
              <View style={styles.riskIndicator}>
                <Ionicons name={riskLevel === 'High' ? 'alert-circle' : 'shield-checkmark'} size={18} color="#fff" />
                <Text style={styles.riskIndicatorText}>{riskLevel} Risk Level</Text>
              </View>
              
              {/* Confidence Bar */}
              <View style={styles.confidenceBarContainer}>
                <View style={styles.confidenceBarBg}>
                  <View style={[styles.confidenceBarFill, { width: `${confidenceVal}%` }]} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Summary Card */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.summarySection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbox-ellipses" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>AI Summary</Text>
            </View>
            <Text style={styles.summaryText}>{summaryText}</Text>
          </Animated.View>

          {/* Explainable AI - Symptom Breakdown */}
          {result.prediction?.explainability?.symptom_breakdown && (
            <Animated.View entering={FadeInDown.delay(250)} style={styles.summarySection}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="pie-chart" size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Symptom Contribution</Text>
              </View>
              {Object.entries(result.prediction.explainability.symptom_breakdown).map(([symptom, weight]: [string, any]) => (
                <View key={symptom} style={styles.xaiRow}>
                  <View style={styles.xaiLabelRow}>
                    <Text style={styles.xaiLabel}>{symptom}</Text>
                    <Text style={styles.xaiValue}>{(weight * 100).toFixed(0)}%</Text>
                  </View>
                  <View style={styles.xaiBarBg}>
                    <View style={[styles.xaiBarFill, { width: `${weight * 100}%` }]} />
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Explainable AI - Reasoning Trace */}
          {result.prediction?.explainability?.reasoning_trace && (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.reasoningSection}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="document-text" size={20} color="#059669" />
                <Text style={[styles.sectionTitle, { color: '#065F46' }]}>AI Reasoning Trace</Text>
              </View>
              <Text style={[styles.summaryText, { color: '#065F46' }]}>
                {result.prediction.explainability.reasoning_trace}
              </Text>
            </Animated.View>
          )}

          {/* Category Performance */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.categorySection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="stats-chart" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>Category Performance</Text>
            </View>
            
            {Object.entries(categoryScores).map(([cat, data]: [string, { score: number; total: number }]) => {
              const percentage = data.total > 0 ? Math.round((data.score / data.total) * 100) : 0;
              return (
                <View key={cat} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{categoryIcons[cat] || '📊'}</Text>
                    <Text style={styles.categoryName}>{cat}</Text>
                  </View>
                  <View style={styles.categoryBarContainer}>
                    <View style={styles.categoryBarBg}>
                      <View style={[styles.categoryBarFill, { width: `${percentage}%`, backgroundColor: percentage > 60 ? '#10B981' : percentage > 30 ? '#F59E0B' : '#EF4444' }]} />
                    </View>
                    <Text style={styles.categoryPercent}>{percentage}%</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.actionsSection}>
            {result.report && (
              <TouchableOpacity style={styles.downloadReportBtn} onPress={viewReport}>
                <Ionicons name="document-text-outline" size={22} color="#6366F1" />
                <Text style={styles.downloadReportText}>Download Full Report</Text>
                <Ionicons name="chevron-forward" size={18} color="#6366F1" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.finishBtn} onPress={() => router.back()}>
              <Text style={styles.finishBtnText}>Finish</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Test</Text>
        <Text style={styles.questionCount}>{currentQuestion + 1}/{questions.length}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown} style={styles.questionCard}>
          <View style={styles.questionCategoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(question?.category) + '20' }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor(question?.category) }]}>
                {question?.category?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.questionNumber}>Step {currentQuestion + 1} of {questions.length}</Text>
          </View>
          <Text style={styles.questionText}>{question?.question}</Text>

          <View style={styles.optionsContainer}>
            {question?.options.map((option: any, index: number) => (
              <Animated.View key={index} entering={FadeInDown.delay(index * 100)}>
                <TouchableOpacity
                  style={styles.optionBtn}
                  onPress={() => handleAnswer(option)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionText}>{option.text}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getCategoryColor = (category: string) => {
  const cat = category?.toLowerCase();
  if (cat?.includes('memory')) return '#6366F1';
  if (cat?.includes('attention')) return '#F59E0B';
  if (cat?.includes('language')) return '#10B981';
  if (cat?.includes('motor')) return '#EF4444';
  if (cat?.includes('orientation')) return '#8B5CF6';
  return '#64748B';
};

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
  questionCount: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  progressContainer: {
    height: 4,
    backgroundColor: '#F1F5F9',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  scrollContent: { padding: 20 },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionCategoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '800' },
  questionNumber: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  questionText: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 24, lineHeight: 28 },
  optionsContainer: { gap: 12 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  optionText: { fontSize: 15, color: '#1E293B', fontWeight: '500', flex: 1 },
  
  // Result Screen Styles
  resultHeader: { paddingVertical: 16 },
  resultHeaderTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  
  predictionCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  confidenceBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceBadgeText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  predictionDisease: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 12 },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  riskIndicatorText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  confidenceBarContainer: { marginTop: 8 },
  confidenceBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  summaryText: { fontSize: 15, color: '#475569', lineHeight: 24 },
  
  categorySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: { fontSize: 20 },
  categoryName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  categoryBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercent: { fontSize: 13, fontWeight: '700', color: '#64748B', width: 40, textAlign: 'right' },
  
  actionsSection: { marginBottom: 20 },
  downloadReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  downloadReportText: { fontSize: 15, fontWeight: '600', color: '#6366F1', flex: 1, marginLeft: 12 },
  finishBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  finishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  xaiRow: {
    marginBottom: 12,
  },
  xaiLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  xaiLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  xaiValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  xaiBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xaiBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  reasoningSection: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
});
