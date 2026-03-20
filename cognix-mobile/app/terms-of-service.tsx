import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#64748B', '#475569']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Last updated: January 24, 2026</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using Cognix ("the App"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
          </Text>

          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            Cognix provides AI-powered cognitive health assessment tools, including:{'\n\n'}
            • Cognitive and clinical tests{'\n'}
            • Medical document scanning and analysis{'\n'}
            • Speech and language assessments{'\n'}
            • Health tracking and reporting{'\n'}
            • Caregiver collaboration features
          </Text>

          <Text style={styles.sectionTitle}>3. Medical Disclaimer</Text>
          <Text style={styles.paragraph}>
            IMPORTANT: Cognix is an AI-assisted health tool and NOT a substitute for professional medical advice, diagnosis, or treatment.{'\n\n'}
            • Our predictions are based on ML models and may not be accurate{'\n'}
            • Always consult qualified healthcare professionals{'\n'}
            • Do not disregard professional medical advice{'\n'}
            • In case of emergency, call emergency services immediately{'\n'}
            • We are not liable for medical decisions based on our app
          </Text>

          <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            You agree to:{'\n\n'}
            • Provide accurate and complete information{'\n'}
            • Keep your account credentials secure{'\n'}
            • Use the App only for lawful purposes{'\n'}
            • Not share sensitive health data publicly{'\n'}
            • Not attempt to hack or reverse engineer the App{'\n'}
            • Comply with all applicable laws and regulations
          </Text>

          <Text style={styles.sectionTitle}>5. Account Registration</Text>
          <Text style={styles.paragraph}>
            To use certain features, you must register an account. You are responsible for maintaining the confidentiality of your account and password. You agree to notify us immediately of any unauthorized use.
          </Text>

          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All content, features, and functionality of the App are owned by Cognix and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our permission.
          </Text>

          <Text style={styles.sectionTitle}>7. User Content</Text>
          <Text style={styles.paragraph}>
            You retain ownership of content you upload (test results, documents, etc.). By using the App, you grant us a license to use this content to provide and improve our services, including training our ML models in anonymized form.
          </Text>

          <Text style={styles.sectionTitle}>8. Prohibited Activities</Text>
          <Text style={styles.paragraph}>
            You may not:{'\n\n'}
            • Use the App for any illegal purpose{'\n'}
            • Impersonate others or provide false information{'\n'}
            • Interfere with or disrupt the App's functionality{'\n'}
            • Attempt to gain unauthorized access{'\n'}
            • Use automated systems to access the App{'\n'}
            • Violate any applicable laws or regulations
          </Text>

          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, COGNIX SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
          </Text>

          <Text style={styles.sectionTitle}>10. Warranty Disclaimer</Text>
          <Text style={styles.paragraph}>
            THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES.
          </Text>

          <Text style={styles.sectionTitle}>11. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account at any time for violations of these Terms. You may terminate your account at any time by contacting us. Upon termination, your right to use the App will cease immediately.
          </Text>

          <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. We will notify you of significant changes. Continued use of the App after changes constitutes acceptance of the new Terms.
          </Text>

          <Text style={styles.sectionTitle}>13. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
          </Text>

          <Text style={styles.sectionTitle}>14. Contact Information</Text>
          <Text style={styles.paragraph}>
            For questions about these Terms, contact us:{'\n\n'}
            Email: legal@cognix.ai{'\n'}
            Address: 123 Health Tech Ave, San Francisco, CA 94105{'\n'}
            Phone: +1 (555) 123-4567
          </Text>

          <View style={styles.footer}>
            <Ionicons name="document-text" size={32} color="#6366F1" />
            <Text style={styles.footerText}>
              By using Cognix, you agree to these Terms of Service
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingVertical: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});
