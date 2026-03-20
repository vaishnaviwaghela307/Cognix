// History Service - Store and retrieve user's test/scan history

// Get backend URL from env
const getBackendUrl = () => {
  // Try environment variable first
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  // Fallback to local IP
  return 'http://192.168.0.235:3000';
};

const BACKEND_URL = getBackendUrl();

export interface HistoryItem {
  _id: string;
  userId: string;
  type: 'scan' | 'test' | 'clinical' | 'report' | 'speech';
  documentInfo?: {
    type: string;
    imageUrl?: string;
    rawText?: string;
    clinicalValues?: {
      name: string;
      value: string;
      unit: string;
    }[];
  };
  testInfo?: {
    testType: string;
    score: number;
    maxScore: number;
    percentage: number;
  };
  prediction?: {
    disease: string;
    confidence: number;
    severity: string;
    riskLevel: string;
  };
  aiAnalysis?: {
    cognitiveAssessment?: {
      overallRisk: string;
      riskScore: number;
      explanation: string;
    };
    keyFindings?: {
      finding: string;
      status: string;
    }[];
    recommendations?: {
      immediate?: string[];
      lifestyle?: string[];
      medical?: string[];
    };
  };
  report?: {
    reportId: string;
    reportUrl: string;
    generatedAt: string;
    reportType: 'ocr_scan' | 'clinical_test' | 'quick_test' | 'comprehensive';
  };
  summary?: string;
  recommendations?: string[];
  behavioralMetrics?: {
    timeTakenPerQuestion: number[];
    delayBeforeFirstInput: number[];
    editCount: number[];
    backspaceCount: number[];
    typingSpeedChanges: number[];
    answerModificationFrequency: number;
    hesitationIndex?: number;
    responseInstabilityScore?: number;
    cognitiveFrictionScore?: number;
    aiBehavioralSummary?: string;
  };
  createdAt: string;
}

export interface SaveHistoryParams {
  userId: string;
  type: 'scan' | 'test' | 'clinical' | 'report' | 'speech';
  documentInfo?: any;
  testInfo?: any;
  clinicalInfo?: any;
  prediction?: any;
  aiAnalysis?: any;
  imageBase64?: string;
  report?: {
    reportId: string;
    reportUrl: string;
    generatedAt: string;
    reportType: 'ocr_scan' | 'clinical_test' | 'quick_test' | 'comprehensive';
  };
  summary?: string;
  recommendations?: string[];
  behavioralMetrics?: {
    timeTakenPerQuestion: number[];
    delayBeforeFirstInput: number[];
    editCount: number[];
    backspaceCount: number[];
    typingSpeedChanges: number[];
    answerModificationFrequency: number;
    hesitationIndex?: number;
    responseInstabilityScore?: number;
    cognitiveFrictionScore?: number;
    aiBehavioralSummary?: string;
  };
  speechAnalysis?: {
    transcript: string;
    taskType: string;
    coherenceScore: number;
    fluencyScore: number;
    recallDifficulty: string;
    pauseCount: number;
    duration: number;
    markers: string[];
    clinicalInsight: string;
  };
}

class HistoryService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_URL;
    console.log('📚 History Service initialized:', this.baseUrl);
  }

  /**
   * Save a history record
   */
  async saveHistory(params: SaveHistoryParams): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('💾 Saving history...', params.type);

      const response = await fetch(`${this.baseUrl}/api/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save history');
      }

      console.log('✅ History saved successfully');
      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Error saving history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's history
   */
  async getHistory(
    userId: string, 
    options?: { type?: string; limit?: number; skip?: number }
  ): Promise<{ success: boolean; data?: HistoryItem[]; pagination?: any; error?: string }> {
    try {
      console.log('📖 Fetching history for user:', userId);

      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.skip) params.append('skip', options.skip.toString());

      const url = `${this.baseUrl}/api/history/${userId}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history');
      }

      console.log(`✅ Fetched ${data.data.length} history records`);
      return { success: true, data: data.data, pagination: data.pagination };
    } catch (error) {
      console.error('❌ Error fetching history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get a single history record
   */
  async getHistoryRecord(id: string): Promise<{ success: boolean; data?: HistoryItem; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/history/record/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch record');
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Error fetching record:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete a history record
   */
  async deleteHistory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete record');
      }

      console.log('✅ Record deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting record:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user statistics
   */
  async getStats(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/history/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's reports (only records with PDF reports)
   */
  async getReports(
    userId: string,
    options?: { limit?: number; skip?: number }
  ): Promise<{ success: boolean; data?: HistoryItem[]; pagination?: any; error?: string }> {
    try {
      console.log('📄 Fetching reports for user:', userId);

      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.skip) params.append('skip', options.skip.toString());

      const url = `${this.baseUrl}/api/history/reports/${userId}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      console.log(`✅ Fetched ${data.data.length} reports`);
      return { success: true, data: data.data, pagination: data.pagination };
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  /**
   * Get user's cognitive timeline
   */
  async getTimeline(userId: string): Promise<{ 
    success: boolean; 
    data?: { 
      timeline: any[]; 
      summary: string;
      metrics?: any;
    }; 
    error?: string 
  }> {
    try {
      console.log('📈 Fetching cognitive timeline for user:', userId);

      const response = await fetch(`${this.baseUrl}/api/history/timeline/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch timeline');
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Error fetching timeline:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default new HistoryService();
