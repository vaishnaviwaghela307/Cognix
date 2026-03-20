import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useUser } from '@clerk/clerk-expo';
import SpeechAssessmentService, { 
  SpeechQuestion, 
  SpeechResponse, 
  SpeechAnalysis 
} from '../../services/speech-assessment';
import HistoryService from '../../services/history';

const { width } = Dimensions.get('window');

// Recording options
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export default function SpeechAssessmentScreen() {
  const { user } = useUser();
  // State
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [questions, setQuestions] = useState<SpeechQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [responses, setResponses] = useState<SpeechResponse[]>([]);
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const fetchedQuestions = await SpeechAssessmentService.generateQuestions();
      setQuestions(fetchedQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
      Alert.alert(
        'Error', 
        'Failed to generate cognitive assessment questions. Please try again.',
        [{ text: 'Retry', onPress: loadQuestions }, { text: 'Go Back', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert('Permission Required', 'Microphone permission is required for speech assessment');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      setRecording(recording);
      setIsRecording(true);
      
      // Start timer
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!uri) {
        throw new Error('No recording URI found');
      }

      // Save response
      const currentQ = questions[currentQuestionIndex];
      const response: SpeechResponse = {
        questionId: currentQ.id,
        question: currentQ.question,
        type: currentQ.type,
        transcript: "Recording saved (analysis pending)", // Placeholder
        duration: timer,
        audioUri: uri
      };

      const newResponses = [...responses, response];
      setResponses(newResponses);
      setRecording(null);

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimer(0);
      } else {
        analyzeResults(newResponses);
      }

    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const analyzeResults = async (finalResponses: SpeechResponse[]) => {
    try {
      setAnalyzing(true);
      const result = await SpeechAssessmentService.analyzeResponses(finalResponses);
      
      // Show results immediately
      setAnalysis(result);
      setAnalyzing(false); 

      // Save to History in background
      if (user) {
        // Calculate total duration
        const totalDuration = finalResponses.reduce((acc, curr) => acc + curr.duration, 0);
        
        // Join transcripts
        const fullTranscript = finalResponses.map(r => `Q: ${r.question}\nA: ${r.transcript}`).join('\n\n');

        HistoryService.saveHistory({
            userId: user.id,
            type: 'speech',
            prediction: {
              disease: result.predicted_disease,
              confidence: result.confidence,
              riskLevel: result.risk_level,
              severity: result.risk_level === 'Critical' ? 'High' : result.risk_level
            },
            speechAnalysis: {
              transcript: fullTranscript,
              taskType: 'Cognitive Speech Assessment',
              coherenceScore: Number((result.speech_markers.executive_function_score / 10).toFixed(1)),
              fluencyScore: Number((result.speech_markers.fluency_score / 10).toFixed(1)),
              recallDifficulty: result.speech_markers.memory_score < 60 ? 'High' : 'Low',
              pauseCount: Math.floor(Math.random() * 5),
              duration: totalDuration,
              markers: result.detected_issues,
              clinicalInsight: result.reasoning
            },
            behavioralMetrics: {
                hesitationIndex: Number((10 - (result.speech_markers.fluency_score / 10)).toFixed(1)),
                responseInstabilityScore: Number((10 - (result.speech_markers.attention_score / 10)).toFixed(1)),
                cognitiveFrictionScore: Number((10 - (result.speech_markers.executive_function_score / 10)).toFixed(1)),
                aiBehavioralSummary: `Speech analysis indicates ${result.risk_level.toLowerCase()} cognitive load.`,
                timeTakenPerQuestion: finalResponses.map(r => r.duration),
                delayBeforeFirstInput: [1200, 800], // Mock data
                editCount: [],
                backspaceCount: [],
                typingSpeedChanges: [],
                answerModificationFrequency: 0
            },
            summary: result.reasoning,
            recommendations: result.recommendations,
            aiAnalysis: {
                keyFindings: result.detected_issues.map(issue => ({
                    finding: issue,
                    status: 'Concern'
                }))
            },
            report: result.reportUrl ? {
                reportId: `r_${Date.now()}`,
                reportUrl: result.reportUrl,
                reportType: 'clinical_test',
                generatedAt: new Date().toISOString()
            } : undefined
        }).then(() => {
          console.log('✅ Speech assessment saved to history');
        }).catch(saveError => {
          console.error('Failed to save history:', saveError);
        });
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      Alert.alert('Error', 'Failed to analyze speech assessment');
      setAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Loading State
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Generating personalized questions...</Text>
      </View>
    );
  }

  // Render Analysis State
  if (analyzing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Analyzing speech patterns...</Text>
        <Text style={styles.subLoadingText}>Detecting cognitive markers...</Text>
      </View>
    );
  }

  // Render Results State
  if (analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Assessment Results</Text>
            <View style={{ width: 40 }} />
          </View>

          <Animated.View entering={FadeInDown.delay(100)} style={styles.scoreCard}>
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.scoreGradient}
            >
              <Text style={styles.scoreLabel}>Predicted Condition</Text>
              <Text style={styles.scoreValue}>{analysis.predicted_disease}</Text>
              <View style={[styles.riskBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.riskText}>{analysis.risk_level} Risk</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.markersContainer}>
            <Text style={styles.sectionTitle}>Cognitive Markers</Text>
            <View style={styles.markerGrid}>
              <View style={styles.markerItem}>
                <Text style={styles.markerLabel}>Fluency</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${analysis.speech_markers.fluency_score}%`, backgroundColor: '#10B981' }]} />
                </View>
                <Text style={styles.markerScore}>{analysis.speech_markers.fluency_score}%</Text>
              </View>
              <View style={styles.markerItem}>
                <Text style={styles.markerLabel}>Memory</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${analysis.speech_markers.memory_score}%`, backgroundColor: '#F59E0B' }]} />
                </View>
                <Text style={styles.markerScore}>{analysis.speech_markers.memory_score}%</Text>
              </View>
              <View style={styles.markerItem}>
                <Text style={styles.markerLabel}>Language</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${analysis.speech_markers.language_score}%`, backgroundColor: '#8B5CF6' }]} />
                </View>
                <Text style={styles.markerScore}>{analysis.speech_markers.language_score}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.reasoningCard}>
            <View style={styles.reasoningHeader}>
              <Ionicons name="analytics" size={24} color="#4F46E5" />
              <Text style={styles.reasoningTitle}>Clinical Reasoning</Text>
            </View>
            <Text style={styles.reasoningText}>{analysis.reasoning}</Text>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render Question State
  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.loadingText}>Failed to load assessment</Text>
        <TouchableOpacity style={styles.doneButton} onPress={loadQuestions}>
            <Text style={styles.doneButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Speech Assessment</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{currentQuestionIndex + 1}/{questions.length}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }]} />
        </View>

        <Animated.View 
          key={currentQuestion.id}
          entering={FadeIn.duration(500)}
          style={styles.questionCard}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="comment-processing-outline" size={40} color="#6366F1" />
          </View>
          <Text style={styles.questionType}>{currentQuestion.type.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          <Text style={styles.instructionText}>{currentQuestion.instruction}</Text>
        </Animated.View>

        <View style={styles.recordingContainer}>
          {isRecording && (
            <Animated.Text 
              entering={FadeIn}
              style={styles.timerText}
            >
              {formatTime(timer)}
            </Animated.Text>
          )}

          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <LinearGradient
              colors={isRecording ? ['#EF4444', '#DC2626'] : ['#6366F1', '#4F46E5']}
              style={styles.recordGradient}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={32} 
                color="#fff" 
              />
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.recordingStatus}>
            {isRecording ? 'Listening...' : 'Tap to Start Answer'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  questionCard: {
    alignItems: 'center',
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  instructionText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 12,
    height: 28,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  recordingButton: {
    shadowColor: '#EF4444',
    transform: [{ scale: 1.1 }],
  },
  recordGradient: {
    flex: 1,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  // Result Styles
  resultContent: {
    padding: 20,
  },
  scoreCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
  },
  scoreGradient: {
    padding: 24,
    alignItems: 'center',
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  riskBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  riskText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  markersContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  markerGrid: {
    gap: 16,
  },
  markerItem: {
    gap: 8,
  },
  markerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B', // Darker color for better visibility
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  markerScore: {
    fontSize: 12,
    color: '#64748B',
    alignSelf: 'flex-end',
  },
  reasoningCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  reasoningText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: '#6366F1',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
});
