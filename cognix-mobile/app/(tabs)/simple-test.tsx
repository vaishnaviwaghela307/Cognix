import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Svg, { Path, Circle, G, Line, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
} from "@/constants/theme";
import { Dimensions } from "react-native";
import NotificationService from "@/services/notifications";
import HistoryService from "@/services/history";
import { useCognitiveTracking } from "@/hooks/useCognitiveTracking";

const FLASK_URL =
  process.env.EXPO_PUBLIC_FLASK_URL || "https://cognix-flask-server-x2u5.onrender.com";

type TestState = "loading" | "ready" | "testing" | "result";

export default function SimpleTestScreen() {
  const router = useRouter();
  const { user } = useUser();
  const {
    recordAnswerChange,
    getLatestMetrics,
    calculateIndicators,
    startQuestion,
    endQuestion,
  } = useCognitiveTracking();
  const [state, setState] = useState<TestState>("loading");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [mlPrediction, setMlPrediction] = useState<any>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setState("loading");
    try {
      const response = await fetch(
        `${FLASK_URL}/test/quick/generate-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();
      if (data.success && data.questions) {
        setQuestions(data.questions);
        setUserAnswers(new Array(data.questions.length).fill(-1));
        setState("ready");
      } else {
        throw new Error("Failed to load questions");
      }
    } catch {
      Alert.alert("Error", "Failed to load questions");
      setState("ready");
    }
  };

  const startTest = () => {
    setState("testing");
    setCurrentQuestion(0);
    startQuestion();
  };

  const selectAnswer = (answerIndex: number) => {
    if (
      userAnswers[currentQuestion] !== -1 &&
      userAnswers[currentQuestion] !== answerIndex
    ) {
      recordAnswerChange();
    }
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const nextQuestion = () => {
    endQuestion();
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      startQuestion();
    } else {
      finishTest();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const finishTest = async () => {
    setState("loading");

    try {
      const answersForAnalysis = questions.map((q: any, idx: number) => ({
        question: q.question,
        category: q.category,
        selectedOption:
          q.options?.[userAnswers[idx]]?.text ||
          q.options?.[userAnswers[idx]] ||
          "Not answered",
        score: q.options?.[userAnswers[idx]]?.score ?? userAnswers[idx],
      }));

      const latestMetrics = getLatestMetrics();
      const response = await fetch(`${FLASK_URL}/test/quick/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersForAnalysis,
          user_id: user?.id || "anonymous",
          behavioral_metrics: latestMetrics,
        }),
      });

      const analysisResult = await response.json();

      if (analysisResult.success) {
        setMlPrediction(analysisResult);

        const domainScores = analysisResult.domain_scores || {};
        const scoreValues = Object.values(domainScores) as number[];
        const domainAvg =
          scoreValues.length > 0
            ? (scoreValues.reduce((a: number, b: any) => a + b, 0) /
                scoreValues.length) *
              100
            : 60;

        let predictionAdjustment = 0;
        const disease = analysisResult.prediction?.disease || "";
        const conf = (analysisResult.prediction?.confidence || 0) * 100;

        if (
          disease.toLowerCase().includes("healthy") ||
          disease.toLowerCase() === "none" ||
          disease.toLowerCase().includes("assessment complete")
        ) {
          predictionAdjustment = conf / 3;
        } else {
          // If a condition is detected, the health index decreases based on confidence
          // But we don't want it to drop to 0 instantly if domain scores are okay
          predictionAdjustment = -(conf / 2);
        }

        const brainHealthScore = Math.max(
          15, // Baseline minimum score to avoid 0% which is discouraging
          Math.min(98, Math.round(domainAvg + predictionAdjustment))
        );

        setTestResult({
          summary: analysisResult.summary,
          riskLevel: analysisResult.prediction?.risk || "Moderate",
          score: brainHealthScore,
          totalQuestions: questions.length,
          percentage: brainHealthScore,
          answers: answersForAnalysis,
          report: analysisResult.report,
          recommendations: analysisResult.recommendations,
        });

        if (user?.id) {
          const indicators = calculateIndicators(latestMetrics);
          await HistoryService.saveHistory({
            userId: user.id,
            type: "test",
            testInfo: {
              testType: "Cognitive Screening",
              score: brainHealthScore,
              maxScore: 100,
              percentage: brainHealthScore,
            },
            prediction: {
              disease: analysisResult.prediction?.disease,
              confidence: analysisResult.prediction?.confidence,
              severity:
                analysisResult.prediction?.risk === "High"
                  ? "Significant"
                  : "Mild",
              riskLevel: analysisResult.prediction?.risk,
            },
            summary: analysisResult.summary,
            recommendations: analysisResult.recommendations,
            report: analysisResult.report
              ? {
                  reportId: analysisResult.report.report_id,
                  reportUrl: analysisResult.report.report_url,
                  generatedAt: new Date().toISOString(),
                  reportType: "quick_test",
                }
              : undefined,
            behavioralMetrics: {
              ...latestMetrics,
              ...indicators,
              aiBehavioralSummary: analysisResult.behavioral_summary || "",
            },
            cognitiveScores: {
              memory: (analysisResult.domain_scores?.Memory || 0.6) * 10,
              attention: (analysisResult.domain_scores?.Attention || 0.6) * 10,
              language: (analysisResult.domain_scores?.Language || 0.6) * 10,
              executiveFunction:
                (analysisResult.domain_scores?.["Executive Function"] || 0.6) *
                10,
            },
          } as any);
        }

        await NotificationService.sendTestCompleteNotification(
          "Cognitive Screening",
          analysisResult.prediction?.confidence * 100 || 0,
          analysisResult.prediction?.risk || "Moderate",
          analysisResult.prediction?.disease
        );
        setState("result");
      } else {
        throw new Error(analysisResult.error || "Failed to analyze test");
      }
    } catch (error) {
      console.error("❌ Analysis failed:", error);
      Alert.alert(
        "Analysis Failed",
        "Could not analyze results. Please try again."
      );
      setState("ready");
    }
  };

  const viewReport = () => {
    if (testResult?.report) {
      const fullUrl = `${FLASK_URL}${testResult.report.report_url}`;
      router.push({
        pathname: "/pdf-viewer",
        params: {
          url: fullUrl,
          title: "Rapid Screening Report",
        },
      });
    }
  };

  const retakeTest = () => {
    loadQuestions();
    setCurrentQuestion(0);
    setTestResult(null);
    setMlPrediction(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "memory":
        return "🧠";
      case "attention":
        return "👁️";
      case "language":
        return "💬";
      case "motor":
        return "🖐️";
      default:
        return "📝";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "memory":
        return COLORS.alzheimers;
      case "attention":
        return COLORS.parkinsons;
      case "language":
        return COLORS.mci;
      case "motor":
        return COLORS.vascular;
      default:
        return COLORS.primary;
    }
  };

  if (state === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Test</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Initializing Analysis...</Text>
          <Text style={styles.loadingSubtext}>
            Syncing with neural linguistic models
          </Text>
        </View>
      </View>
    );
  }

  if (state === "ready") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Test</Text>
          <Text style={styles.headerSubtitle}>
            Clinical Screening Assessment
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeIcon}>🧠</Text>
            <Text style={styles.welcomeTitle}>Quick Test</Text>
            <Text style={styles.welcomeDescription}>
              This is a clinical-grade screening assessment that provides an
              in-depth analysis of your brain functions.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Test Details:</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📝</Text>
              <Text style={styles.infoText}>{questions.length} Questions</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏱️</Text>
              <Text style={styles.infoText}>~7-10 minutes</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✅</Text>
              <Text style={styles.infoText}>Clinical Screening</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startTest}>
            <Text style={styles.startButtonText}>Start Assessment</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (state === "testing") {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Question {currentQuestion + 1}/{questions.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(question.category) + "20" },
            ]}
          >
            <Text style={styles.categoryBadgeIcon}>
              {getCategoryIcon(question.category)}
            </Text>
            <Text
              style={[
                styles.categoryBadgeText,
                { color: getCategoryColor(question.category) },
              ]}
            >
              {question.category.toUpperCase()}
            </Text>
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.question}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {question.options.map((option: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  userAnswers[currentQuestion] === index &&
                    styles.optionButtonSelected,
                ]}
                onPress={() => selectAnswer(index)}
              >
                <View
                  style={[
                    styles.optionRadio,
                    userAnswers[currentQuestion] === index &&
                      styles.optionRadioSelected,
                  ]}
                >
                  {userAnswers[currentQuestion] === index && (
                    <View style={styles.optionRadioDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    userAnswers[currentQuestion] === index &&
                      styles.optionTextSelected,
                  ]}
                >
                  {option.text || option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.navigationButtons}>
            {currentQuestion > 0 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={previousQuestion}
              >
                <Text style={styles.navButtonText}>← Previous</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.navButtonPrimary,
                userAnswers[currentQuestion] === -1 && styles.navButtonDisabled,
              ]}
              onPress={nextQuestion}
              disabled={userAnswers[currentQuestion] === -1}
            >
              <Text style={styles.navButtonTextPrimary}>
                {currentQuestion === questions.length - 1 ? "Finish" : "Next →"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (state === "result" && testResult) {
    const domainAssessmentData = [
      "Memory",
      "Attention",
      "Language",
      "Motor",
      "Executive Function",
      "Visuospatial",
    ];
    
    const categoryPerformance = domainAssessmentData
      .map((category) => {
        const aiScore = mlPrediction?.domain_scores?.[category];
        return { 
          name: category, 
          percentage: aiScore !== undefined ? Math.round(aiScore * 100) : 60 
        };
      });

    const getRiskColor = (risk: string) =>
      risk === "High" ? "#EF4444" : risk === "Moderate" ? "#F59E0B" : "#10B981";

    // Gauge Component for Image 0 style
    const HealthGauge = ({ score }: { score: number }) => {
      const radius = 80;
      const strokeWidth = 16;
      const circumference = radius * Math.PI; // Half circle
      const rotation = (score / 100) * 180 - 90;
      
      return (
        <View style={styles.gaugeContainer}>
          <Svg width={240} height={140} viewBox="0 0 240 140">
            <Defs>
              <SvgGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#EF4444" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#10B981" />
              </SvgGradient>
            </Defs>
            {/* Background Arc */}
            <Path
              d="M 40 120 A 80 80 0 0 1 200 120"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active Progress Arc */}
            <Path
              d="M 40 120 A 80 80 0 0 1 200 120"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
            />
            {/* Centered Large Score */}
            <SvgText 
              x="120" 
              y="115" 
              fontSize="42" 
              fill="#1E293B" 
              fontWeight="800" 
              textAnchor="middle"
            >
              {score}
            </SvgText>
            {/* Health Label */}
            <SvgText 
              x="120" 
              y="135" 
              fontSize="12" 
              fill="#64748B" 
              fontWeight="600" 
              textAnchor="middle"
            >
              Quick Test
            </SvgText>
            
            {/* Needle */}
            <G transform={`rotate(${rotation}, 120, 120)`}>
              <Line x1="120" y1="120" x2="120" y2="50" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
              <Circle cx="120" cy="120" r="8" fill="#1E293B" />
              <Circle cx="120" cy="120" r="4" fill="#fff" />
            </G>
            
            <SvgText x="35" y="135" fontSize="10" fill="#94A3B8" fontWeight="bold">Newcomer</SvgText>
            <SvgText x="185" y="135" fontSize="10" fill="#94A3B8" fontWeight="bold">Expert</SvgText>
          </Svg>
        </View>
      );
    };

    // Radial Map Component for Image 2 style
    const RadialBrainMap = ({ data }: { data: any[] }) => {
      const windowWidth = Dimensions.get('window').width - 80;
      const size = Math.min(windowWidth, 310);
      const center = size / 2;
      const innerRadius = size * 0.18;
      const outerRadius = size * 0.28;
      const labelRadius = size * 0.42;
      
      const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

      return (
        <View style={styles.radialContainer}>
          <Svg width={size} height={size}>
            {/* Outer Rings */}
            <Circle cx={center} cy={center} r={outerRadius + 10} fill="none" stroke="#F8FAFC" strokeWidth="1" />
            
            {data.map((item, i) => {
              const angle = (i / data.length) * 2 * Math.PI - Math.PI / 2;
              const nextAngle = ((i + 1) / data.length) * 2 * Math.PI - Math.PI / 2;
              
              // Segment path
              const x1 = center + innerRadius * Math.cos(angle);
              const y1 = center + innerRadius * Math.sin(angle);
              const x2 = center + outerRadius * Math.cos(angle);
              const y2 = center + outerRadius * Math.sin(angle);
              const x3 = center + outerRadius * Math.cos(nextAngle);
              const y3 = center + outerRadius * Math.sin(nextAngle);
              const x4 = center + innerRadius * Math.cos(nextAngle);
              const y4 = center + innerRadius * Math.sin(nextAngle);

              const arcPath = `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`;
              
              // Mid-angle for labels
              const midAngle = (angle + nextAngle) / 2;
              const lx = center + labelRadius * Math.cos(midAngle);
              const ly = center + labelRadius * Math.sin(midAngle);
              
              const cx_mid = center + outerRadius * Math.cos(midAngle);
              const cy_mid = center + outerRadius * Math.sin(midAngle);

              return (
                <G key={item.name}>
                  {/* Segment with slight opacity if low score */}
                  <Path 
                    d={arcPath} 
                    fill={colors[i % colors.length]} 
                    opacity={0.85}
                  />
                  
                  {/* Callout Line */}
                  <Path 
                    d={`M ${cx_mid} ${cy_mid} L ${lx} ${ly}`} 
                    stroke={colors[i % colors.length]} 
                    strokeWidth="1.5" 
                    strokeDasharray="2,2"
                  />
                  
                  {/* Label Badge */}
                  <G transform={`translate(${lx - 20}, ${ly - 20})`}>
                    <Circle cx="20" cy="20" r="20" fill="#fff" stroke={colors[i % colors.length]} strokeWidth="2" />
                    <SvgText 
                      x="20" 
                      y="20" 
                      fontSize="12" 
                      fill="#1E293B" 
                      fontWeight="800" 
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {item.percentage}
                    </SvgText>
                    {/* Responsive Text Positioning */}
                    <SvgText 
                      x="20" 
                      y="45" 
                      fontSize="9" 
                      fill="#64748B" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {item.name.length > 8 ? item.name.substring(0, 7) + '..' : item.name}
                    </SvgText>
                  </G>
                </G>
              );
            })}
            
            {/* Center Circle Shadow */}
            <Circle cx={center} cy={center} r={innerRadius - 2} fill="#fff" />
            <SvgText x={center} y={center - 8} fontSize="8" fill="#94A3B8" textAnchor="middle" fontWeight="700">AVG BRAIN</SvgText>
            <SvgText x={center} y={center + 12} fontSize="20" fill="#1E293B" textAnchor="middle" fontWeight="900">{testResult.score}</SvgText>
          </Svg>
        </View>
      );
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Test Report</Text>
        </View>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Gauge Card (Image 0 Style) */}
          <Animated.View entering={FadeInUp} style={styles.premiumCard}>
            <Text style={styles.cardHighlightTitle}>Score</Text>
            <HealthGauge score={testResult.score} />
          </Animated.View>

          {/* Radial Domain Map (Image 2 Style) */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.domainSection}>
             <Text style={styles.sectionTitleCenter}>Domain Assessment</Text>
             <RadialBrainMap data={categoryPerformance} />
          </Animated.View>

          {/* Prediction Results */}
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={[
              styles.predictionResultsCard,
              { borderTopColor: getRiskColor(testResult.riskLevel) }
            ]}
          >
            <View style={styles.predictionRow}>
              <View style={styles.predictionInfo}>
                 <Text style={styles.predictionLabel}>Pattern Detection</Text>
                 <Text style={styles.predictionDiseaseMain}>
                    {mlPrediction.prediction?.disease &&
                    mlPrediction.prediction.disease !== "NA"
                      ? mlPrediction.prediction.disease
                      : "Assessment Complete"}
                 </Text>
              </View>
              <View
                style={[
                  styles.riskBadge,
                  { backgroundColor: getRiskColor(testResult.riskLevel) + '15' },
                ]}
              >
                <Text style={[styles.riskBadgeText, { color: getRiskColor(testResult.riskLevel) }]}>
                  {testResult.riskLevel} Risk
                </Text>
              </View>
            </View>
            
            <View style={styles.confidenceSection}>
              <View style={styles.confidenceLabelRow}>
                <Text style={styles.confidenceLabel}>AI Confidence</Text>
                <Text style={[styles.confidenceValue, { color: getRiskColor(testResult.riskLevel) }]}>
                  {((mlPrediction.prediction?.confidence || 0) * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.confidenceBarBg}>
                <View
                  style={[
                    styles.confidenceBarFill,
                    {
                      width: `${(mlPrediction.prediction?.confidence || 0) * 100}%`,
                      backgroundColor: getRiskColor(testResult.riskLevel),
                    },
                  ]}
                />
              </View>
            </View>
          </Animated.View>

          {/* AI Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons name="robot-outline" size={20} color="#92400E" />
              <Text style={styles.summaryTitle}>AI Clinical Analysis</Text>
            </View>
            <Text style={styles.summaryText}>{testResult.summary}</Text>
          </View>

          {/* AI Recommendations - Handling both structured and flat array formats */}
          {testResult.recommendations && (
            <View style={styles.recommendationsCard}>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#065F46" />
                <Text style={[styles.summaryTitle, { color: "#065F46" }]}>Key Recommendations</Text>
              </View>
              
              {/* If it's a flat array of strings */}
              {Array.isArray(testResult.recommendations) && testResult.recommendations.map((rec: string, i: number) => (
                <View key={`flat-${i}`} style={styles.recItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}

              {/* If it's an object with categories (immediate, lifestyle) */}
              {!Array.isArray(testResult.recommendations) && testResult.recommendations.immediate?.map((rec: string, i: number) => (
                <View key={`imm-${i}`} style={styles.recItem}>
                  <Ionicons name="alert-circle" size={16} color="#10B981" />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
              {!Array.isArray(testResult.recommendations) && testResult.recommendations.lifestyle?.map((rec: string, i: number) => (
                <View key={`life-${i}`} style={styles.recItem}>
                  <Ionicons name="fitness" size={16} color="#10B981" />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {testResult.report && (
              <TouchableOpacity
                style={styles.viewReportBtn}
                onPress={viewReport}
              >
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.buttonGradient}>
                   <Ionicons name="document-text" size={20} color="#fff" />
                   <Text style={styles.buttonText}>View Detailed Report</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.retakeBtnOutline} onPress={retakeTest}>
              <Text style={styles.retakeBtnText}>Take New Assessment</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  headerTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.lg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: SPACING.lg },
  loadingSubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
  },
  welcomeIcon: { fontSize: 64, marginBottom: SPACING.md },
  welcomeTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  welcomeDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.surface,
    textAlign: "center",
    opacity: 0.9,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  infoTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.md },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  infoIcon: { fontSize: 20, marginRight: SPACING.sm },
  infoText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    ...SHADOWS.md,
  },
  startButtonText: { ...TYPOGRAPHY.button, color: COLORS.surface },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: COLORS.primary },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  categoryBadgeIcon: { fontSize: 16, marginRight: 4 },
  categoryBadgeText: { ...TYPOGRAPHY.caption, fontWeight: "600" },
  questionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  questionText: { ...TYPOGRAPHY.h3, color: COLORS.text, lineHeight: 32 },
  optionsContainer: { marginBottom: SPACING.lg },
  optionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "10",
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
  },
  optionRadioSelected: { borderColor: COLORS.primary },
  optionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  optionText: { ...TYPOGRAPHY.body, color: COLORS.text, flex: 1 },
  optionTextSelected: { color: COLORS.primary, fontWeight: "600" },
  navigationButtons: { flexDirection: "row", gap: 10 },
  navButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  navButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  navButtonDisabled: { opacity: 0.5 },
  navButtonText: { ...TYPOGRAPHY.button, color: COLORS.text },
  navButtonTextPrimary: { ...TYPOGRAPHY.button, color: COLORS.surface },
  gaugeContainer: { alignItems: "center", width: "100%", height: 160, marginTop: 10, justifyContent: 'center' },
  radialContainer: { alignItems: "center", marginVertical: 35 },
  premiumCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    ...SHADOWS.lg,
  },
  cardHighlightTitle: { fontSize: 18, fontWeight: "800", color: "#64748B", marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  domainSection: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 32,
    marginBottom: 20,
    ...SHADOWS.lg,
    overflow: 'visible'
  },
  sectionTitleCenter: { fontSize: 22, fontWeight: "900", color: "#1E293B", textAlign: "center", marginBottom: 5 },
  predictionResultsCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderTopWidth: 6,
    ...SHADOWS.md,
  },
  predictionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 20 },
  predictionInfo: { flex: 1 },
  predictionLabel: { fontSize: 12, fontWeight: "800", color: "#64748B", textTransform: 'uppercase', marginBottom: 4 },
  predictionDiseaseMain: { fontSize: 24, fontWeight: "900", color: "#1E293B" },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  riskBadgeText: { fontSize: 13, fontWeight: "800" },
  confidenceSection: { width: "100%" },
  confidenceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  confidenceLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  confidenceValue: { fontSize: 14, fontWeight: '800' },
  confidenceBarBg: { width: "100%", height: 8, backgroundColor: "#F1F5F9", borderRadius: 10, overflow: "hidden" },
  confidenceBarFill: { height: "100%", borderRadius: 10 },
  summaryCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: "#92400E" },
  summaryText: { fontSize: 15, color: "#78350F", lineHeight: 24 },
  recommendationsCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  recItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  recText: { fontSize: 14, color: "#065F46", flex: 1, lineHeight: 22, fontWeight: '500' },
  actionRow: { marginTop: 10, gap: 12 },
  viewReportBtn: { borderRadius: 18, overflow: "hidden", ...SHADOWS.md },
  buttonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 12 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  retakeBtnOutline: { paddingVertical: 18, borderRadius: 18, borderWidth: 2, borderColor: "#E2E8F0", alignItems: "center", backgroundColor: '#fff' },
  retakeBtnText: { color: "#64748B", fontSize: 16, fontWeight: "700" },
});
