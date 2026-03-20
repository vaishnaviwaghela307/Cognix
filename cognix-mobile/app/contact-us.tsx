import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ContactUsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSending(true);
    // Simulate sending
    setTimeout(() => {
      setSending(false);
      Alert.alert(
        'Message Sent!',
        'Thank you for contacting us. We will get back to you within 24-48 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1500);
  };

  const contactMethods = [
    {
      icon: 'mail',
      label: 'Email',
      value: 'support@cognix.ai',
      color: '#6366F1',
      bg: '#EEF2FF',
      onPress: () => Linking.openURL('mailto:support@cognix.ai')
    },
    {
      icon: 'call',
      label: 'Phone',
      value: '+1 (555) 123-4567',
      color: '#10B981',
      bg: '#D1FAE5',
      onPress: () => Linking.openURL('tel:+15551234567')
    },
    {
      icon: 'chatbubbles',
      label: 'Live Chat',
      value: 'Available 9 AM - 6 PM EST',
      color: '#F59E0B',
      bg: '#FEF3C7',
      onPress: () => Alert.alert('Live Chat', 'Live chat feature coming soon!')
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>We're here to help you</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Contact Methods */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={method.label}
              style={styles.contactMethod}
              onPress={method.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIcon, { backgroundColor: method.bg }]}>
                <Ionicons name={method.icon as any} size={24} color={method.color} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{method.label}</Text>
                <Text style={styles.contactValue}>{method.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Contact Form */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Email</Text>
              <TextInput
                style={styles.input}
                value={user?.primaryEmailAddress?.emailAddress || ''}
                editable={false}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="What can we help you with?"
                placeholderTextColor="#94A3B8"
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us more about your question or issue..."
                placeholderTextColor="#94A3B8"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={sending}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                {sending ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Office Hours */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.infoCard}>
          <Ionicons name="time" size={24} color="#6366F1" />
          <Text style={styles.infoCardTitle}>Support Hours</Text>
          <Text style={styles.infoCardText}>
            Monday - Friday: 9:00 AM - 6:00 PM EST{'\n'}
            Saturday: 10:00 AM - 4:00 PM EST{'\n'}
            Sunday: Closed
          </Text>
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
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  contactValue: { fontSize: 13, color: '#64748B', marginTop: 2 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: { height: 120, paddingTop: 14 },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 12, marginBottom: 8 },
  infoCardText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
});
