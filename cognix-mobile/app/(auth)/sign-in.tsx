import { useSignIn, useOAuth } from '@clerk/clerk-expo';
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

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Prevent duplicate sign-in attempts
  const isSigningInRef = useRef(false);
  const isOAuthInProgressRef = useRef(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    
    // Prevent duplicate sign-in attempts
    if (isSigningInRef.current) {
      console.log('⏳ Sign-in already in progress, skipping...');
      return;
    }
    
    setLoading(true);
    isSigningInRef.current = true;
    console.log('📧 Attempting email sign in:', emailAddress);

    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      console.log('✅ Sign In Response:', completeSignIn.status);

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
        console.log('✅ Session activated. User will be synced automatically.');
        // Navigation will happen automatically via _layout
      } else {
        console.error('⚠️ Sign in not complete. Status:', completeSignIn.status);
        Alert.alert('Sign In Error', 'Sign in step not complete: ' + completeSignIn.status);
      }
    } catch (err: any) {
      console.error('❌ Sign In Error:', JSON.stringify(err, null, 2));
      const errorMessage = err.errors?.[0]?.message || err.message || 'An error occurred';
      Alert.alert('Sign In Failed', errorMessage);
    } finally {
      setLoading(false);
      isSigningInRef.current = false;
    }
  };
  
  const onGoogleSignIn = async () => {
    // Prevent duplicate OAuth attempts
    if (isOAuthInProgressRef.current) {
      console.log('⏳ OAuth already in progress, skipping...');
      return;
    }
    
    try {
      setLoading(true);
      isOAuthInProgressRef.current = true;
      console.log('🔐 Starting Google OAuth Sign-In...');
      
      const result = await startOAuthFlow();
      const { createdSessionId, signIn: oauthSignIn, signUp, setActive } = result;
      
      // Log detailed OAuth result for debugging
      console.log('📊 OAuth Flow Result:', JSON.stringify({
        createdSessionId: createdSessionId || 'null',
        signInStatus: oauthSignIn?.status || 'null',
        signUpStatus: signUp?.status || 'null',
        signInSessionId: oauthSignIn?.createdSessionId || 'null',
        signUpSessionId: signUp?.createdSessionId || 'null',
      }, null, 2));
      
      // Case 1: Direct session ID available
      if (createdSessionId) {
        console.log('✅ Direct session ID available, activating...');
        await setActive!({ session: createdSessionId });
        console.log('✅ Session activated successfully!');
        return;
      }
      
      // Case 2: SignIn has session ID
      if (oauthSignIn?.createdSessionId) {
        console.log('✅ SignIn session ID available, activating...');
        await setActive!({ session: oauthSignIn.createdSessionId });
        console.log('✅ Session activated successfully!');
        return;
      }
      
      // Case 3: SignUp has session ID (new user)
      if (signUp?.createdSessionId) {
        console.log('✅ SignUp session ID available, activating...');
        await setActive!({ session: signUp.createdSessionId });
        console.log('✅ Session activated successfully!');
        return;
      }
      
      // Case 4: SignIn needs more steps
      if (oauthSignIn && (oauthSignIn.status === 'needs_identifier' || oauthSignIn.status === 'needs_first_factor' || oauthSignIn.status === 'needs_second_factor')) {
        console.log('⚠️ OAuth SignIn needs additional steps:', oauthSignIn.status);
        
        // Try to reload and check status
        try {
          console.log('🔄 Attempting to reload signIn...');
          const reloadedSignIn = await oauthSignIn.reload();
          console.log('📊 Reloaded SignIn status:', reloadedSignIn.status);
          
          if (reloadedSignIn.status === 'complete' && reloadedSignIn.createdSessionId) {
            await setActive!({ session: reloadedSignIn.createdSessionId });
            console.log('✅ Session activated after reload!');
            return;
          }
        } catch (reloadErr) {
          console.log('⚠️ Reload attempt failed:', reloadErr);
        }
      }
      
      // Case 5: SignUp needs to be completed (new user via OAuth sign-in)
      if (signUp && signUp.status === 'missing_requirements') {
        console.log('⚠️ OAuth SignUp has missing_requirements, checking what is needed...');
        console.log('📋 Missing fields:', signUp.missingFields);
        console.log('📋 Unverified fields:', signUp.unverifiedFields);
        
        // Get email from OAuth data to generate username
        const emailAddress = signUp.emailAddress;
        console.log('📧 Email from OAuth:', emailAddress);
        
        // Check if we need to provide missing fields
        const missingFields = signUp.missingFields || [];
        
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
            const updatedSignUp = await signUp.update(updatePayload);
            console.log('📊 Updated SignUp status:', updatedSignUp.status);
            
            if (updatedSignUp.status === 'complete' && updatedSignUp.createdSessionId) {
              console.log('✅ SignUp completed after providing username!');
              await setActive!({ session: updatedSignUp.createdSessionId });
              console.log('✅ Session activated successfully!');
              return;
            }
            
            // If still missing requirements (probably phone_number)
            if (updatedSignUp.status === 'missing_requirements') {
              console.log('📋 Still missing fields after username:', updatedSignUp.missingFields);
              
              if (updatedSignUp.missingFields?.includes('phone_number')) {
                Alert.alert(
                  'Configuration Issue',
                  'Phone number is required in your Clerk settings. Please go to Clerk Dashboard → Configure → Email, Phone, Username and make Phone Number optional, or use email sign-in.',
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
      }
      
      // If we reach here, show error with details
      console.error('❌ OAuth flow could not produce a session');
      console.log('📊 Final states - SignIn:', oauthSignIn?.status, 'SignUp:', signUp?.status);
      
      Alert.alert(
        'OAuth Incomplete',
        'Google sign-in could not be completed. This might be a configuration issue. Please try email sign-in instead.'
      );
      
    } catch (err: any) {
      console.error('❌ OAuth error:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'OAuth failed';
      console.log('📊 Error details:', JSON.stringify(err.errors || err, null, 2));
      
      if (!errorMessage.toLowerCase().includes('cancel') && !errorMessage.toLowerCase().includes('user_cancelled')) {
        Alert.alert('Google Sign-In Failed', errorMessage);
      }
    } finally {
      setLoading(false);
      isOAuthInProgressRef.current = false;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🧠</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your cognitive health journey</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              value={emailAddress}
              placeholder="Enter your email"
              onChangeText={(email) => setEmailAddress(email)}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              placeholder="Enter your password"
              secureTextEntry={true}
              onChangeText={(password) => setPassword(password)}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
              editable={!loading}
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.disabledButton]}
            onPress={onSignInPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.disabledButton]}
            onPress={onGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={COLORS.text} style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity disabled={loading}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
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
