/**
 * Speech & Language Assessment Service
 * Handles question generation and speech analysis using GROQ
 */

const FLASK_BASE_URL = 'https://cognix-flask-server-x2u5.onrender.com';

export interface SpeechQuestion {
  id: string;
  question: string;
  type: string;
  instruction: string;
  expectedDuration: number;
}

export interface SpeechResponse {
  questionId: string;
  question: string;
  type: string;
  transcript: string;
  duration: number;
  audioUri?: string;
}

export interface SpeechMarkers {
  fluency_score: number;
  memory_score: number;
  language_score: number;
  attention_score: number;
  executive_function_score: number;
}

export interface SpeechAnalysis {
  predicted_disease: string;
  confidence: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  speech_markers: SpeechMarkers;
  detected_issues: string[];
  reasoning: string;
  recommendations: string[];
  reportUrl?: string;
}

class SpeechAssessmentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = FLASK_BASE_URL;
  }

  /**
   * Generate cognitive assessment questions using GROQ
   */
  async generateQuestions(): Promise<SpeechQuestion[]> {
    try {
      console.log('🎤 Generating speech questions from GROQ...');

      const response = await fetch(`${this.baseUrl}/speech/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Question generation failed:', response.status, errorData);
        throw new Error(errorData.error || `Failed to generate questions: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Question generation failed');
      }

      console.log(`✅ Generated ${data.count} questions`);
      return data.questions;

    } catch (error) {
      console.error('❌ Error generating questions:', error);
      throw error;
    }
  }

  /**
   * Analyze speech responses using GROQ
   */
  async analyzeResponses(responses: SpeechResponse[]): Promise<SpeechAnalysis> {
    try {
      console.log(`🎤 Analyzing ${responses.length} speech responses (with audio)...`);

      const formData = new FormData();
      
      // Append responses JSON without audio URIs (backend doesn't need local URIs)
      const dataPayload = responses.map(r => ({
        questionId: r.questionId,
        question: r.question,
        type: r.type,
        duration: r.duration,
        transcript: r.transcript // Placeholder, will be replaced by backend
      }));
      formData.append('responses', JSON.stringify(dataPayload));

      // Append Audio Files
      responses.forEach((response, index) => {
        if (response.audioUri) {
            // @ts-ignore - React Native FormData expects this format
            formData.append(`audio_${index}`, {
                uri: response.audioUri,
                name: `recording_${index}.m4a`,
                type: 'audio/m4a'
            });
        }
      });

      const result = await fetch(`${this.baseUrl}/speech/analyze`, {
        method: 'POST',
        // Do NOT set Content-Type header for FormData, browser/RN sets it with boundary
        body: formData,
      });

      if (!result.ok) {
        const errorData = await result.json().catch(() => ({}));
        console.error('❌ Speech analysis failed:', result.status, errorData);
        throw new Error(errorData.error || `Analysis failed: ${result.status}`);
      }

      const data = await result.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Speech analysis failed');
      }

      console.log('✅ Speech analysis complete:', data.analysis.predicted_disease);
      return data.analysis;

    } catch (error) {
      console.error('❌ Error analyzing speech:', error);
      throw error;
    }
  }

  /**
   * Check if speech service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/speech/health`);
      const data = await response.json();
      return data.status === 'healthy' && data.groq_configured;
    } catch (error) {
      console.error('❌ Speech service health check failed:', error);
      return false;
    }
  }
}

export default new SpeechAssessmentService();
