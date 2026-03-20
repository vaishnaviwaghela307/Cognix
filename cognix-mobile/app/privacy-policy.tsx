import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#64748B', '#475569']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Last updated: January 24, 2026</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, including:{'\n\n'}
            • Personal information (name, email, age, gender){'\n'}
            • Health data (test results, cognitive assessments, medical documents){'\n'}
            • Usage data (app interactions, test completion times){'\n'}
            • Device information (device type, operating system)
          </Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:{'\n\n'}
            • Provide and improve our cognitive health services{'\n'}
            • Generate AI-powered health insights and predictions{'\n'}
            • Send you test results and notifications{'\n'}
            • Communicate with caregivers you've linked{'\n'}
            • Analyze trends and improve our ML models{'\n'}
            • Ensure security and prevent fraud
          </Text>

          <Text style={styles.sectionTitle}>3. Data Security</Text>
          <Text style={styles.paragraph}>
            We take data security seriously:{'\n\n'}
            • All data is encrypted in transit using TLS 1.3{'\n'}
            • Personal documents use AES-256 encryption{'\n'}
            • We follow HIPAA compliance guidelines{'\n'}
            • Regular security audits and penetration testing{'\n'}
            • Secure cloud infrastructure with AWS/Google Cloud
          </Text>

          <Text style={styles.sectionTitle}>4. Data Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal information. We may share data:{'\n\n'}
            • With caregivers you explicitly link to your account{'\n'}
            • With healthcare providers at your request{'\n'}
            • With service providers who assist our operations{'\n'}
            • When required by law or to protect rights and safety{'\n'}
            • In anonymized form for research purposes
          </Text>

          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:{'\n\n'}
            • Access your personal data{'\n'}
            • Request data correction or deletion{'\n'}
            • Export your data in a portable format{'\n'}
            • Opt-out of certain data processing{'\n'}
            • Withdraw consent at any time{'\n'}
            • File a complaint with supervisory authorities
          </Text>

          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your data for as long as your account is active or as needed to provide services. You can delete individual records or request full account deletion at any time.
          </Text>

          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our services are not intended for children under 13. We do not knowingly collect data from children under 13. If you believe we have collected such data, please contact us immediately.
          </Text>

          <Text style={styles.sectionTitle}>8. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
          </Text>

          <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this privacy policy from time to time. We will notify you of significant changes via email or in-app notification.
          </Text>

          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this privacy policy, please contact us:{'\n\n'}
            Email: privacy@cognix.ai{'\n'}
            Address: 123 Health Tech Ave, San Francisco, CA 94105{'\n'}
            Phone: +1 (555) 123-4567
          </Text>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={32} color="#10B981" />
            <Text style={styles.footerText}>
              Your privacy and data security are our top priorities
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
    color: '#10B981',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});
