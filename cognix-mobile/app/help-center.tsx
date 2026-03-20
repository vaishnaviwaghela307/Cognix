import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      category: 'Getting Started',
      question: 'How do I start using Cognix?',
      answer: 'Simply sign up with your email, complete your profile setup, and you can immediately start taking cognitive tests, scanning documents, or linking caregivers to your account.'
    },
    {
      category: 'Getting Started',
      question: 'Is my data secure?',
      answer: 'Yes! All your health data is encrypted end-to-end. We use AES-256 encryption for personal documents and follow HIPAA compliance guidelines for medical data protection.'
    },
    {
      category: 'Tests & Scans',
      question: 'What types of tests can I take?',
      answer: 'Cognix offers cognitive tests (memory, attention, language), clinical assessments, speech analysis, and document scanning for medical records. Each test generates a detailed PDF report.'
    },
    {
      category: 'Tests & Scans',
      question: 'How accurate are the AI predictions?',
      answer: 'Our ML models are trained on extensive medical datasets and provide predictions with confidence scores. However, these are AI-assisted insights and should not replace professional medical diagnosis.'
    },
    {
      category: 'Tests & Scans',
      question: 'Can I scan any medical document?',
      answer: 'Yes, you can scan prescription notes, lab reports, medical records, and other health documents. Our OCR technology extracts text and analyzes it for disease indicators.'
    },
    {
      category: 'Reports & History',
      question: 'Where can I find my test reports?',
      answer: 'All your PDF reports are available in the History tab or Test Reports section in your Profile. You can view, download, or share them anytime.'
    },
    {
      category: 'Reports & History',
      question: 'How long is my history stored?',
      answer: 'Your test history and reports are stored indefinitely in our secure cloud database. You can delete individual records anytime from the History detail screen.'
    },
    {
      category: 'Caregiver Features',
      question: 'How do I add a caregiver?',
      answer: 'Go to Profile → Family & Caregiver, enter their email address, and they will automatically receive email notifications with your test reports. No registration required for caregivers!'
    },
    {
      category: 'Caregiver Features',
      question: 'What information do caregivers receive?',
      answer: 'Caregivers receive beautiful HTML emails with test results, predictions, confidence scores, questions asked, and links to full PDF reports after every test or scan you complete.'
    },
    {
      category: 'Privacy & Security',
      question: 'Can I delete my data?',
      answer: 'Yes, you can delete individual test records from the History screen. To delete your entire account and all data, contact our support team.'
    },
    {
      category: 'Privacy & Security',
      question: 'Who can access my health data?',
      answer: 'Only you and caregivers you explicitly link can access your health data. We never share your data with third parties without your consent.'
    },
    {
      category: 'Technical',
      question: 'Why is my app not loading?',
      answer: 'Check your internet connection. If the issue persists, try restarting the app or clearing the app cache from your device settings.'
    },
    {
      category: 'Technical',
      question: 'How do I update the app?',
      answer: 'Visit your app store (Google Play or App Store) and check for Cognix updates. We regularly release updates with new features and improvements.'
    },
  ];

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#14B8A6', '#0D9488']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help Center</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Find answers to common questions</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="chatbubbles" size={24} color="#6366F1" />
            </View>
            <Text style={styles.quickActionText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="videocam" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Video Tutorials</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="book" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickActionText}>User Guide</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* FAQs by Category */}
        {categories.map((category, categoryIndex) => (
          <Animated.View 
            key={category}
            entering={FadeInDown.delay(200 + categoryIndex * 50)}
            style={styles.categorySection}
          >
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.faqContainer}>
              {faqs
                .filter(faq => faq.category === category)
                .map((faq, index) => {
                  const globalIndex = faqs.indexOf(faq);
                  const isExpanded = expandedIndex === globalIndex;
                  
                  return (
                    <TouchableOpacity
                      key={globalIndex}
                      style={[
                        styles.faqItem,
                        isExpanded && styles.faqItemExpanded
                      ]}
                      onPress={() => toggleFAQ(globalIndex)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.faqHeader}>
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                        <Ionicons 
                          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                          size={20} 
                          color="#6366F1" 
                        />
                      </View>
                      {isExpanded && (
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          </Animated.View>
        ))}

        {/* Still Need Help */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.helpCard}>
          <Ionicons name="help-circle" size={48} color="#6366F1" />
          <Text style={styles.helpCardTitle}>Still need help?</Text>
          <Text style={styles.helpCardText}>
            Our support team is here to assist you
          </Text>
          <TouchableOpacity 
            style={styles.helpCardButton}
            onPress={() => router.push('/contact-us')}
          >
            <Text style={styles.helpCardButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </Animated.View>

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
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  faqContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  faqItemExpanded: {
    backgroundColor: '#F8FAFC',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 12,
  },
  helpCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  helpCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  helpCardText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  helpCardButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  helpCardButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
