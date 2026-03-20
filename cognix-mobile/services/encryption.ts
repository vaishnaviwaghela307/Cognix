// Encryption Service - AES Encryption for Secure Document Storage
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENCRYPTION_KEY_STORAGE = '@encryption_password_hash';
const SALT = 'cognix_secure_salt_2024';

class EncryptionService {
  private passwordHash: string | null = null;

  /**
   * Check if password is set
   */
  async isPasswordSet(): Promise<boolean> {
    const hash = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
    return hash !== null;
  }

  /**
   * Set encryption password (first time only)
   */
  async setPassword(password: string): Promise<boolean> {
    try {
      const hash = CryptoJS.SHA256(password + SALT).toString();
      await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE, hash);
      this.passwordHash = hash;
      return true;
    } catch (error) {
      console.error('Error setting password:', error);
      return false;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string): Promise<boolean> {
    try {
      const storedHash = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
      if (!storedHash) return false;

      const inputHash = CryptoJS.SHA256(password + SALT).toString();
      if (inputHash === storedHash) {
        this.passwordHash = storedHash;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Encrypt data with AES
   */
  encrypt(data: string, password: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, password + SALT).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data with AES
   */
  decrypt(encryptedData: string, password: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password + SALT);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Decryption failed - wrong password');
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - check password');
    }
  }

  /**
   * Encrypt and store document
   */
  async storeSecureDocument(
    documentId: string,
    documentData: any,
    password: string
  ): Promise<boolean> {
    try {
      const jsonData = JSON.stringify(documentData);
      const encrypted = this.encrypt(jsonData, password);
      await AsyncStorage.setItem(`@secure_doc_${documentId}`, encrypted);
      return true;
    } catch (error) {
      console.error('Error storing secure document:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt document
   */
  async retrieveSecureDocument(
    documentId: string,
    password: string
  ): Promise<any | null> {
    try {
      const encrypted = await AsyncStorage.getItem(`@secure_doc_${documentId}`);
      if (!encrypted) return null;

      const decrypted = this.decrypt(encrypted, password);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error retrieving secure document:', error);
      return null;
    }
  }

  /**
   * Get list of stored document IDs
   */
  async getSecureDocumentList(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const docKeys = keys.filter(k => k.startsWith('@secure_doc_'));
      return docKeys.map(k => k.replace('@secure_doc_', ''));
    } catch (error) {
      console.error('Error getting document list:', error);
      return [];
    }
  }

  /**
   * Delete secure document
   */
  async deleteSecureDocument(documentId: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(`@secure_doc_${documentId}`);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  /**
   * Change password (re-encrypts all documents)
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Verify old password
      if (!await this.verifyPassword(oldPassword)) {
        throw new Error('Wrong old password');
      }

      // Get all documents
      const docIds = await this.getSecureDocumentList();
      const documents: { id: string; data: any }[] = [];

      // Decrypt all with old password
      for (const id of docIds) {
        const data = await this.retrieveSecureDocument(id, oldPassword);
        if (data) {
          documents.push({ id, data });
        }
      }

      // Set new password
      await this.setPassword(newPassword);

      // Re-encrypt all with new password
      for (const doc of documents) {
        await this.storeSecureDocument(doc.id, doc.data, newPassword);
      }

      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }
}

export default new EncryptionService();
