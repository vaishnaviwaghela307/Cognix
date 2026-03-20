import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  
  const brainScale = useSharedValue(1);
  const pulse1 = useSharedValue(0.3);
  const pulse2 = useSharedValue(0.3);
  
  useEffect(() => {
    brainScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    pulse1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      false
    );
    pulse2.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      false
    ));
  }, []);

  const brainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: brainScale.value }],
  }));

  const pulseStyle1 = useAnimatedStyle(() => ({
    opacity: pulse1.value * 0.4,
    transform: [{ scale: 1 + pulse1.value * 0.4 }],
  }));

  const pulseStyle2 = useAnimatedStyle(() => ({
    opacity: pulse2.value * 0.3,
    transform: [{ scale: 1 + pulse2.value * 0.7 }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      />

      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.brainContainer}>
            <Animated.View style={[styles.pulse, styles.pulse1, pulseStyle1]} />
            <Animated.View style={[styles.pulse, styles.pulse2, pulseStyle2]} />
            
            <Animated.View style={[styles.brainCircle, brainStyle]}>
              <LinearGradient
                colors={['#818CF8', '#6366F1', '#4F46E5']}
                style={styles.brainGradient}
              >
              <MaterialCommunityIcons name="brain" size={60}   color="#ffffffff" />
              </LinearGradient>
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.featurePills}>
            <View style={styles.pill}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.pillText}>Secure</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="sparkles" size={12} color="#F59E0B" />
              <Text style={styles.pillText}>AI Powered</Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Animated.View entering={FadeInUp.delay(200)} style={styles.contentCard}>
          <View style={styles.badge}>
            <FontAwesome5 name="award" size={10} color="#7C3AED" />
            <Text style={styles.badgeText}>EARLY DETECTION</Text>
          </View>

          <Text style={styles.title}>
                {'\t\t\t\t\t'}Cognitive Health{'\n'}
            <Text style={styles.titleAccent}>{'\t\t\t\t\t\t\t\t'}Made Simple</Text>
          </Text>

          <Text style={styles.description}>
            AI-powered screening for cognitive disorders. Get insights in minutes.
          </Text>

          

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/sign-up')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>Get Started Free</Text>
              <View style={styles.buttonArrow}>
                <Ionicons name="arrow-forward" size={16} color="#6366F1" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/sign-in')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>

          <View style={styles.trustRow}>
            <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
            <Text style={styles.trustText}>Your data is encrypted & secure</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B4B',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 0.42,
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    top: 120,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brainContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  pulse1: {
    width: 120,
    height: 120,
  },
  pulse2: {
    width: 150,
    height: 150,
  },
  brainCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  brainGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featurePills: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  pillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  contentSection: {
    flex: 0.58,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentCard: {
    flex: 0.75,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24
    
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    marginBottom: 14,
  },
  badgeText: {
    color: '#7C3AED',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 34,
    marginBottom: 10,
  },
  titleAccent: {
    color: '#6366F1',
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: '#E2E8F0',
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
});
