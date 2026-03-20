import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, DISEASES } from '@/constants/theme';
import ApiService, { PredictionResult } from '@/services/api';

export default function CognitiveTestScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    MMSE: '',
    Age: '',
    Gender: '1',
    Education: '',
    SES: '',
    CDR: '',
    eTIV: '',
    nWBV: '',
    ASF: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.MMSE || !formData.Age) {
      Alert.alert('Required Fields', 'Please fill in at least MMSE Score and Age');
      return false;
    }
    return true;
  };

  const handlePredict = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setResult(null);

    try {
      // Convert form data to numbers
      const features: any = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key as keyof typeof formData];
        if (value) {
          features[key] = parseFloat(value);
        }
      });

      const response = await ApiService.predictHybrid(features);

      if (response.success && response.prediction) {
        setResult(response.prediction);
      } else {
        Alert.alert('Prediction Failed', response.error || 'Unable to get prediction');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect to prediction service');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      MMSE: '',
      Age: '',
      Gender: '1',
      Education: '',
      SES: '',
      CDR: '',
      eTIV: '',
      nWBV: '',
      ASF: '',
    });
    setResult(null);
  };

  const getRiskColor = (riskLevel: string) => {
    if (riskLevel.includes('HIGH')) return COLORS.error;
    if (riskLevel.includes('MEDIUM')) return COLORS.warning;
    return COLORS.success;
  };

  const getDiseaseColor = (diseaseId: string) => {
    const disease = DISEASES.find(d => d.id === diseaseId.toLowerCase());
    return disease?.color || COLORS.primary;
  };

  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Prediction Results</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Result Card */}
          <View style={[styles.resultCard, { borderColor: getDiseaseColor(result.predicted_disease) }]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>Predicted Disease</Text>
              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(result.risk_level) }]}>
                <Text style={styles.riskBadgeText}>{result.risk_level}</Text>
              </View>
            </View>
            
            <Text style={[styles.resultDisease, { color: getDiseaseColor(result.predicted_disease) }]}>
              {result.predicted_disease}
            </Text>
            
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confidence</Text>
              <Text style={styles.confidenceValue}>
                {(result.confidence * 100).toFixed(1)}%
              </Text>
            </View>

            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${result.confidence * 100}%`,
                    backgroundColor: getDiseaseColor(result.predicted_disease),
                  },
                ]}
              />
            </View>

            <View style={styles.severityContainer}>
              <Text style={styles.severityLabel}>Severity Level</Text>
              <Text style={styles.severityValue}>{result.severity}</Text>
            </View>
          </View>

          {/* Top 3 Predictions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 3 Predictions</Text>
          </View>

          {result.top_3_predictions.map((pred, index) => (
            <View key={index} style={styles.predictionItem}>
              <View style={styles.predictionRank}>
                <Text style={styles.predictionRankText}>{index + 1}</Text>
              </View>
              <View style={styles.predictionContent}>
                <Text style={styles.predictionDisease}>{pred.disease}</Text>
                <View style={styles.predictionBar}>
                  <View
                    style={[
                      styles.predictionFill,
                      {
                        width: `${pred.probability * 100}%`,
                        backgroundColor: getDiseaseColor(pred.disease),
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.predictionPercent}>
                {(pred.probability * 100).toFixed(1)}%
              </Text>
            </View>
          ))}

          {/* All Disease Scores */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Disease Probabilities</Text>
          </View>

          {DISEASES.map((disease) => {
            const score = (result.all_scores || result.all_predictions || {})[disease.id.toLowerCase() as keyof typeof result.all_predictions] || 0;
            return (
              <View key={disease.id} style={styles.diseaseScoreItem}>
                <Text style={styles.diseaseScoreIcon}>{disease.icon}</Text>
                <View style={styles.diseaseScoreContent}>
                  <Text style={styles.diseaseScoreName}>{disease.shortName}</Text>
                  <View style={styles.diseaseScoreBar}>
                    <View
                      style={[
                        styles.diseaseScoreFill,
                        {
                          width: `${score * 100}%`,
                          backgroundColor: disease.color,
                        }
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.diseaseScorePercent}>
                  {(score * 100).toFixed(1)}%
                </Text>
              </View>
            );
          })}

          {/* Explainable AI - Symptom Breakdown */}
          {result.explainability?.symptom_breakdown && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Symptom Contribution Breakdown</Text>
              </View>
              <View style={styles.xaiCard}>
                {Object.entries(result.explainability.symptom_breakdown).map(([symptom, weight]: [string, any]) => (
                  <View key={symptom} style={styles.xaiRow}>
                    <View style={styles.xaiLabelRow}>
                      <Text style={styles.xaiLabel}>{symptom}</Text>
                      <Text style={styles.xaiValue}>{(weight * 100).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.xaiBarBg}>
                      <View 
                        style={[
                          styles.xaiBarFill, 
                          { 
                            width: `${weight * 100}%`,
                            backgroundColor: COLORS.primary 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Explainable AI - Reasoning Trace */}
          {result.explainability?.reasoning_trace && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI Reasoning Trace</Text>
              </View>
              <View style={styles.reasoningCard}>
                <Text style={styles.reasoningText}>
                  {result.explainability.reasoning_trace}
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>New Assessment</Text>
          </TouchableOpacity>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cognitive Assessment</Text>
        <Text style={styles.headerSubtitle}>Enter patient information</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Required Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Information</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>MMSE Score *</Text>
          <Text style={styles.inputHint}>Mini-Mental State Examination (0-30)</Text>
          <TextInput
            style={styles.input}
            value={formData.MMSE}
            onChangeText={(value) => handleInputChange('MMSE', value)}
            placeholder="e.g., 24"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Age *</Text>
          <Text style={styles.inputHint}>Patient&apos;s age in years</Text>
          <TextInput
            style={styles.input}
            value={formData.Age}
            onChangeText={(value) => handleInputChange('Age', value)}
            placeholder="e.g., 65"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        {/* Optional Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information (Optional)</Text>
          <Text style={styles.sectionDescription}>
            Providing more data improves prediction accuracy
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Patient&apos;s Gender</Text>
          <View style={styles.genderButtons}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.Gender === '1' && styles.genderButtonActive,
              ]}
              onPress={() => handleInputChange('Gender', '1')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  formData.Gender === '1' && styles.genderButtonTextActive,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.Gender === '0' && styles.genderButtonActive,
              ]}
              onPress={() => handleInputChange('Gender', '0')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  formData.Gender === '0' && styles.genderButtonTextActive,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Education (years)</Text>
          <TextInput
            style={styles.input}
            value={formData.Education}
            onChangeText={(value) => handleInputChange('Education', value)}
            placeholder="e.g., 16"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Socioeconomic Status (1-5)</Text>
          <TextInput
            style={styles.input}
            value={formData.SES}
            onChangeText={(value) => handleInputChange('SES', value)}
            placeholder="e.g., 2"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CDR Score</Text>
          <Text style={styles.inputHint}>Clinical Dementia Rating (0-3)</Text>
          <TextInput
            style={styles.input}
            value={formData.CDR}
            onChangeText={(value) => handleInputChange('CDR', value)}
            placeholder="e.g., 0.5"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>eTIV</Text>
          <Text style={styles.inputHint}>Estimated Total Intracranial Volume</Text>
          <TextInput
            style={styles.input}
            value={formData.eTIV}
            onChangeText={(value) => handleInputChange('eTIV', value)}
            placeholder="e.g., 1500"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>nWBV</Text>
          <Text style={styles.inputHint}>Normalized Whole Brain Volume</Text>
          <TextInput
            style={styles.input}
            value={formData.nWBV}
            onChangeText={(value) => handleInputChange('nWBV', value)}
            placeholder="e.g., 0.75"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ASF</Text>
          <Text style={styles.inputHint}>Atlas Scaling Factor</Text>
          <TextInput
            style={styles.input}
            value={formData.ASF}
            onChangeText={(value) => handleInputChange('ASF', value)}
            placeholder="e.g., 1.2"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>

        <TouchableOpacity
          style={[styles.predictButton, loading && styles.predictButtonDisabled]}
          onPress={handlePredict}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.predictButtonText}>Get Prediction</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + 10,
    paddingBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  sectionDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  inputHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  genderButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
  },
  genderButtonTextActive: {
    color: COLORS.primary,
  },
  predictButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
    marginTop: SPACING.lg,
  },
  predictButtonDisabled: {
    opacity: 0.6,
  },
  predictButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.surface,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderLeftWidth: 6,
    ...SHADOWS.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  riskBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.full,
  },
  riskBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.surface,
    fontWeight: '600',
  },
  resultDisease: {
    ...TYPOGRAPHY.h1,
    fontWeight: '800',
    marginBottom: SPACING.lg,
  },
  confidenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  confidenceLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  confidenceValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
  },
  confidenceBar: {
    height: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  severityValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    fontWeight: '600',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  predictionRank: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  predictionRankText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.surface,
    fontWeight: '700',
  },
  predictionContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  predictionDisease: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  predictionBar: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  predictionFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  predictionPercent: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  diseaseScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  diseaseScoreIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  diseaseScoreContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  diseaseScoreName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  diseaseScoreBar: {
    height: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  diseaseScoreFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  diseaseScorePercent: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    minWidth: 50,
    textAlign: 'right',
  },
  resetButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginTop: SPACING.lg,
  },
  resetButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
  },
  xaiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  xaiRow: {
    marginBottom: SPACING.sm,
  },
  xaiLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs / 2,
  },
  xaiLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
  },
  xaiValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  xaiBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  xaiBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  reasoningCard: {
    backgroundColor: COLORS.primary + '05',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    marginBottom: SPACING.lg,
  },
  reasoningText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 22,
  },
});
