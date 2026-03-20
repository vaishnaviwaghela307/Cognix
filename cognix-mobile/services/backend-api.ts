/**
 * Backend API Service for User Management
 * Handles all API calls to Node.js backend
 */

// Backend server URL - Update this with your actual server URL
// For Android Emulator: http://10.0.2.2:3000
// For iOS Simulator: http://localhost:3000
// For Physical Device: http://YOUR_PC_IP:3000
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.0.235:3000";


// Export as API_URL for compatibility with other services
export const API_URL = BACKEND_URL;

export interface UserProfile {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  fullName?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  education?: string;
  role?: 'patient' | 'caregiver';
  familyHistory?: boolean;
  medicalConditions?: boolean;
  profileCompleted?: boolean;
  caregivers?: string[];
  patients?: string[];
}

export interface TestData {
  age: number;
  gender: number;
  mmse_score: number;
  functional_assessment: number;
  memory_complaints: number;
  behavioral_problems: number;
  adl_score: number;
}

export interface TestResult {
  testData: TestData;
  prediction: any;
  testType: 'hybrid' | 'individual' | 'multiclass';
}

class BackendAPIService {
  private baseURL: string;

  constructor(baseURL: string = BACKEND_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Update the base URL
   */
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  /**
   * Get current base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Create or update user after Clerk authentication
   */
  async createOrUpdateUser(userData: Partial<UserProfile>): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Create/Update user failed:", error);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getUser(clerkId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/users/${clerkId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get user failed:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    clerkId: string,
    profileData: Partial<UserProfile>
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/users/${clerkId}/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profileData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Update profile failed:", error);
      throw error;
    }
  }

  /**
   * Save test result
   */
  async saveTest(
    clerkId: string,
    testResult: TestResult
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId,
          ...testResult,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Save test failed:", error);
      throw error;
    }
  }

  /**
   * Get user's test history
   */
  async getTestHistory(clerkId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/tests/${clerkId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get test history failed:", error);
      throw error;
    }
  }

  /**
   * Get latest test result
   */
  async getLatestTest(clerkId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/tests/${clerkId}/latest`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get latest test failed:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }

  /**
   * Analyze clinical assessment answers for a domain
   */
  async analyzeClinicalAnswers(
    domain: string,
    answers: string[]
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/clinical/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain,
          answers,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Analyze clinical answers failed:", error);
      throw error;
    }
  }

  /**
   * Complete clinical assessment and get prediction
   */
  async completeClinicalAssessment(
    userId: string,
    domainScores: {
      demographic_score: number;
      cognitive_score: number;
      motoric_score: number;
      neuropsychiatric_score: number;
    },
    userAnswers: {
      demographic: string[];
      cognitive: string[];
      motoric: string[];
      neuropsychiatric: string[];
    },
    includeCaregiver: boolean = false
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/clinical/assess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          ...domainScores,
          user_answers: userAnswers,
          includeCaregiver
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Complete clinical assessment failed:", error);
      throw error;
    }
  }

  /**
   * Get clinical assessment history
   */
  async getClinicalHistory(
    userId: string,
    limit: number = 10,
    skip: number = 0
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/clinical/history/${userId}?limit=${limit}&skip=${skip}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get clinical history failed:", error);
      throw error;
    }
  }

  /**
   * Get specific clinical assessment
   */
  async getClinicalAssessment(assessmentId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/clinical/assessment/${assessmentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get clinical assessment failed:", error);
      throw error;
    }
  }

  /**
   * Generate dynamic clinical questions using AI
   */
  async generateClinicalQuestions(domain?: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/clinical/generate-questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain: domain || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Generate clinical questions failed:", error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getStats(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/api/history/stats/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get stats failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const backendAPI = new BackendAPIService();

// Export class for custom instances
export default BackendAPIService;
