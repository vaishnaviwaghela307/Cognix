// Document Scanning Screen with OCR, ML Prediction & AI Analysis
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import OCRService, { OCRResult } from '../../services/ocr';
import NotificationService from '../../services/notifications';
import HistoryService from '../../services/history';
import { useUser } from '@clerk/clerk-expo';

const { width } = Dimensions.get('window');

// Risk color mapping
const riskColors: Record<string, { bg: string; light: string; text: string; gradient: [string, string] }> = {
  Low: { bg: '#10B981', light: '#D1FAE5', text: '#065F46', gradient: ['#10B981', '#059669'] },
  Moderate: { bg: '#F59E0B', light: '#FEF3C7', text: '#92400E', gradient: ['#F59E0B', '#D97706'] },
  High: { bg: '#EF4444', light: '#FEE2E2', text: '#991B1B', gradient: ['#EF4444', '#DC2626'] },
  Critical: { bg: '#DC2626', light: '#FEE2E2', text: '#7F1D1D', gradient: ['#DC2626', '#B91C1C'] },
};

type ScreenState = 'home' | 'camera' | 'preview' | 'processing' | 'results';

export default function DocumentScanScreen() {
  const { user } = useUser();
  const [screenState, setScreenState] = useState<ScreenState>('home');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const scanLinePosition = useSharedValue(0);
  
  React.useEffect(() => {
    if (screenState === 'processing') {
      scanLinePosition.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  });

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value * 200 - 100 }],
  }));

  const handleCameraPress = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed');
        return;
      }
    }
    setScreenState('camera');
  };

  const handleGalleryPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      setScreenState('preview');
    }
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        base64: false,
      });
      if (photo) {
        setCapturedImage(photo.uri);
        setScreenState('preview');
      }
    }
  };

  const processDocument = async () => {
    if (!capturedImage) return;
    setScreenState('processing');
    
    try {
      const result = await OCRService.analyzeDocument(capturedImage);
      setOcrResult(result);
      setScreenState('results');
      
      // Send notification on successful scan
      if (result.success && result.mlPrediction) {
        await NotificationService.sendScanCompleteNotification(
          result.documentInfo?.type || 'Medical Document',
          result.mlPrediction.predicted_disease || 'Unknown',
          result.mlPrediction.risk_level || 'Low',
          result.mlPrediction.confidence || 0
        );
        
        // Save to history
        if (user?.id) {
          await HistoryService.saveHistory({
            userId: user.id,
            type: 'scan',
            documentInfo: {
              type: result.documentInfo?.type || 'Medical Document',
              rawText: result.extractedData?.rawText?.substring(0, 500),
              clinicalValues: result.extractedData?.clinicalValues,
            },
            prediction: result.mlPrediction ? {
              disease: result.mlPrediction.predicted_disease,
              confidence: result.mlPrediction.confidence,
              riskLevel: result.mlPrediction.risk_level,
            } : undefined,
            aiAnalysis: result.aiAnalysis,
            report: result.report ? {
              reportId: result.report.report_id,
              reportUrl: result.report.report_url,
              generatedAt: result.report.generated_at,
              reportType: 'ocr_scan'
            } : undefined,
          });
          console.log('✅ Scan saved to history with report:', result.report ? 'Yes' : 'No');
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to analyze document. Please try again.');
      setScreenState('preview');
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setOcrResult(null);
    setScreenState('home');
  };

  // Render Home Screen
  const renderHomeScreen = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.homeContent}>
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.headerGradient}>
          <MaterialCommunityIcons name="brain" size={48} style={{ marginLeft: 2 }} color="#fff" />
          <Text style={styles.headerTitle}>AI Document Analysis</Text>
          <Text style={styles.headerSubtitle}>
            Scan medical reports • Get cognitive health insights
          </Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)} style={styles.optionsContainer}>
        <Text style={styles.sectionTitle}>Scan Your Document</Text>
        
        <TouchableOpacity style={styles.optionCard} onPress={handleCameraPress}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.optionGradient}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="camera" size={32} color="#fff" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Take Photo</Text>
              <Text style={styles.optionDesc}>Capture document using camera</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={handleGalleryPress}>
          <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.optionGradient}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="images" size={32} color="#fff" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Upload from Gallery</Text>
              <Text style={styles.optionDesc}>Select existing document</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)} style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>What You&apos;ll Get</Text>
        {[
          { icon: 'document-text', title: 'Document Type Detection', desc: 'AI identifies the report type' },
          { icon: 'analytics', title: 'ML Disease Prediction', desc: 'Cognitive health assessment' },
          { icon: 'bulb', title: 'AI Recommendations', desc: 'Personalized health advice' },
          { icon: 'medkit', title: 'Follow-up Plan', desc: 'Next steps & specialists' },
        ].map((item, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name={item.icon as any} size={24} color="#6366F1" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );

  // Render Camera Screen
  const renderCameraScreen = () => (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraTopBar}>
            <TouchableOpacity style={styles.cameraBackBtn} onPress={() => setScreenState('home')}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Scan Document</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.documentFrame}>
            <View style={[styles.frameCorner, styles.topLeft]} />
            <View style={[styles.frameCorner, styles.topRight]} />
            <View style={[styles.frameCorner, styles.bottomLeft]} />
            <View style={[styles.frameCorner, styles.bottomRight]} />
            <Text style={styles.frameHint}>Align document within frame</Text>
          </View>

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity style={styles.galleryBtn} onPress={handleGalleryPress}>
              <Ionicons name="images" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <View style={{ width: 50 }} />
          </View>
        </View>
      </CameraView>
    </View>
  );

  // Render Preview Screen
  const renderPreviewScreen = () => (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <TouchableOpacity onPress={resetScan}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.previewTitle}>Preview Document</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.previewImageContainer}>
        {capturedImage && <Image source={{ uri: capturedImage }} style={styles.previewImage} />}
      </View>

      <View style={styles.previewActions}>
        <TouchableOpacity style={styles.retakeBtn} onPress={resetScan}>
          <Ionicons name="refresh" size={20} color="#6366F1" />
          <Text style={styles.retakeBtnText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.processBtn} onPress={processDocument}>
          <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.processBtnGradient}>
            <FontAwesome5 name="brain" size={20} color="#fff" />
            <Text style={styles.processBtnText}>Analyze with AI</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Processing Screen
  const renderProcessingScreen = () => (
    <View style={styles.processingContainer}>
      <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.processingGradient}>
        <Animated.View entering={FadeIn} style={styles.processingContent}>
          <View style={styles.processingAnimation}>
            <View style={styles.documentPreviewSmall}>
              {capturedImage && <Image source={{ uri: capturedImage }} style={styles.smallImage} />}
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            </View>
          </View>
          
          <Text style={styles.processingTitle}>Analyzing Document...</Text>
          
          <View style={styles.processingSteps}>
            {[
              '📝 Extracting text with OCR...',
              '📄 Detecting document type...',
              '🧠 Running ML prediction...',
              '✨ Generating AI recommendations...'
            ].map((step, index) => (
              <Animated.View 
                key={index}
                entering={FadeInUp.delay(500 + index * 800)}
                style={styles.processingStep}
              >
                <ActivityIndicator size="small" color="#818CF8" />
                <Text style={styles.processingStepText}>{step}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Render Results Screen - CLEAN & SIMPLE DESIGN
  const renderResultsScreen = () => {
    if (!ocrResult) return null;

    if (!ocrResult.success) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorText}>{ocrResult.error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={resetScan}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const { mlPrediction } = ocrResult;
    const riskLevel = mlPrediction?.risk_level || 'Low';
    const colors = riskColors[riskLevel] || riskColors.Low;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <TouchableOpacity onPress={resetScan} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>Analysis Results</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={{ flex: 1, backgroundColor: '#F8FAFC' }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Header */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.successHeader}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Analysis Complete</Text>
            <Text style={styles.successSubtitle}>Document processed successfully</Text>
          </Animated.View>

          {/* Document Info Card */}
          <Animated.View entering={FadeInDown.delay(150)} style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="document-text-outline" size={20} color="#6366F1" />
                <Text style={styles.infoLabel}>Document Type</Text>
                <Text style={styles.infoValue}>
                  {ocrResult.document_info?.type || 'Medical Report'}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
                <Text style={styles.infoLabel}>OCR Accuracy</Text>
                <Text style={styles.infoValue}>
                  {((ocrResult.confidence || 0) * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ML Prediction Card */}
          {mlPrediction && (
            <Animated.View entering={FadeInDown.delay(200)}>
              <LinearGradient 
                colors={[colors.gradient[0], colors.gradient[1]]} 
                style={styles.newPredictionCard}
              >
                <View style={styles.newPredictionHeader}>
                  <Ionicons name="analytics" size={24} color="#fff" />
                  <Text style={styles.predictionHeaderText}>AI Assessment</Text>
                </View>
                
                <Text style={styles.newPredictionDisease}>
                  {mlPrediction.predicted_disease && mlPrediction.predicted_disease !== 'NA' && mlPrediction.predicted_disease !== 'N/A'
                    ? mlPrediction.predicted_disease
                    : 'Consult Healthcare Provider'}
                </Text>
                
                <View style={styles.riskBadgeWrapper}>
                  <View style={styles.newRiskBadge}>
                    <Ionicons name="alert-circle" size={16} color="#fff" />
                    <Text style={styles.riskBadgeText}>{mlPrediction.risk_level} Risk</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Key Findings */}
          {ocrResult.explainability?.detected_keywords && ocrResult.explainability.detected_keywords.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250)} style={styles.findingsCard}>
              <View style={styles.findingsHeader}>
                <Ionicons name="search" size={20} color="#6366F1" />
                <Text style={styles.findingsTitle}>Key Findings</Text>
              </View>
              <View style={styles.keywordsGrid}>
                {ocrResult.explainability.detected_keywords.map((keyword: string, idx: number) => (
                  <View key={idx} style={styles.keywordChip}>
                    <Text style={styles.keywordChipText}>{keyword}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* AI Reasoning */}
          {ocrResult.explainability?.reasoning_trace && (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.reasoningCard}>
              <View style={styles.reasoningHeader}>
                <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
                <Text style={styles.reasoningTitle}>AI Analysis</Text>
              </View>
              <Text style={styles.reasoningContent}>
                {ocrResult.explainability.reasoning_trace}
              </Text>
            </Animated.View>
          )}

          {/* No Disease Message */}
          {!ocrResult.has_disease_indicators && ocrResult.message && (
            <Animated.View entering={FadeInDown.delay(250)} style={styles.noDiseaseCard}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.noDiseaseTitle}>No Disease Indicators Found</Text>
              <Text style={styles.noDiseaseMessage}>{ocrResult.message}</Text>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.delay(350)} style={styles.newActionButtons}>
            {/* View PDF Report Button */}
            {ocrResult.report && (
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => {
                  const fullUrl = `https://cognix-flask-server-x2u5.onrender.com${ocrResult.report!.report_url}`;
                  router.push({
                    pathname: '/pdf-viewer',
                    params: {
                      url: fullUrl,
                      title: 'Medical Diagnostic Report'
                    }
                  });
                }}
              >
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.buttonGradient}>
                  <Ionicons name="document-text" size={22} color="#fff" />
                  <Text style={styles.primaryButtonText}>View Full Report</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Scan Another Button */}
            <TouchableOpacity style={styles.secondaryButton} onPress={resetScan}>
              <Ionicons name="camera-outline" size={22} color="#6366F1" />
              <Text style={styles.secondaryButtonText}>Scan Another Document</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {screenState === 'home' && renderHomeScreen()}
      {screenState === 'camera' && renderCameraScreen()}
      {screenState === 'preview' && renderPreviewScreen()}
      {screenState === 'processing' && renderProcessingScreen()}
      {screenState === 'results' && renderResultsScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  homeContent: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 24, borderRadius: 20, overflow: 'hidden', elevation: 8 },
  headerGradient: { padding: 32, alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 16, width: '100%',alignSelf: 'center',textAlign: 'center'},
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  optionsContainer: { marginBottom: 24 },
  optionCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, elevation: 4 },
  optionGradient: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  optionIconContainer: { width: 54, height: 54, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  optionDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  featuresSection: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  featureDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.3)' },
  cameraBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  documentFrame: { width: width * 0.85, height: width * 1.1, alignSelf: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  frameCorner: { position: 'absolute', width: 30, height: 30, borderColor: '#fff', borderWidth: 3 },
  topLeft: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  topRight: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bottomLeft: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  frameHint: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  cameraBottomBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 32, backgroundColor: 'rgba(0,0,0,0.4)' },
  galleryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  captureBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  previewContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  previewTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  previewImageContainer: { flex: 1, padding: 20 },
  previewImage: { flex: 1, borderRadius: 16, backgroundColor: '#E5E7EB' },
  previewActions: { flexDirection: 'row', padding: 20, gap: 12 },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, borderWidth: 2, borderColor: '#6366F1', gap: 8 },
  retakeBtnText: { color: '#6366F1', fontSize: 16, fontWeight: '600' },
  processBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  processBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  processBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  processingContainer: { flex: 1 },
  processingGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  processingContent: { alignItems: 'center' },
  processingAnimation: { marginBottom: 32 },
  documentPreviewSmall: { width: 180, height: 240, borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden', elevation: 10 },
  smallImage: { width: '100%', height: '100%' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#818CF8', top: '50%' },
  processingTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
  processingSteps: { gap: 16 },
  processingStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  processingStepText: { color: '#fff', fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  errorText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginVertical: 16 },
  retryBtn: { backgroundColor: '#6366F1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultsContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  resultsTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  documentCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  documentCardHeader: { flexDirection: 'row', alignItems: 'center' },
  documentCardText: { marginLeft: 14, flex: 1 },
  documentTypeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  documentType: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 2 },
  confidenceBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginTop: 12 },
  confidenceText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  predictionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderLeftWidth: 4 },
  predictionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  predictionLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  predictionDisease: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  predictionMeta: { flexDirection: 'row', gap: 10 },
  metaBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  metaText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  riskText: { fontSize: 12, fontWeight: '600' },
  assessmentCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  assessmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  assessmentLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  assessmentRisk: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 4 },
  riskScoreCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  riskScoreValue: { fontSize: 22, fontWeight: '700', color: '#fff' },
  assessmentExplanation: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  findingItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  findingStatus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  findingStatusText: { fontSize: 11, fontWeight: '600' },
  findingText: { fontSize: 14, fontWeight: '500', color: '#1F2937', marginBottom: 4 },
  findingSignificance: { fontSize: 13, color: '#6B7280' },
  recSection: { marginBottom: 16 },
  recSectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  recText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 18 },
  followUpRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  followUpLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginRight: 10 },
  urgencyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  urgencyText: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  followUpSection: { marginBottom: 14 },
  followUpSectionTitle: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontSize: 12, color: '#6366F1', fontWeight: '500' },
  testItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  testText: { fontSize: 13, color: '#4B5563' },
  timeline: { fontSize: 14, color: '#6366F1', fontWeight: '500', marginTop: 8 },
  disclaimerCard: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16, gap: 10 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 16 },
  actionButtons: { marginTop: 8 },
  scanAnotherBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#6366F1', gap: 8 },
  scanAnotherText: { color: '#6366F1', fontSize: 15, fontWeight: '600' },
  // Report Button Styles
  reportButtonContainer: { marginTop: 8, marginBottom: 8 },
  viewReportBtn: { borderRadius: 16, overflow: 'hidden', elevation: 6 },
  viewReportGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 24, gap: 12 },
  viewReportText: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  // No Disease Card Styles
  noDiseaseCard: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', borderWidth: 2, borderColor: '#86EFAC' },
  noDiseaseTitle: { fontSize: 18, fontWeight: '700', color: '#065F46', marginTop: 12, marginBottom: 8 },
  noDiseaseMessage: { fontSize: 14, color: '#047857', textAlign: 'center', lineHeight: 20 },
  // Simple UI Styles
  simpleHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  simpleHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  shareButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  simpleScrollView: { flex: 1, backgroundColor: '#F8FAFC' },
  simpleScrollContent: { padding: 20, paddingBottom: 100 },
  simpleDocCard: { 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 16,
    elevation: 4
  },
  docCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  docIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  docCardBottom: {
    width: '100%'
  },
  simpleDocText: { flex: 1, marginLeft: 16 },
  simpleDocLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  simpleDocType: { fontSize: 20, fontWeight: '700', color: '#fff', lineHeight: 26 },
  simpleConfBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  simpleConfText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  simplePredCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  simplePredHeader: { flexDirection: 'row', padding: 20 },
  simplePredIcon: { 
    width: 56, 
    height: 56, 
    borderRadius: 14, 
    backgroundColor: '#F8FAFC', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 16
  },
  simplePredContent: { flex: 1 },
  simplePredLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  simplePredDisease: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1E293B', 
    marginBottom: 12,
    lineHeight: 28,
    flexWrap: 'wrap'
  },
  simplePredMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  simplePredConf: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  simpleRiskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  simpleRiskText: { fontSize: 12, fontWeight: '600' },
  simpleScanBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#6366F1', 
    backgroundColor: '#fff',
    gap: 8,
    marginTop: 8
  },
  simpleScanText: { color: '#6366F1', fontSize: 15, fontWeight: '600' },
  // Explainability Card Styles
  explainabilityCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FDE68A',
    elevation: 2,
  },
  explainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  explainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
    flexWrap: 'wrap'
  },
  explainSection: {
    marginBottom: 16,
  },
  explainSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 8,
  },
  keywordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  keywordText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  reasoningText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
    flexWrap: 'wrap'
  },
  explainFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  explainFooterText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
  },
  
  // New Result Screen Styles
  successHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  successIconWrapper: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  newPredictionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  newPredictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  predictionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  newPredictionDisease: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  riskBadgeWrapper: {
    alignItems: 'flex-start',
  },
  newRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  riskBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  findingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  findingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  findingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  keywordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  keywordChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  reasoningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  reasoningContent: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 22,
  },
  newActionButtons: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
});
