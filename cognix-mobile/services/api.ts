// API Service for Cognix Mobile App
// Multiclass ML Model for 6 Neurodegenerative Diseases

// Flask ML API - For predictions (Deployed on Render)
// Flask ML API - For predictions (Local)
const ML_API_URL = process.env.EXPO_PUBLIC_FLASK_URL || 'https://cognix-flask-server-x2u5.onrender.com';


// Use ML API for predictions
const API_BASE_URL = ML_API_URL;

export interface PredictionWeights {
  individual: number;
  multiclass: number;
}

export interface PredictionFeatures {
  MMSE?: number;
  Age?: number;
  Gender?: number;
  Education?: number;
  CDR?: number;
  FunctionalAssessment?: number;
  MemoryComplaints?: number;
  BehavioralProblems?: number;
  ADL_Score?: number;
  Confusion?: number;
  [key: string]: any;
}

export interface DiseaseScore {
  disease: string;
  probability: number;
}

export interface PredictionResult {
  predicted_disease: string;
  confidence: number;
  risk_level: string;
  severity: string;
  top_3_predictions: DiseaseScore[];
  all_predictions: {
    alzheimers?: number;
    parkinsons?: number;
    mci?: number;
    vascular?: number;
    ftd?: number;
    lbd?: number;
  };
  all_scores?: Record<string, number>;
  explainability?: {
    symptom_breakdown: Record<string, number>;
    top_features: { feature: string; importance: number }[];
    reasoning_trace: string;
  };
  model_version?: string;
}

export interface ApiResponse {
  success: boolean;
  prediction?: PredictionResult;
  error?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async predictHybrid(
    features: PredictionFeatures,
    weights?: PredictionWeights
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          features,
          weights: weights || { individual: 0.4, multiclass: 0.6 },
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Prediction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Prediction failed',
      };
    }
  }

  /**
   * Main prediction method using multiclass model
   * This is the recommended method for all disease predictions
   */
  async predict(features: PredictionFeatures): Promise<ApiResponse> {
    return this.predictMulticlass(features);
  }

  async predictMulticlass(
    features: PredictionFeatures
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/multiclass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Multiclass prediction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Prediction failed',
      };
    }
  }

  async testPrediction(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Test prediction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      };
    }
  }

  // ==================== MODEL MANAGEMENT ====================

  /**
   * Get current model version info
   * Use this to display model version in UI
   */
  async getModelVersion(): Promise<{
    success: boolean;
    version?: string;
    loaded_at?: string;
    ready?: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/model/version`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get model version failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version',
      };
    }
  }

  /**
   * Check if a newer model is available
   */
  async checkModelUpdate(): Promise<{
    success: boolean;
    current_version?: string;
    update_available?: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/model/check-update`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Check model update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check update',
      };
    }
  }

  /**
   * Get detailed model info
   */
  async getModelInfo(): Promise<{
    success: boolean;
    loaded?: boolean;
    model_type?: string;
    version?: string;
    classes?: string[];
    feature_count?: number | string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/model/info`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get model info failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get info',
      };
    }
  }
}

export default new ApiService();
