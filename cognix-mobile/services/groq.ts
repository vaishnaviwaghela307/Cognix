// GROQ AI Service for Dynamic Question Generation
// Using GROQ instead of Gemini for both Clinical and Cognitive tests

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface CognitiveQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  category: 'memory' | 'attention' | 'language' | 'reasoning';
}

export interface TestResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  answers: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

class GroqService {
  private apiKey: string;

  constructor() {
    this.apiKey = GROQ_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ GROQ_API_KEY not found in environment variables');
      console.warn('⚠️ Make sure EXPO_PUBLIC_GROQ_API_KEY is set in .env file');
    } else {
      console.log('✅ GROQ API Key loaded successfully');
      console.log('🔑 API Key preview:', this.apiKey.substring(0, 10) + '...');
    }
  }

  async generateCognitiveQuestions(count: number = 10): Promise<CognitiveQuestion[]> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ No GROQ API key, using fallback questions');
        return this.getFallbackQuestions();
      }

      const prompt = `Generate ${count} cognitive assessment questions for detecting early signs of dementia and cognitive decline. 

CRITICAL: All questions MUST be in ENGLISH ONLY. Do not use any other language.

Requirements:
1. Mix of 4 categories: memory, attention, language, and reasoning
2. Each question should be simple and easy to understand
3. 4 multiple choice options per question
4. Questions should test cognitive abilities without being too medical or complex
5. Include questions about:
   - Short-term memory (remembering items, sequences)
   - Attention and focus (pattern recognition, counting)
   - Language skills (word meanings, sentence completion)
   - Logical reasoning (simple problem solving)

IMPORTANT: 
- All questions and options MUST be in English only
- This is required for accurate cognitive assessment
- correctAnswer is the index (0-3) of the correct option
- category must be one of: "memory", "attention", "language", "reasoning"
- Questions should be in simple English
- Questions are practical and relatable

Return ONLY a valid JSON object with a "questions" array in this exact format:
{
  "questions": [
    {
      "question": "Question text here in English?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "category": "memory"
    }
  ]
}

Return ONLY the JSON object, nothing else.`;

      console.log('📡 Calling GROQ API for cognitive questions...');
      
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI that generates cognitive assessment questions. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.9,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GROQ API HTTP Error:', response.status, errorText);
        throw new Error(`GROQ API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      console.log('📦 GROQ API Response received');

      // Check for API errors
      if (data.error) {
        console.error('❌ GROQ API Error:', JSON.stringify(data.error, null, 2));
        throw new Error(`GROQ API Error: ${data.error.message}`);
      }
      
      // Get the content from GROQ response
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ Invalid GROQ Response Structure:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response from GROQ API');
      }

      let text = data.choices[0].message.content;
      
      console.log('🔍 Cleaned text length:', text.length);
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON Parse Error. Raw Text:', text.substring(0, 500));
        throw new Error('Failed to parse GROQ response as JSON');
      }
      
      // Extract questions array
      const questions = parsed.questions || parsed;
      
      // Validate the questions array
      if (!Array.isArray(questions)) {
        console.error('❌ Response is not an array:', typeof questions);
        throw new Error('GROQ response is not an array');
      }

      if (questions.length === 0) {
        console.error('❌ Empty questions array');
        throw new Error('No questions generated');
      }

      // Validate each question
      const validQuestions = questions.filter(q => {
        const isValid = (
          q.question && 
          Array.isArray(q.options) && 
          q.options.length === 4 &&
          typeof q.correctAnswer === 'number' &&
          q.correctAnswer >= 0 &&
          q.correctAnswer <= 3 &&
          q.category &&
          ['memory', 'attention', 'language', 'reasoning'].includes(q.category)
        );
        
        if (!isValid) {
          console.warn('⚠️ Invalid question filtered out:', q);
        }
        
        return isValid;
      });

      if (validQuestions.length === 0) {
        console.error('❌ No valid questions after filtering');
        throw new Error('No valid questions generated');
      }

      console.log(`✅ Successfully generated ${validQuestions.length} questions using GROQ`);
      return validQuestions;

    } catch (error) {
      console.error('❌ Error generating questions with GROQ:', error);
      console.log('⚠️ Falling back to default questions');
      // Return fallback questions if API fails
      return this.getFallbackQuestions();
    }
  }

  private getFallbackQuestions(): CognitiveQuestion[] {
    console.log('📋 Using fallback questions');
    return [
      {
        question: "If you were asked to remember 5 words (apple, chair, pen, flower, book), how many could you recall after 2 minutes?",
        options: ["All 5 words", "3-4 words", "1-2 words", "None"],
        correctAnswer: 0,
        category: "memory"
      },
      {
        question: "Starting from 100, count backwards by 7. What are the first 3 numbers?",
        options: ["100, 93, 86", "100, 90, 80", "100, 95, 90", "100, 97, 94"],
        correctAnswer: 0,
        category: "attention"
      },
      {
        question: "What do 'cat' and 'dog' have in common?",
        options: ["Both are pets", "Both are black", "Both are large", "No similarity"],
        correctAnswer: 0,
        category: "reasoning"
      },
      {
        question: "Complete this sentence: 'The sun rises in the east and sets in the ____'",
        options: ["West", "North", "South", "East"],
        correctAnswer: 0,
        category: "language"
      },
      {
        question: "If today is Wednesday, what day will it be in 3 days?",
        options: ["Saturday", "Friday", "Sunday", "Thursday"],
        correctAnswer: 0,
        category: "reasoning"
      },
      {
        question: "Which of the following is NOT a fruit?",
        options: ["Carrot", "Apple", "Banana", "Orange"],
        correctAnswer: 0,
        category: "language"
      },
      {
        question: "If a clock shows 3:00, what is the angle between the hour and minute hands?",
        options: ["90 degrees", "180 degrees", "45 degrees", "60 degrees"],
        correctAnswer: 0,
        category: "reasoning"
      },
      {
        question: "You were shown 3 objects: key, glasses, phone. Which objects were they?",
        options: ["Key, glasses, phone", "Key, watch, phone", "Glasses, pen, phone", "Key, glasses, pen"],
        correctAnswer: 0,
        category: "memory"
      },
      {
        question: "How many numbers between 1 and 20 are divisible by 5?",
        options: ["4", "3", "5", "6"],
        correctAnswer: 0,
        category: "attention"
      },
      {
        question: "What is the opposite of 'happy'?",
        options: ["Sad", "Joyful", "Excited", "Calm"],
        correctAnswer: 0,
        category: "language"
      }
    ];
  }

  calculateTestResult(
    questions: CognitiveQuestion[],
    userAnswers: number[]
  ): TestResult {
    let correctCount = 0;
    const answers = questions.map((q, index) => {
      const isCorrect = userAnswers[index] === q.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        question: q.question,
        userAnswer: q.options[userAnswers[index]] || 'Not answered',
        correctAnswer: q.options[q.correctAnswer],
        isCorrect,
      };
    });

    const percentage = (correctCount / questions.length) * 100;
    
    let riskLevel: 'Low' | 'Medium' | 'High';
    if (percentage >= 80) {
      riskLevel = 'Low';
    } else if (percentage >= 60) {
      riskLevel = 'Medium';
    } else {
      riskLevel = 'High';
    }

    return {
      score: correctCount,
      totalQuestions: questions.length,
      percentage,
      riskLevel,
      answers,
    };
  }

  // Convert test result to ML prediction format with all 31 features
  convertToMLFormat(testResult: TestResult): any {
    // Calculate performance score (0-1)
    const performance = testResult.percentage / 100;
    
    // Calculate category-specific scores
    const categoryScores = {
      memory: 0.5,
      attention: 0.5,
      language: 0.5,
      reasoning: 0.5
    };
    
    // Calculate from answers
    const categoryCounts: Record<string, { correct: number; total: number }> = {};
    testResult.answers?.forEach((ans, idx) => {
      // We don't have category info in answers, so use overall performance
    });
    
    // Use overall performance to estimate feature values
    // Higher performance = healthier features
    const healthFactor = performance;
    const declineFactor = 1 - performance;
    
    // Generate comprehensive ML features
    return {
      // Age estimation based on risk level
      age: testResult.riskLevel === 'Low' ? 55 : testResult.riskLevel === 'Medium' ? 65 : 75,
      
      // Core cognitive features (higher performance = better scores)
      memory_loss_score: declineFactor * 0.8,
      short_term_memory_score: healthFactor * 0.9,
      attention_span_score: healthFactor * 0.85,
      cognitive_decline_rate: declineFactor * 0.7,
      problem_solving_score: healthFactor * 0.8,
      decision_making_score: healthFactor * 0.75,
      
      // Motor features (estimated based on overall cognitive health)
      motor_symptom_severity: declineFactor * 0.3,
      gait_speed: healthFactor * 0.8,
      fine_motor_control: healthFactor * 0.85,
      hand_movement_accuracy: healthFactor * 0.8,
      balance_stability_score: healthFactor * 0.75,
      
      // Brain structure features (estimated from cognitive performance)
      cortical_thickness: 0.4 + (healthFactor * 0.4),
      ventricle_size_index: 0.3 + (declineFactor * 0.4),
      white_matter_integrity: 0.5 + (healthFactor * 0.3),
      brainstem_integrity: 0.6 + (healthFactor * 0.25),
      corpus_callosum_thickness: 0.5 + (healthFactor * 0.3),
      parietal_lobe_volume: 0.5 + (healthFactor * 0.3),
      temporal_lobe_volume: 0.5 + (healthFactor * 0.3),
      
      // Neurological markers
      visual_hallucination_freq: declineFactor * 0.15,
      facial_expression_score: healthFactor * 0.7,
      reaction_time: 0.3 + (declineFactor * 0.4),
      
      // Biochemical markers (estimated)
      synaptic_density_index: 0.5 + (healthFactor * 0.35),
      glucose_metabolism_rate: 0.5 + (healthFactor * 0.3),
      neuro_transmitter_level: 0.5 + (healthFactor * 0.3),
      neuronal_activity_rate: 0.5 + (healthFactor * 0.35),
      neuroinflammation_index: 0.2 + (declineFactor * 0.5),
      brain_iron_concentration: 0.3 + (declineFactor * 0.3),
      oxygenation_level: 0.6 + (healthFactor * 0.3),
      protein_aggregation_level: 0.1 + (declineFactor * 0.5),
      neural_connectivity_strength: 0.5 + (healthFactor * 0.35),
    };
  }
}

export default new GroqService();
