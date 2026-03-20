import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import CaregiverService from '../services/caregiverService';
import { backendAPI } from '../services/backend-api';

export default function CaregiverModeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [loading, setLoading] = useState(true);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  // Observation state
  const [observations, setObservations] = useState({
    forgetfulness: 0,
    wandering: 0,
    moodSwings: 0,
    aggression: 0,
    confusion: 0,
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchUserRole();
  }, [user?.id]);

  const fetchUserRole = async () => {
    if (!user?.id) return;
    try {
      const result = await backendAPI.getUser(user.id);
      if (result.success && result.user) {
        setRole(result.user.role || 'patient');
        if (result.user.role === 'caregiver') {
          fetchPatients();
        }
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    if (!user?.id) return;
    const result = await CaregiverService.getPatients(user.id);
    if (result.success) {
      setPatients(result.patients);
    }
  };

  const handleLinkCaregiver = async () => {
    if (!caregiverEmail) {
      Alert.alert('Error', 'Please enter a caregiver email');
      return;
    }
    setLinkLoading(true);
    const result = await CaregiverService.linkCaregiver(user?.id || '', caregiverEmail);
    setLinkLoading(false);
    if (result.success) {
      Alert.alert('Success', 'Caregiver linked successfully!');
      setCaregiverEmail('');
    } else {
      Alert.alert('Error', result.error || 'Failed to link caregiver');
    }
  };

  const handleLogObservation = async () => {
    if (!selectedPatient) return;
    
    setLinkLoading(true);
    const result = await CaregiverService.logObservation({
      caregiverId: user?.id || '',
      patientId: selectedPatient.clerkId,
      observations,
      notes,
    });
    setLinkLoading(false);
    
    if (result.success) {
      Alert.alert('Success', 'Observation logged and analyzed by AI!');
      setShowObservationModal(false);
      resetObservation();
    } else {
      Alert.alert('Error', result.error || 'Failed to log observation');
    }
  };

  const resetObservation = () => {
    setObservations({
      forgetfulness: 0,
      wandering: 0,
      moodSwings: 0,
      aggression: 0,
      confusion: 0,
    });
    setNotes('');
  };

  const renderRating = (key: keyof typeof observations) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((val) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.ratingCircle,
              observations[key] >= val && styles.ratingCircleActive,
            ]}
            onPress={() => setObservations(prev => ({ ...prev, [key]: val }))}
          >
            <Text style={[
              styles.ratingText,
              observations[key] >= val && styles.ratingTextActive,
            ]}>{val}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family & Caregiver Mode</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {role === 'patient' ? (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person-add" size={24} color="#6366F1" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Add Caregiver</Text>
                  <Text style={styles.cardSubtitle}>Share your health journey with family</Text>
                </View>
              </View>
              
              <Text style={styles.inputLabel}>Caregiver Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email..."
                value={caregiverEmail}
                onChangeText={setCaregiverEmail}
                autoCapitalize="none"
              />
              
              <TouchableOpacity
                style={[styles.primaryBtn, linkLoading && styles.disabledBtn]}
                onPress={handleLinkCaregiver}
                disabled={linkLoading}
              >
                {linkLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="link" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Link Caregiver</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text style={styles.infoText}>
                Linked caregivers can log daily observations about your symptoms to help doctors provide a better diagnosis.
              </Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.listTitle}>Linked Patients</Text>
            {patients.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-search" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>No patients linked to your account yet.</Text>
                <Text style={styles.emptySubtext}>Patients must add you using your registered email.</Text>
              </View>
            ) : (
              patients.map((p, idx) => (
                <Animated.View key={p.clerkId} entering={FadeInRight.delay(idx * 100)}>
                  <TouchableOpacity 
                    style={styles.patientCard}
                    onPress={() => {
                      setSelectedPatient(p);
                      setShowObservationModal(true);
                    }}
                  >
                    <View style={styles.patientAvatar}>
                      <Text style={styles.avatarText}>{p.fullName.charAt(0)}</Text>
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{p.fullName}</Text>
                      <Text style={styles.patientEmail}>{p.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Observation Modal */}
      <Modal visible={showObservationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Observation</Text>
              <TouchableOpacity onPress={() => setShowObservationModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.patientContext}>Logging for: {selectedPatient?.fullName}</Text>
            
            <ScrollView style={styles.modalScroll}>
              <View style={styles.observationItem}>
                <Text style={styles.obsLabel}>Forgetfulness</Text>
                {renderRating('forgetfulness')}
              </View>
              
              <View style={styles.observationItem}>
                <Text style={styles.obsLabel}>Wandering</Text>
                {renderRating('wandering')}
              </View>
              
              <View style={styles.observationItem}>
                <Text style={styles.obsLabel}>Mood Swings</Text>
                {renderRating('moodSwings')}
              </View>
              
              <View style={styles.observationItem}>
                <Text style={styles.obsLabel}>Aggression</Text>
                {renderRating('aggression')}
              </View>
              
              <View style={styles.observationItem}>
                <Text style={styles.obsLabel}>Confusion</Text>
                {renderRating('confusion')}
              </View>
              
              <Text style={styles.inputLabel}>Notes / Detailed Observations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe any specific behavioral changes..."
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={handleLogObservation}
              disabled={linkLoading}
            >
              {linkLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit & AI Analyze</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { flex: 1 },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, color: '#1E293B' },
  textArea: { height: 100, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: '#6366F1', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabledBtn: { opacity: 0.7 },
  infoBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, marginTop: 20, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 12, fontSize: 13, color: '#3B82F6', lineHeight: 18 },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 15 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748B', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 5, textAlign: 'center' },
  patientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  patientAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  patientEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  patientContext: { fontSize: 14, color: '#6366F1', marginBottom: 20, fontWeight: '500' },
  modalScroll: { marginBottom: 20 },
  observationItem: { marginBottom: 20 },
  obsLabel: { fontSize: 15, fontWeight: '600', color: '#475569', marginBottom: 10 },
  ratingContainer: { flexDirection: 'row', gap: 10 },
  ratingCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  ratingCircleActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  ratingText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  ratingTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#6366F1', padding: 18, borderRadius: 15, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
