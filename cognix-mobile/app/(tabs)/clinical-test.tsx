// Clinical Test Screen - Comprehensive GROQ-powered assessment
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path, Circle, G, Line, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { useUser } from '@clerk/clerk-expo';
import HistoryService from '../../services/history';
import CaregiverService from '../../services/caregiverService';
import { useCognitiveTracking } from '../../hooks/useCognitiveTracking';

const FLASK_URL = process.env.EXPO_PUBLIC_FLASK_URL || 'https://cognix-flask-server-x2u5.onrender.com';

export default function ClinicalTestScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { getLatestMetrics, startQuestion, recordInput, endQuestion, calculateIndicators } = useCognitiveTracking();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [textInputValue, setTextInputValue] = useState('');
  const [testComplete, setTestComplete] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [includeCaregiver, setIncludeCaregiver] = useState(false);

  const [caregiverSignals, setCaregiverSignals] = useState<any>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (testStarted && questions.length > 0 && currentQuestion < questions.length && !loading) {
      startQuestion();
    }
  }, [currentQuestion, questions.length, loading, testStarted, startQuestion]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${FLASK_URL}/test/clinical/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions);
      } else {
        Alert.alert('Error', 'Failed to load questions');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    if (includeCaregiver && user?.id) {
      try {
        setLoading(true);
        const result = await CaregiverService.getObservations(user.id);
        if (result.success && result.observations && result.observations.length > 0) {
          // Get the latest observation with structured signals
          const latestWithSignals = result.observations
            .filter((obs: any) => obs.structuredSignals)
            .sort((a: any, b: any) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime())[0];
          
          if (latestWithSignals) {
            setCaregiverSignals(latestWithSignals.structuredSignals);
          }
        }
      } catch (error) {
        console.error('Error fetching caregiver signals:', error);
      } finally {
        setLoading(false);
      }
    }
    setTestStarted(true);
  };

  // Handle Yes/No answer
  const handleYesNo = (isYes: boolean) => {
    endQuestion();
    const question = questions[currentQuestion];
    const newAnswer = {
      question_id: question.id,
      question: question.question,
      category: question.category,
      type: 'yes_no',
      answer: isYes ? 'Yes' : 'No',
      score: isYes ? question.clinical_weight : 0
    };
    saveAndNext(newAnswer);
  };

  // Handle Text Input answer
  const handleTextSubmit = () => {
    if (!textInputValue.trim()) {
      Alert.alert('Required', 'Please enter your response');
      return;
    }
    endQuestion();
    const question = questions[currentQuestion];
    const wordCount = textInputValue.split(/\s+/).filter(w => w).length;
    const expectedMin = question.expected_min || 10;
    const score = wordCount >= expectedMin ? question.clinical_weight : 
                  wordCount >= expectedMin / 2 ? question.clinical_weight / 2 : 0;
    
    const newAnswer = {
      question_id: question.id,
      question: question.question,
      category: question.category,
      type: 'text_input',
      answer: textInputValue,
      word_count: wordCount,
      score: score
    };
    setTextInputValue('');
    saveAndNext(newAnswer);
  };

  // Handle MCQ answer
  const handleMCQ = (option: any) => {
    endQuestion();
    const question = questions[currentQuestion];
    const newAnswer = {
      question_id: question.id,
      question: question.question,
      category: question.category,
      type: 'mcq',
      answer: option.text,
      severity: option.severity,
      score: option.score
    };
    saveAndNext(newAnswer);
  };

  // Save answer and move to next question
  const saveAndNext = (newAnswer: any) => {
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      console.log('🏁 Last question answered, submitting test...');
      submitTest(newAnswers);
    }
  };

  const submitTest = async (finalAnswers: any[]) => {
    try {
      console.log('📤 Submitting test with', finalAnswers.length, 'answers');
      setLoading(true);
      const latestMetrics = getLatestMetrics();
      const response = await fetch(`${FLASK_URL}/test/clinical/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          user_id: user?.id || 'anonymous',
          behavioral_metrics: latestMetrics,
          caregiver_signals: caregiverSignals
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data);
        setTestComplete(true);

        // Save to history with report
        if (user?.id && data.report) {
          const latestMetrics = getLatestMetrics();
          const indicators = calculateIndicators(latestMetrics);

          // Calculate total clinical score (average of domain scores)
          const domainScores = data.domain_scores || {};
          const scoreValues = Object.values(domainScores) as number[];
          const clinicalTotalScore = scoreValues.length > 0 
            ? Math.round((scoreValues.reduce((a: number, b: any) => a + b, 0) / scoreValues.length) * 100)
            : 0;

          await HistoryService.saveHistory({
            userId: user.id,
            type: 'clinical',
            clinicalInfo: {
              totalScore: clinicalTotalScore,
              maxScore: 100,
              mmseEquivalent: Math.round(clinicalTotalScore * 0.3) // Rough MMSE estimate
            },
            prediction: {
              disease: data.prediction?.disease || 'Unknown',
              confidence: data.prediction?.confidence || 0,
              severity: data.prediction?.severity || 'Moderate',
              riskLevel: data.prediction?.risk || 'Moderate',
              explainability: data.prediction?.explainability
            },
            report: {
              reportId: data.report.report_id,
              reportUrl: data.report.report_url,
              generatedAt: new Date().toISOString(),
              reportType: 'clinical_test'
            },
            summary: data.summary,
            recommendations: data.recommendations,
            behavioralMetrics: {
              ...latestMetrics,
              ...indicators,
              aiBehavioralSummary: data.behavioral_summary || ''
            },
            cognitiveScores: {
              memory: (data.domain_scores?.Memory || 0.5) * 10,
              attention: (data.domain_scores?.Attention || 0.5) * 10,
              language: (data.domain_scores?.Language || 0.5) * 10,
              executiveFunction: (data.domain_scores?.['Executive Function'] || 0.5) * 10
            }
          } as any);
        }
      }
    } catch {
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
          title: 'Clinical Assessment Report'
        }
      });
    }
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>
            {testComplete ? 'Analyzing with AI...' : 'Generating clinical questions...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pre-test Start Screen
  if (!testStarted && !testComplete) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clinical Assessment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown} style={styles.startCard}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.startHeaderGradient}>
              <MaterialCommunityIcons name="clipboard-pulse" size={48} color="#fff" />
              <Text style={styles.startTitle}>Comprehensive Evaluation</Text>
              <Text style={styles.startSubtitle}>Professional-grade AI neurological screening</Text>
            </LinearGradient>

            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color="#6366F1" />
                <Text style={styles.infoText}>Duration: 10-15 minutes</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="help-circle-outline" size={20} color="#6366F1" />
                <Text style={styles.infoText}>15 Deep clinical questions</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#6366F1" />
                <Text style={styles.infoText}>Secure & Private AI Analysis</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.optionSection}>
              <View style={styles.optionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>Include Caregiver Input</Text>
                  <Text style={styles.optionDesc}>Merge family observations for better accuracy</Text>
                </View>
                <Switch
                  value={includeCaregiver}
                  onValueChange={setIncludeCaregiver}
                  trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                  thumbColor={includeCaregiver ? '#6366F1' : '#94A3B8'}
                />
              </View>

              {includeCaregiver && (
                <View style={styles.caregiverExplanation}>
                  <MaterialCommunityIcons name="information" size={16} color="#6366F1" />
                  <Text style={styles.caregiverExplanationText}>
                    Caregiver observations humare algorithm ko real-world context deta hai (like memory loss in daily tasks), jisse accuracy 40% badh jati hai.
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={startTest}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.startBtnGradient}>
                <Text style={styles.startBtnText}>Begin Assessment</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Result Screen with Severity & Report
  if (testComplete && result) {
    const riskColor = result.prediction?.risk === 'High' ? '#EF4444' : 
                      result.prediction?.risk === 'Moderate' ? '#F59E0B' : '#10B981';
    
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <LinearGradient colors={[riskColor, riskColor + 'CC']} style={styles.resultHeaderCard}>
              <MaterialCommunityIcons name="clipboard-pulse" size={48} color="#fff" />
              <Text style={styles.resultTitle}>Clinical Assessment Complete</Text>
              <View style={styles.severityBadge}>
                <Text style={styles.severityText}>{result.prediction?.severity} Severity</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Prediction Card */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <MaterialCommunityIcons name="brain" size={24} color={riskColor} />
              <Text style={styles.predictionTitle}>AI Diagnosis</Text>
            </View>
            <Text style={styles.diseaseText}>{result.prediction?.disease}</Text>
            <View style={styles.predictionMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Confidence</Text>
                <Text style={styles.metaValue}>{(result.prediction?.confidence * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Risk Level</Text>
                <Text style={[styles.metaValue, { color: riskColor }]}>{result.prediction?.risk}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Summary Card */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons name="doctor" size={20} color="#10B981" />
              <Text style={styles.summaryTitle}>Clinical Summary</Text>
            </View>
            <Text style={styles.summaryText}>{result.summary}</Text>
          </Animated.View>

          {/* Explainable AI - Symptom Breakdown */}
          {result.prediction?.explainability?.symptom_breakdown && (
            <Animated.View entering={FadeInDown.delay(350)} style={styles.xaiCard}>
              <View style={styles.xaiHeader}>
                <MaterialCommunityIcons name="chart-pie" size={20} color="#6366F1" />
                <Text style={styles.xaiTitle}>Symptom Contribution Breakdown</Text>
              </View>
              {Object.entries(result.prediction.explainability.symptom_breakdown).map(([symptom, weight]: [string, any]) => (
                <View key={symptom} style={styles.xaiRow}>
                  <View style={styles.xaiLabelRow}>
                    <Text style={styles.xaiLabel}>{symptom}</Text>
                    <Text style={styles.xaiPercentage}>{(weight * 100).toFixed(0)}%</Text>
                  </View>
                  <View style={styles.xaiBarBg}>
                    <View style={[styles.xaiBarFill, { 
                      width: `${weight * 100}%`,
                      backgroundColor: '#6366F1'
                    }]} />
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Explainable AI - Reasoning Trace */}
          {result.prediction?.explainability?.reasoning_trace && (
            <Animated.View entering={FadeInDown.delay(400)} style={styles.reasoningCard}>
              <View style={styles.reasoningHeader}>
                <MaterialCommunityIcons name="comment-text-outline" size={20} color="#10B981" />
                <Text style={styles.reasoningTitle}>AI Reasoning Trace</Text>
              </View>
              <Text style={styles.reasoningText}>{result.prediction.explainability.reasoning_trace}</Text>
            </Animated.View>
          )}

          {/* Health Gauge Component */}
          <Animated.View entering={FadeInUp} style={styles.premiumCard}>
            <Text style={styles.cardHighlightTitle}>CLINICAL INDEX SCORE</Text>
            <View style={styles.gaugeHolder}>
              <Svg width={240} height={180} viewBox="0 0 240 180">
                <Defs>
                  <SvgGradient id="clinicalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#EF4444" />
                    <Stop offset="50%" stopColor="#F59E0B" />
                    <Stop offset="100%" stopColor="#10B981" />
                  </SvgGradient>
                </Defs>
                {/* Gauge Background */}
                <Path
                  d="M 40 150 A 80 80 0 0 1 200 150"
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                {/* Progress Arc */}
                <Path
                  d="M 40 150 A 80 80 0 0 1 200 150"
                  fill="none"
                  stroke="url(#clinicalGradient)"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={`${(Math.max(0.15, parseFloat(result.prediction?.confidence || '0.5')) * 80 * Math.PI)} ${80 * Math.PI}`}
                />
                {/* Central Score */}
                <SvgText x="120" y="140" fontSize="52" fill="#1E293B" fontWeight="900" textAnchor="middle">
                  {Math.round(Math.max(0.15, parseFloat(result.prediction?.confidence || '0.5')) * 100)}
                </SvgText>
                <SvgText x="120" y="170" fontSize="12" fill="#64748B" fontWeight="800" textAnchor="middle">CLINICAL ACCURACY</SvgText>
                
                {/* Needle */}
                <G transform={`rotate(${(Math.max(0.15, parseFloat(result.prediction?.confidence || '0.5')) * 180 - 90)}, 120, 150)`}>
                  <Line x1="120" y1="150" x2="120" y2="80" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
                  <Circle cx="120" cy="150" r="10" fill="#1E293B" />
                  <Circle cx="120" cy="150" r="5" fill="#fff" />
                </G>
              </Svg>
            </View>
          </Animated.View>

          {/* Radial Domain Map */}
          {result.domain_scores && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.domainPremiumCard}>
              <Text style={styles.sectionTitleCenter}>Cognitive Domain Breakdown</Text>
              <View style={styles.radialHolder}>
                <Svg width={Dimensions.get('window').width - 40} height={300} viewBox="0 0 320 320">
                  <Circle cx="160" cy="160" r="105" fill="none" stroke="#F1F5F9" strokeWidth="1" />
                  {Object.entries(result.domain_scores).map(([domain, score]: [string, any], i, arr) => {
                    const angle = (i / arr.length) * 2 * Math.PI - Math.PI / 2;
                    const nextAngle = ((i + 1) / arr.length) * 2 * Math.PI - Math.PI / 2;
                    const midAngle = (angle + nextAngle) / 2;
                    
                    const innerR = 55;
                    const outerR = 90;
                    const labelR = 145; // Further out to avoid lines
                    const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];
                    const color = colors[i % colors.length];

                    const x1 = 160 + innerR * Math.cos(angle);
                    const y1 = 160 + innerR * Math.sin(angle);
                    const x2 = 160 + outerR * Math.cos(angle);
                    const y2 = 160 + outerR * Math.sin(angle);
                    const x3 = 160 + outerR * Math.cos(nextAngle);
                    const y3 = 160 + outerR * Math.sin(nextAngle);
                    const x4 = 160 + innerR * Math.cos(nextAngle);
                    const y4 = 160 + innerR * Math.sin(nextAngle);

                    const lx = 160 + labelR * Math.cos(midAngle);
                    const ly = 160 + labelR * Math.sin(midAngle);

                    return (
                      <G key={domain}>
                        <Path d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`} fill={color} opacity={0.9} />
                        <Path d={`M ${160 + outerR * Math.cos(midAngle)} ${160 + outerR * Math.sin(midAngle)} L ${lx} ${ly}`} stroke={color} strokeWidth="1.5" strokeDasharray="3,3" />
                        <G transform={`translate(${lx - 22}, ${ly - 22})`}>
                          <Circle cx="22" cy="22" r="22" fill="#fff" stroke={color} strokeWidth="2" />
                          <SvgText x="22" y="24" fontSize="12" fill="#1E293B" fontWeight="900" textAnchor="middle">{Math.round(score * 100)}</SvgText>
                          <SvgText x="22" y="55" fontSize="10" fill="#64748B" fontWeight="800" textAnchor="middle">{domain.length > 9 ? domain.substring(0, 8) + '..' : domain}</SvgText>
                        </G>
                      </G>
                    );
                  })}
                  <Circle cx="160" cy="160" r="53" fill="#fff" />
                  <SvgText x="160" y="150" fontSize="10" fill="#94A3B8" textAnchor="middle" fontWeight="800">BRAIN AGE</SvgText>
                  <SvgText x="160" y="178" fontSize="26" fill="#1E293B" textAnchor="middle" fontWeight="900">
                    {Math.round(Math.max(0.15, Object.values(result.domain_scores).reduce((a: any, b: any) => a + b, 0) as number / Object.keys(result.domain_scores).length) * 100)}
                  </SvgText>
                </Svg>
              </View>
            </Animated.View>
          )}

          {/* AI Recommendations */}
          {result.recommendations && (
            <Animated.View entering={FadeInDown.delay(450)} style={styles.recPremiumCard}>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons name="lightbulb-on" size={24} color="#059669" />
                <Text style={[styles.summaryTitle, { color: '#059669', fontSize: 18 }]}>Expert Recommendations</Text>
              </View>
              
              <View style={{ marginTop: 15 }}>
                {Array.isArray(result.recommendations) ? (
                  result.recommendations.map((rec: string, i: number) => (
                    <View key={`flat-${i}`} style={styles.recRowItem}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="checkmark" size={16} color="#059669" />
                      </View>
                      <Text style={styles.recRowText}>{rec}</Text>
                    </View>
                  ))
                ) : (
                  <>
                    {result.recommendations.immediate?.map((rec: string, i: number) => (
                      <View key={`imm-${i}`} style={styles.recRowItem}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="alert" size={16} color="#DC2626" />
                        </View>
                        <Text style={[styles.recRowText, { color: '#991B1B' }]}>{rec}</Text>
                      </View>
                    ))}
                    {result.recommendations.lifestyle?.map((rec: string, i: number) => (
                      <View key={`life-${i}`} style={styles.recRowItem}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="fitness" size={16} color="#2563EB" />
                        </View>
                        <Text style={[styles.recRowText, { color: '#1E40AF' }]}>{rec}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </Animated.View>
          )}

          {/* Download Report Button */}
          {result.report && (
            <Animated.View entering={FadeInDown.delay(500)}>
              <TouchableOpacity style={styles.reportBtn} onPress={viewReport}>
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.reportBtnGradient}>
                  <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />
                  <Text style={styles.reportBtnText}>View & Download Report</Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
            <Text style={styles.exitBtnText}>Finish</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Question Screen
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinical Assessment</Text>
        <Text style={styles.questionCount}>{currentQuestion + 1}/{questions.length}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown} style={styles.questionCard}>
          {/* Category Badge */}
          <View style={styles.questionHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(question?.category) }]}>
              <Text style={styles.categoryText}>{question?.category?.toUpperCase()}</Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: getTypeBgColor(question?.type) }]}>
              <Text style={styles.typeText}>
                {question?.type === 'yes_no' ? 'Yes/No' : question?.type === 'text_input' ? 'Text' : 'MCQ'}
              </Text>
            </View>
          </View>

          <Text style={styles.questionNumber}>Question {currentQuestion + 1}</Text>
          <Text style={styles.questionText}>{question?.question}</Text>

          {/* YES/NO Input */}
          {question?.type === 'yes_no' && (
            <View style={styles.yesNoContainer}>
              <TouchableOpacity style={styles.yesBtn} onPress={() => handleYesNo(true)}>
                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                <Text style={styles.yesBtnText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.noBtn} onPress={() => handleYesNo(false)}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
                <Text style={styles.noBtnText}>No</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TEXT INPUT */}
          {question?.type === 'text_input' && (
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder={question?.placeholder || 'Type your response here...'}
                placeholderTextColor="#94A3B8"
                value={textInputValue}
                onChangeText={(text) => {
                  setTextInputValue(text);
                  recordInput(text);
                }}
              />
              {question?.scoring_note && (
                <Text style={styles.scoringNote}>{question.scoring_note}</Text>
              )}
              <TouchableOpacity style={styles.submitTextBtn} onPress={handleTextSubmit}>
                <Text style={styles.submitTextBtnText}>Submit Response</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* MCQ Options - also as fallback for questions with options but unknown type */}
          {(question?.type === 'mcq' || (!['yes_no', 'text_input'].includes(question?.type) && question?.options)) && (
            <View style={styles.optionsContainer}>
              {question?.options?.map((option: any, index: number) => (
                <Animated.View key={index} entering={FadeInDown.delay(index * 80)}>
                  <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={() => handleMCQ(option)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionText}>{option.text}</Text>
                    {option.severity && (
                      <View style={[styles.severityChip, { backgroundColor: getSeverityColor(option.severity) }]}>
                        <Text style={styles.severityChipText}>{option.severity}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="#64748B" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Memory': '#EEF2FF',
    'Attention': '#F0FDF4',
    'Language': '#FEF3C7',
    'Motor': '#FEE2E2',
    'Executive Function': '#EDE9FE',
    'Visuospatial': '#CFFAFE',
    'Orientation': '#FCE7F3',
    'Daily Living': '#ECFDF5'
  };
  return colors[category] || '#F3F4F6';
};

const getTypeBgColor = (type: string) => {
  if (type === 'yes_no') return '#D1FAE5';
  if (type === 'text_input') return '#DBEAFE';
  return '#F3E8FF';
};

const getSeverityColor = (severity: string) => {
  if (severity === 'Severe') return '#FEE2E2';
  if (severity === 'Moderate') return '#FEF3C7';
  if (severity === 'Mild') return '#DBEAFE';
  return '#D1FAE5';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 40 },
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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  questionCount: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  progressContainer: { height: 4, backgroundColor: '#F1F5F9' },
  progressBar: { height: '100%', backgroundColor: '#10B981' },
  scrollContent: { padding: 20 },
  questionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  questionHeader: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 10, fontWeight: '700', color: '#6366F1' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '600', color: '#1E293B' },
  questionNumber: { fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 8 },
  questionText: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 24, lineHeight: 26 },
  
  // Yes/No Buttons
  yesNoContainer: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  yesBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#D1FAE5', borderRadius: 16, paddingVertical: 20, borderWidth: 2, borderColor: '#10B981' },
  yesBtnText: { fontSize: 18, fontWeight: '700', color: '#059669' },
  noBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FEE2E2', borderRadius: 16, paddingVertical: 20, borderWidth: 2, borderColor: '#EF4444' },
  noBtnText: { fontSize: 18, fontWeight: '700', color: '#DC2626' },
  
  // Text Input
  textInputContainer: { gap: 16 },
  textInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 16, color: '#1E293B', borderWidth: 2, borderColor: '#E2E8F0', minHeight: 120, textAlignVertical: 'top' },
  scoringNote: { fontSize: 12, color: '#64748B', fontStyle: 'italic', textAlign: 'center' },
  submitTextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16 },
  submitTextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  
  // MCQ Options
  optionsContainer: { gap: 12 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#F1F5F9' },
  optionText: { fontSize: 14, color: '#1E293B', fontWeight: '500', flex: 1 },
  severityChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  severityChipText: { fontSize: 10, fontWeight: '700', color: '#1E293B' },
  
  // Result Screen
  resultHeaderCard: { borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 20 },
  severityBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12 },
  severityText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  
  predictionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  predictionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  predictionTitle: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  diseaseText: { fontSize: 26, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  predictionMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, alignItems: 'center' },
  metaLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  metaValue: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  
  summaryCard: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FEF3C7' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  summaryText: { fontSize: 14, color: '#78350F', lineHeight: 22 },

  xaiCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  xaiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  xaiTitle: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  xaiRow: { marginBottom: 12 },
  xaiLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  xaiLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  xaiPercentage: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  xaiBarBg: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  xaiBarFill: { height: '100%', borderRadius: 3 },

  reasoningCard: { backgroundColor: '#ECFDF5', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#D1FAE5' },
  reasoningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reasoningTitle: { fontSize: 14, fontWeight: '700', color: '#065F46' },
  reasoningText: { fontSize: 14, color: '#065F46', lineHeight: 22 },
  
  domainCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  domainTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  domainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  domainName: { width: 100, fontSize: 12, fontWeight: '600', color: '#64748B' },
  domainBarBg: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  domainBarFill: { height: '100%', borderRadius: 4 },
  domainPercent: { width: 40, fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  
  reportBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  reportBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  reportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  exitBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E2E8F0', marginTop: 10 },
  exitBtnText: { color: "#64748B", fontSize: 16, fontWeight: "700" },
  premiumCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHighlightTitle: { fontSize: 16, fontWeight: "800", color: "#64748B", marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  gaugeHolder: { alignItems: "center", width: "100%", height: 160, justifyContent: 'center' },
  domainPremiumCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 32,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'visible'
  },
  sectionTitleCenter: { fontSize: 22, fontWeight: "900", color: "#1E293B", textAlign: "center", marginBottom: 10 },
  radialHolder: { alignItems: "center", marginVertical: 30 },
  recPremiumCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  recRowItem: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: 12,
    borderRadius: 16,
  },
  recRowText: { 
    fontSize: 15, 
    color: "#166534", 
    flex: 1, 
    lineHeight: 24, 
    fontWeight: '600',
    marginLeft: 12
  },

  // Keeping old styles for backwards compatibility
  resultTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  // Start Screen Styles
  startCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  startHeaderGradient: { padding: 32, alignItems: 'center' },
  startTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 16, textAlign: 'center' },
  startSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center' },
  infoSection: { padding: 24, gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 15, color: '#475569', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 24 },
  optionSection: { padding: 24 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  optionDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  startBtn: { margin: 24, borderRadius: 18, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  caregiverExplanation: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
  },
  caregiverExplanationText: {
    fontSize: 12,
    color: '#4338CA',
    flex: 1,
    lineHeight: 18,
  },
});
