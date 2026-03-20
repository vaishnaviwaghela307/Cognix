/**
 * Authentication Sync Service
 * Automatically syncs Clerk users to MongoDB backend
 */

import { backendAPI } from './backend-api';

export interface ClerkUser {
  id: string;
  emailAddresses: Array<{
    emailAddress: string;
  }>;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

class AuthSyncService {
  /**
   * Sync Clerk user to MongoDB backend
   * Call this after successful authentication (both email and OAuth)
   */
  async syncUserToBackend(clerkUser: ClerkUser): Promise<void> {
    try {
      console.log('🔄 Syncing user to backend:', clerkUser.id);

      const userData = {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        profileImageUrl: clerkUser.imageUrl || '',
      };

      const response = await backendAPI.createOrUpdateUser(userData);

      if (response.success) {
        console.log('✅ User synced to backend successfully');
      } else {
        console.error('❌ Failed to sync user:', response.error);
      }
    } catch (error) {
      console.error('❌ Error syncing user to backend:', error);
      // Don't throw error - allow user to continue even if backend sync fails
    }
  }

  /**
   * Check if user exists in backend
   */
  async checkUserExists(clerkId: string): Promise<boolean> {
    try {
      const response = await backendAPI.getUser(clerkId);
      return response.success && response.user;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }
}

export const authSyncService = new AuthSyncService();
export default authSyncService;
