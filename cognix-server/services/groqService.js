const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Generate clinical assessment questions using GROQ API
 */
async function generateClinicalQuestions(domain = null) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const domainPrompts = {
    demographic: `Generate 4 SHORT, clear clinical questions about demographics and lifestyle for neurodegenerative disease screening.
    Requirements:
    - Keep questions under 15 words
    - Use simple, direct language
    - Mix of yes/no and text questions
    - Focus on: age, family history, lifestyle, health background
    
    Return ONLY a JSON array of objects with this exact format:
    [
      {"question": "What is your age?", "type": "text"},
      {"question": "Do you have a family history of dementia?", "type": "yesno"},
      {"question": "How would you describe your overall health?", "type": "text"},
      {"question": "Do you exercise regularly?", "type": "yesno"}
    ]`,
    
    cognitive: `Generate 4 SHORT, clear questions to assess cognitive function and memory.
    Requirements:
    - Keep questions under 15 words
    - Use simple, direct language
    - Mix of yes/no and text questions
    - Focus on: memory, attention, problem-solving, mental clarity
    
    Return ONLY a JSON array of objects with this exact format:
    [
      {"question": "Do you forget recent conversations?", "type": "yesno"},
      {"question": "How well can you focus on tasks?", "type": "text"},
      {"question": "Do you have trouble finding words?", "type": "yesno"},
      {"question": "Describe your memory in daily activities.", "type": "text"}
    ]`,
    
    motoric: `Generate 4 SHORT, clear questions about motor skills and physical function.
    Requirements:
    - Keep questions under 15 words
    - Use simple, direct language
    - Mix of yes/no and text questions
    - Focus on: movement, coordination, tremors, balance
    
    Return ONLY a JSON array of objects with this exact format:
    [
      {"question": "Do you experience tremors or shaking?", "type": "yesno"},
      {"question": "How is your balance when walking?", "type": "text"},
      {"question": "Do you have difficulty with fine movements?", "type": "yesno"},
      {"question": "Describe any coordination problems.", "type": "text"}
    ]`,
    
    neuropsychiatric: `Generate 4 SHORT, clear questions about mood and behavioral symptoms.
    Requirements:
    - Keep questions under 15 words
    - Use simple, direct language
    - Mix of yes/no and text questions
    - Focus on: mood, anxiety, behavior, emotional well-being
    
    Return ONLY a JSON array of objects with this exact format:
    [
      {"question": "Do you feel anxious or worried often?", "type": "yesno"},
      {"question": "How has your mood been lately?", "type": "text"},
      {"question": "Have you noticed behavioral changes?", "type": "yesno"},
      {"question": "Describe your sleep quality.", "type": "text"}
    ]`
  };

  const prompt = domain && domainPrompts[domain] 
    ? domainPrompts[domain]
    : `Generate 4 general clinical assessment questions for neurodegenerative disease screening.
       Return ONLY a JSON array of 4 question strings, nothing else.`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a medical professional creating clinical assessment questions. Always respond with valid JSON arrays only, no additional text or markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content.trim();
    
    // Try to parse the response as JSON
    let questions;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse GROQ response:', content);
      throw new Error('Invalid response format from GROQ API');
    }

    // Validate that we got an array of 4 questions
    if (!Array.isArray(questions) || questions.length !== 4) {
      throw new Error('Expected 4 questions from GROQ API');
    }

    return {
      success: true,
      questions,
      domain: domain || 'general'
    };
  } catch (error) {
    console.error('GROQ API Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate 10 rapid yes/no questions for quick disease screening
 */
async function generateQuickTestQuestions() {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const prompt = `Generate 10 SHORT, clear YES/NO questions for rapid neurodegenerative disease screening.
  
  Requirements:
  - ALL questions MUST be yes/no type only
  - Keep each question under 12 words
  - Cover all domains: cognitive, motor, mood, and lifestyle
  - Use simple, direct language
  - Questions should be answerable quickly
  
  Return ONLY a JSON array with this exact format:
  [
    "Do you forget recent conversations?",
    "Do you have difficulty with balance?",
    "Do you experience hand tremors?",
    "Do you feel confused in familiar places?",
    "Do you have trouble finding words?",
    "Do you feel anxious often?",
    "Do you have a family history of dementia?",
    "Do you experience mood swings?",
    "Do you have difficulty with coordination?",
    "Do you forget appointments or dates?"
  ]`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a medical professional creating rapid screening questions. Always respond with valid JSON arrays only, no additional text or markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content.trim();
    
    let questions;
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse GROQ response:', content);
      throw new Error('Invalid response format from GROQ API');
    }

    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error('Expected 10 questions from GROQ API');
    }

    return {
      success: true,
      questions
    };
  } catch (error) {
    console.error('GROQ API Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  generateClinicalQuestions,
  generateQuickTestQuestions
};
