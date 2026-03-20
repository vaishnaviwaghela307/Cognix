/**
 * Custom Authentication Hook
 * Handles user authentication state and automatic MongoDB sync
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';
import { backendAPI } from '@/services/backend-api';

export interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: any;
  isSyncing: boolean;
  syncError: string | null;
  syncAttempts: number;
}

export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user } = useUser();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncAttempts, setSyncAttempts] = useState(0);
  
  const hasSyncedRef = useRef(false);
  const lastSyncAttemptRef = useRef(0);

  // Sync user to backend whenever authentication state changes
  useEffect(() => {
    const syncUserToBackend = async () => {
      // Only sync if user is signed in and we haven't synced yet
      if (!isSignedIn || !user || hasSyncedRef.current || isSyncing) {
        return;
      }

      // Prevent too frequent sync attempts (wait at least 2 seconds)
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < 2000) {
        return;
      }

      try {
        setIsSyncing(true);
        setSyncError(null);
        lastSyncAttemptRef.current = now;

        console.log('🔄 Syncing user to backend...', {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress
        });

        const userData = {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          profileImageUrl: user.imageUrl || '',
        };

        const response = await backendAPI.createOrUpdateUser(userData);

        if (response.success) {
          console.log('✅ User synced to backend successfully');
          hasSyncedRef.current = true;
          setSyncError(null);
        } else {
          throw new Error(response.error || 'Failed to sync user');
        }
      } catch (error: any) {
        console.error('❌ Failed to sync user:', error);
        setSyncError(error.message || 'Sync failed');
        setSyncAttempts(prev => prev + 1);
        
        // Retry after 3 seconds if less than 3 attempts
        if (syncAttempts < 3) {
          console.log(`⏳ Will retry sync in 3 seconds (attempt ${syncAttempts + 1}/3)...`);
          setTimeout(() => {
            hasSyncedRef.current = false;
            lastSyncAttemptRef.current = 0;
          }, 3000);
        }
      } finally {
        setIsSyncing(false);
      }
    };

    syncUserToBackend();
  }, [isSignedIn, user, isSyncing, syncAttempts]);

  // Reset sync state when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      hasSyncedRef.current = false;
      lastSyncAttemptRef.current = 0;
      setSyncError(null);
      setSyncAttempts(0);
    }
  }, [isSignedIn]);

  return {
    isLoaded,
    isSignedIn,
    user,
    isSyncing,
    syncError,
    syncAttempts,
    hasValidBackendSync: hasSyncedRef.current && !syncError,
  };
}
