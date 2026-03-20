// OCR Service for Document Scanning with AI Analysis
// Uses Tesseract OCR + ML Models + Gemini AI for comprehensive analysis

import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Flask backend URL - Using LOCAL server to bypass Render timeout
const FLASK_BASE_URL = 'https://cognix-flask-server-x2u5.onrender.com';

// Types for new API response
export interface DocumentInfo {
  type: string;
  confidence: number;
  keyIndicators: string[];
}

export interface ClinicalValue {
  name: string;
  value: string;
  unit: string;
}

export interface ExtractedData {
  clinicalValues: ClinicalValue[];
  rawText: string;
}

export interface MLPrediction {
  predicted_disease: string;
  confidence: number;
  risk_level: string;
  all_predictions?: Record<string, number>;
}

export interface CognitiveAssessment {
  overallRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
  riskScore: number;
  primaryConcern: string;
  explanation: string;
}

export interface PredictedCondition {
  name: string;
  confidence: number;
  description: string;
  stage: string;
}

export interface KeyFinding {
  finding: string;
  significance: string;
  status: 'Normal' | 'Concerning' | 'Critical';
}

export interface Recommendations {
  immediate: string[];
  lifestyle: string[];
  medical: string[];
  cognitive: string[];
  dietary: string[];
}

export interface FollowUpPlan {
  urgency: string;
  specialists: string[];
  tests: string[];
  timeline: string;
}

export interface AIAnalysis {
  cognitiveAssessment: CognitiveAssessment;
  predictedCondition: PredictedCondition;
  keyFindings: KeyFinding[];
  recommendations: Recommendations;
  followUpPlan: FollowUpPlan;
  disclaimer: string;
}

export interface OCRResult {
  success: boolean;
  documentInfo: DocumentInfo | null;
  extractedData: ExtractedData | null;
  mlPrediction: MLPrediction | null;
  aiAnalysis: AIAnalysis | null;
  report?: {
    report_id: string;
    report_url: string;
    generated_at: string;
  };
  explainability?: {
    detected_keywords: string[];
    adjusted_features: string[];
    primary_disease_from_text: string;
    reasoning_trace: string;
  };
  has_disease_indicators?: boolean;
  message?: string;
  error?: string;
  confidence?: number;
}

class OCRService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = FLASK_BASE_URL;
    console.log('✅ OCR Service initialized:', this.baseUrl);
  }

  // Convert image to base64 with compression
  private async imageToBase64(imageUri: string): Promise<string> {
    try {
      // Compress image to reduce size (max width 800px, quality 0.5 for smaller payload)
      const manipResult = await manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }], // Resize to max 800px width (smaller than before)
        { compress: 0.5, format: SaveFormat.JPEG } // 50% quality JPEG (more compression)
      );
      
      console.log('📸 Image compressed:', manipResult.uri);
      
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: 'base64',
      });
      
      console.log('📦 Compressed size:', base64.length, 'bytes');
      return base64;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ocr/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log('🔍 OCR Service Health:', data);
      return data.status === 'healthy';
    } catch (error) {
      console.error('❌ OCR Health Check Error:', error);
      return false;
    }
  }

  // Main OCR + AI Analysis Function
  async analyzeDocument(imageUri: string): Promise<OCRResult> {
    try {
      console.log('📸 Starting document analysis...');

      // Convert image to base64
      const base64Image = await this.imageToBase64(imageUri);
      console.log('📦 Image converted, size:', base64Image.length);

      // Send to Flask backend
      console.log('🔵 Sending request to:', `${this.baseUrl}/ocr/extract`);
      console.log('🔵 Request payload size:', JSON.stringify({ image: base64Image }).length, 'bytes');
      
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/ocr/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`🔵 Response received in ${elapsed}ms, status:`, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', response.status, errorData);
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      console.log('✅ Document analysis complete');
      console.log('📄 Has disease indicators:', data.has_disease_indicators);
      console.log('🧠 ML Prediction:', data.mlPrediction?.predicted_disease);
      if (data.report) {
        console.log('📋 Report URL:', data.report.report_url);
      }

      return {
        success: true,
        documentInfo: data.documentInfo || { type: 'Medical Document', confidence: data.confidence || 0 },
        extractedData: { rawText: data.text, clinicalValues: [] },
        mlPrediction: data.mlPrediction || null,
        aiAnalysis: data.aiAnalysis || null,
        report: data.report || null,
        explainability: data.explainability || null,
        has_disease_indicators: data.has_disease_indicators,
        message: data.message,
        confidence: data.confidence
      };

    } catch (error) {
      console.error('❌ Analysis Error:', error);
      return {
        success: false,
        documentInfo: null,
        extractedData: null,
        mlPrediction: null,
        aiAnalysis: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Legacy method for backward compatibility
  async extractTextFromDocument(imageUri: string): Promise<OCRResult> {
    return this.analyzeDocument(imageUri);
  }
}

export default new OCRService();
