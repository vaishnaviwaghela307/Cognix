import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@/services/cache';
import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { initializeLanguage } from '@/services/language';
import { LanguageProvider } from '@/contexts/LanguageContext';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

function InitialLayout() {
  const { isLoaded, isSignedIn, isSyncing, syncError } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize language on mount
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'welcome';
    
    console.log('📱 Auth State:', { 
      isSignedIn, 
      inTabsGroup, 
      segments,
      isSyncing 
    });

    if (isSignedIn && inAuthGroup) {
      console.log('✅ User signed in, redirecting to Home');
      router.replace('/(tabs)/home');
    } else if (!isSignedIn && inTabsGroup) {
      console.log('🔒 User signed out, redirecting to Welcome');
      router.replace('/welcome');
    } else if (!isSignedIn && segments.length === 0) {
      // Handle root path
      router.replace('/welcome');
    }
  }, [isSignedIn, segments, isLoaded, router]);

  // Show sync error if any (non-blocking)
  useEffect(() => {
    if (syncError) {
      console.warn('⚠️ Backend sync error:', syncError);
      // Don't block user, just log the error
    }
  }, [syncError]);

  if (!isLoaded || (isSignedIn && isSyncing)) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: COLORS.background 
      }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ 
          marginTop: 20, 
          color: COLORS.textSecondary,
          fontSize: 16
        }}>
          {isSyncing ? 'Syncing your account...' : 'Loading Cognix...'}
        </Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache}>
      <LanguageProvider>
        <InitialLayout />
      </LanguageProvider>
    </ClerkProvider>
  );
}

