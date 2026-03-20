import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Prevent duplicate verification attempts
  const isVerifyingRef = useRef(false);
  const isOAuthInProgressRef = useRef(false);

  // Handle Sign Up
  const onSignUpPress = async () => {
    if (!isLoaded) return;
    
    setLoading(true);

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress,
        password,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      setPendingVerification(true);
      console.log('✅ Verification email sent');
    } catch (err: any) {
      console.error('❌ Sign up error:', err);
      const errorMessage = err.errors?.[0]?.message || 'Sign up failed';
      Alert.alert('Sign Up Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle Verification
  const onPressVerify = async () => {
    if (!isLoaded) return;
    
    // Prevent duplicate verification attempts
    if (isVerifyingRef.current) {
      console.log('⏳ Verification already in progress, skipping...');
      return;
    }
    
    setLoading(true);
    isVerifyingRef.current = true;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      await setActive({ session: completeSignUp.createdSessionId });
      console.log('✅ Email verified. User will be synced automatically.');
      // Navigation and sync will happen automatically via _layout
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      
      // Handle already verified case gracefully
      const errorMessage = err.errors?.[0]?.message || err.message || 'Verification failed';
      if (errorMessage.includes('already been verified')) {
        console.log('ℹ️ Email already verified, checking session...');
        // Try to activate the session if it exists
        if (signUp.createdSessionId) {
          try {
            await setActive({ session: signUp.createdSessionId });
            console.log('✅ Session activated successfully');
            return;
          } catch (sessionErr) {
            console.error('❌ Failed to activate session:', sessionErr);
          }
        }
      }
      
      Alert.alert('Verification Error', errorMessage);
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  };

  const onGoogleSignUp = async () => {
    // Prevent duplicate OAuth attempts
    if (isOAuthInProgressRef.current) {
      console.log('⏳ OAuth already in progress, skipping...');
      return;
    }
    
    try {
      setLoading(true);
      isOAuthInProgressRef.current = true;
      console.log('🔐 Starting Google OAuth Sign-Up...');
      
      const result = await startOAuthFlow();
      const { createdSessionId, signIn, signUp: oauthSignUp, setActive } = result;
      
      // Log detailed OAuth result for debugging
      console.log('📊 OAuth Flow Result:', JSON.stringify({
        createdSessionId: createdSessionId || 'null',
        signUpStatus: oauthSignUp?.status || 'null',
        signInStatus: signIn?.status || 'null',
        signUpSessionId: oauthSignUp?.createdSessionId || 'null',
        signInSessionId: signIn?.createdSessionId || 'null',
      }, null, 2));
      
      // Case 1: Direct session ID available
      if (createdSessionId) {
        console.log('✅ Direct session ID available, activating...');
        await setActive!({ session: createdSessionId });
        console.log('✅ Session activated successfully!');
        return;
      }
      
      // Case 2: SignUp has session ID
      if (oauthSignUp?.createdSessionId) {
        console.log('✅ SignUp session ID available, activating...');
        await setActive!({ session: oauthSignUp.createdSessionId });
        console.log('✅ Session activated successfully!');
        return;
      }
      
      // Case 3: SignIn has session ID
      if (signIn?.createdSessionId) {
        console.log('✅ SignIn session ID available, activating...');
        await setActive!({ session: signIn.createdSessionId });
        console.log('✅ Session activated successfully!');
        return;
      }
      
      // Case 4: SignUp needs to be completed (missing_requirements)
      if (oauthSignUp && oauthSignUp.status === 'missing_requirements') {
        console.log('⚠️ OAuth SignUp has missing_requirements, checking what is needed...');
        console.log('📋 Missing fields:', oauthSignUp.missingFields);
        console.log('📋 Unverified fields:', oauthSignUp.unverifiedFields);
        
        // Get email from OAuth data to generate username
        const emailAddress = oauthSignUp.emailAddress;
        console.log('📧 Email from OAuth:', emailAddress);
        
        // Check if we need to provide missing fields
        const missingFields = oauthSignUp.missingFields || [];
        
        if (missingFields.includes('username') || missingFields.includes('phone_number')) {
          console.log('🔄 Attempting to update with missing fields...');
          
          try {
            // Generate username from email (before @ symbol) + random suffix
            const emailParts = emailAddress?.split('@') || ['user'];
            const baseUsername = emailParts[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            const generatedUsername = `${baseUsername}${randomSuffix}`;
            
            console.log('👤 Generated username:', generatedUsername);
            
            // Build update payload with only required fields
            const updatePayload: any = {};
            
            if (missingFields.includes('username')) {
              updatePayload.username = generatedUsername;
            }
            
            // Update the signUp with missing fields
            const updatedSignUp = await oauthSignUp.update(updatePayload);
            console.log('📊 Updated SignUp status:', updatedSignUp.status);
            
            if (updatedSignUp.status === 'complete' && updatedSignUp.createdSessionId) {
              console.log('✅ SignUp completed after providing username!');
              await setActive!({ session: updatedSignUp.createdSessionId });
              console.log('✅ Session activated successfully!');
              return;
            }
            
            // If still missing requirements (probably phone_number), try to skip it
            if (updatedSignUp.status === 'missing_requirements') {
              console.log('📋 Still missing fields after username:', updatedSignUp.missingFields);
              
              // Phone number might be required in Clerk - we can't skip that in code
              // Show alert to inform user
              if (updatedSignUp.missingFields?.includes('phone_number')) {
                Alert.alert(
                  'Configuration Issue',
                  'Phone number is required in your Clerk settings. Please go to Clerk Dashboard → Configure → Email, Phone, Username and make Phone Number optional, or use email sign-up.',
                  [{ text: 'OK' }]
                );
                return;
              }
            }
          } catch (updateError: any) {
            console.error('❌ Failed to update signUp with username:', updateError);
            console.log('📊 Update error details:', JSON.stringify(updateError.errors || updateError, null, 2));
          }
        }
        
        // If email verification is needed
        if (oauthSignUp.unverifiedFields?.includes('email_address')) {
          console.log('📧 Email verification needed, preparing...');
          await oauthSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setPendingVerification(true);
          Alert.alert(
            'Verify Email',
            'Please check your email for a verification code.'
          );
          return;
        }
      }
      
      // Case 5: SignIn needs more steps
      if (signIn && (signIn.status === 'needs_identifier' || signIn.status === 'needs_first_factor' || signIn.status === 'needs_second_factor')) {
        console.log('⚠️ OAuth SignIn needs additional steps:', signIn.status);
        
        // This usually means user exists but needs to complete sign-in
        // Try using signUp with transfer for this case
        if (oauthSignUp) {
          try {
            console.log('🔄 Attempting to complete via signUp update...');
            const updatedSignUp = await oauthSignUp.update({});
            console.log('📊 Updated SignUp status:', updatedSignUp.status);
            
            if (updatedSignUp.status === 'complete' && updatedSignUp.createdSessionId) {
              await setActive!({ session: updatedSignUp.createdSessionId });
              console.log('✅ Session activated after update!');
              return;
            }
          } catch (updateError) {
            console.log('⚠️ Update attempt failed:', updateError);
          }
        }
      }
      
      // If we reach here, show error with details
      console.error('❌ OAuth flow could not produce a session');
      console.log('📊 Final states - SignUp:', oauthSignUp?.status, 'SignIn:', signIn?.status);
      
      Alert.alert(
        'OAuth Incomplete',
        'Google sign-up could not be completed. This might be a configuration issue. Please try email sign-up instead.'
      );
      
    } catch (err: any) {
      console.error('❌ OAuth error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'OAuth failed';
      console.log('📊 Error details:', JSON.stringify(err.errors || err, null, 2));
      
      if (!errorMessage.toLowerCase().includes('cancel') && !errorMessage.toLowerCase().includes('user_cancelled')) {
        Alert.alert('Google Sign-Up Failed', errorMessage);
      }
    } finally {
      setLoading(false);
      isOAuthInProgressRef.current = false;
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>✉️</Text>
            </View>
            <Text style={styles.title}>Verify Email</Text>
            <Text style={styles.subtitle}>We've sent a code to {emailAddress}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                value={code}
                placeholder="Enter code"
                onChangeText={(code) => setCode(code)}
                style={styles.input}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.signInButton, loading && styles.disabledButton]}
              onPress={onPressVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.signInButtonText}>Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🚀</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Cognix for AI-powered health monitoring</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                value={firstName}
                placeholder="First Name"
                onChangeText={setFirstName}
                style={styles.input}
                placeholderTextColor={COLORS.textSecondary}
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                value={lastName}
                placeholder="Last Name"
                onChangeText={setLastName}
                style={styles.input}
                placeholderTextColor={COLORS.textSecondary}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              value={emailAddress}
              placeholder="Enter your email"
              onChangeText={setEmailAddress}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              placeholder="Create a password"
              secureTextEntry={true}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.disabledButton]}
            onPress={onSignUpPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.signInButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.disabledButton]}
            onPress={onGoogleSignUp}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={COLORS.text} style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity disabled={loading}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoIcon: {
    fontSize: 30,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    height: 50,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
  signInButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.surface,
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: COLORS.surface,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  footerLink: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
