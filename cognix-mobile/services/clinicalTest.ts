// Clinical Assessment Service - MMSE & MoCA Tests

export interface MMSEQuestion {
  id: string;
  category: 'orientation' | 'registration' | 'attention' | 'recall' | 'language';
  question: string;
  type: 'text' | 'choice' | 'drawing' | 'action';
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  instructions?: string;
}

export interface TestResult {
  testType: 'MMSE' | 'MoCA';
  score: number;
  maxScore: number;
  percentage: number;
  categoryScores: {
    [key: string]: {
      score: number;
      max: number;
    };
  };
  interpretation: string;
  riskLevel: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
  timestamp: Date;
}

class ClinicalTestService {
  // MMSE Test - 30 Points
  getMMSEQuestions(): MMSEQuestion[] {
    return [
      // ORIENTATION TO TIME (5 points)
      {
        id: 'mmse_1',
        category: 'orientation',
        question: 'आज कौन सी तारीख है? (What is today\'s date?)',
        type: 'text',
        points: 1,
        correctAnswer: new Date().getDate().toString(),
      },
      {
        id: 'mmse_2',
        category: 'orientation',
        question: 'आज कौन सा महीना है? (What is the current month?)',
        type: 'choice',
        options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        points: 1,
      },
      {
        id: 'mmse_3',
        category: 'orientation',
        question: 'आज कौन सा साल है? (What is the current year?)',
        type: 'text',
        points: 1,
        correctAnswer: new Date().getFullYear().toString(),
      },
      {
        id: 'mmse_4',
        category: 'orientation',
        question: 'आज कौन सा दिन है? (What day of the week is it?)',
        type: 'choice',
        options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        points: 1,
      },
      {
        id: 'mmse_5',
        category: 'orientation',
        question: 'अभी कौन सा मौसम है? (What season is it?)',
        type: 'choice',
        options: ['Spring', 'Summer', 'Monsoon', 'Autumn', 'Winter'],
        points: 1,
      },

      // ORIENTATION TO PLACE (5 points)
      {
        id: 'mmse_6',
        category: 'orientation',
        question: 'आप किस देश में हैं? (What country are you in?)',
        type: 'text',
        points: 1,
        correctAnswer: 'India',
      },
      {
        id: 'mmse_7',
        category: 'orientation',
        question: 'आप किस राज्य में हैं? (What state/province are you in?)',
        type: 'text',
        points: 1,
      },
      {
        id: 'mmse_8',
        category: 'orientation',
        question: 'आप किस शहर में हैं? (What city/town are you in?)',
        type: 'text',
        points: 1,
      },
      {
        id: 'mmse_9',
        category: 'orientation',
        question: 'आप किस जगह पर हैं? (What type of place is this?)',
        type: 'choice',
        options: ['घर (Home)', 'अस्पताल (Hospital)', 'दफ्तर (Office)', 'अन्य (Other)'],
        points: 1,
      },
      {
        id: 'mmse_10',
        category: 'orientation',
        question: 'आप किस मंजिल पर हैं? (What floor are you on?)',
        type: 'choice',
        options: ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Other'],
        points: 1,
      },

      // REGISTRATION (3 points)
      {
        id: 'mmse_11',
        category: 'registration',
        question: 'मैं 3 शब्द बोलूंगा, कृपया ध्यान से सुनें और दोहराएं: "सेब, मेज, पैसा" (I will say 3 words. Please repeat: "Apple, Table, Money")',
        type: 'action',
        points: 3,
        instructions: 'User को 3 शब्द याद रखने हैं। बाद में पूछा जाएगा।',
      },

      // ATTENTION & CALCULATION (5 points)
      {
        id: 'mmse_12',
        category: 'attention',
        question: '100 से शुरू करके 7-7 घटाएं। पहला जवाब क्या होगा? (Starting from 100, subtract 7. What is the answer?)',
        type: 'text',
        points: 1,
        correctAnswer: '93',
      },
      {
        id: 'mmse_13',
        category: 'attention',
        question: '93 से 7 घटाएं। जवाब? (Subtract 7 from 93. Answer?)',
        type: 'text',
        points: 1,
        correctAnswer: '86',
      },
      {
        id: 'mmse_14',
        category: 'attention',
        question: '86 से 7 घटाएं। जवाब? (Subtract 7 from 86. Answer?)',
        type: 'text',
        points: 1,
        correctAnswer: '79',
      },
      {
        id: 'mmse_15',
        category: 'attention',
        question: '79 से 7 घटाएं। जवाब? (Subtract 7 from 79. Answer?)',
        type: 'text',
        points: 1,
        correctAnswer: '72',
      },
      {
        id: 'mmse_16',
        category: 'attention',
        question: '72 से 7 घटाएं। जवाब? (Subtract 7 from 72. Answer?)',
        type: 'text',
        points: 1,
        correctAnswer: '65',
      },

      // RECALL (3 points)
      {
        id: 'mmse_17',
        category: 'recall',
        question: 'पहले बताए गए 3 शब्द याद हैं? पहला शब्द क्या था? (Remember the 3 words? What was the first word?)',
        type: 'choice',
        options: ['सेब (Apple)', 'मेज (Table)', 'पैसा (Money)', 'याद नहीं (Don\'t remember)'],
        points: 1,
        correctAnswer: 0,
      },
      {
        id: 'mmse_18',
        category: 'recall',
        question: 'दूसरा शब्द क्या था? (What was the second word?)',
        type: 'choice',
        options: ['सेब (Apple)', 'मेज (Table)', 'पैसा (Money)', 'याद नहीं (Don\'t remember)'],
        points: 1,
        correctAnswer: 1,
      },
      {
        id: 'mmse_19',
        category: 'recall',
        question: 'तीसरा शब्द क्या था? (What was the third word?)',
        type: 'choice',
        options: ['सेब (Apple)', 'मेज (Table)', 'पैसा (Money)', 'याद नहीं (Don\'t remember)'],
        points: 1,
        correctAnswer: 2,
      },

      // LANGUAGE - NAMING (2 points)
      {
        id: 'mmse_20',
        category: 'language',
        question: 'यह क्या है? (दिखाएं: घड़ी) (What is this? Show: Watch)',
        type: 'choice',
        options: ['घड़ी (Watch)', 'चश्मा (Glasses)', 'फोन (Phone)', 'पता नहीं (Don\'t know)'],
        points: 1,
        correctAnswer: 0,
      },
      {
        id: 'mmse_21',
        category: 'language',
        question: 'यह क्या है? (दिखाएं: पेन) (What is this? Show: Pen)',
        type: 'choice',
        options: ['पेन (Pen)', 'पेंसिल (Pencil)', 'चाबी (Key)', 'पता नहीं (Don\'t know)'],
        points: 1,
        correctAnswer: 0,
      },

      // LANGUAGE - REPETITION (1 point)
      {
        id: 'mmse_22',
        category: 'language',
        question: 'इस वाक्य को दोहराएं: "ना यहाँ, ना वहाँ, ना कहीं" (Repeat: "No ifs, ands, or buts")',
        type: 'action',
        points: 1,
        instructions: 'User को वाक्य सही से दोहराना है।',
      },

      // LANGUAGE - 3-STAGE COMMAND (3 points)
      {
        id: 'mmse_23',
        category: 'language',
        question: 'कागज़ को दाहिने हाथ से पकड़ें (Take the paper in your right hand)',
        type: 'action',
        points: 1,
      },
      {
        id: 'mmse_24',
        category: 'language',
        question: 'इसे दोनों हाथों से मोड़ें (Fold it in half)',
        type: 'action',
        points: 1,
      },
      {
        id: 'mmse_25',
        category: 'language',
        question: 'इसे फर्श पर रखें (Put it on the floor)',
        type: 'action',
        points: 1,
      },

      // LANGUAGE - READING (1 point)
      {
        id: 'mmse_26',
        category: 'language',
        question: 'पढ़ें और करें: "अपनी आँखें बंद करें" (Read and do: "Close your eyes")',
        type: 'action',
        points: 1,
      },

      // LANGUAGE - WRITING (1 point)
      {
        id: 'mmse_27',
        category: 'language',
        question: 'एक पूरा वाक्य लिखें (Write a complete sentence)',
        type: 'text',
        points: 1,
        instructions: 'वाक्य में subject और verb होना चाहिए।',
      },

      // LANGUAGE - COPYING (1 point)
      {
        id: 'mmse_28',
        category: 'language',
        question: 'इस आकृति की नकल करें (Copy this design)',
        type: 'drawing',
        points: 1,
        instructions: 'दो पंचकोण (pentagons) जो एक दूसरे को काटते हों।',
      },
    ];
  }

  // Calculate MMSE Score
  calculateMMSEScore(answers: { [key: string]: any }): TestResult {
    const questions = this.getMMSEQuestions();
    let totalScore = 0;
    const categoryScores: { [key: string]: { score: number; max: number } } = {
      orientation: { score: 0, max: 10 },
      registration: { score: 0, max: 3 },
      attention: { score: 0, max: 5 },
      recall: { score: 0, max: 3 },
      language: { score: 0, max: 9 },
    };

    questions.forEach((q) => {
      const answer = answers[q.id];
      let points = 0;

      if (q.type === 'text' && q.correctAnswer !== undefined) {
        const correctStr = String(q.correctAnswer).toLowerCase();
        if (answer?.toLowerCase?.()?.includes(correctStr)) {
          points = q.points;
        }
      } else if (q.type === 'choice' && q.correctAnswer !== undefined) {
        if (answer === q.correctAnswer) {
          points = q.points;
        }
      } else if (q.type === 'action' || q.type === 'drawing') {
        // Manual scoring - assume full points if answered
        points = answer ? q.points : 0;
      }

      totalScore += points;
      categoryScores[q.category].score += points;
    });

    const percentage = (totalScore / 30) * 100;
    let interpretation = '';
    let riskLevel: 'Normal' | 'Mild' | 'Moderate' | 'Severe' = 'Normal';

    if (totalScore >= 25) {
      interpretation = 'सामान्य संज्ञानात्मक कार्य (Normal cognitive function)';
      riskLevel = 'Normal';
    } else if (totalScore >= 21) {
      interpretation = 'हल्की संज्ञानात्मक हानि (Mild cognitive impairment)';
      riskLevel = 'Mild';
    } else if (totalScore >= 10) {
      interpretation = 'मध्यम संज्ञानात्मक हानि (Moderate cognitive impairment)';
      riskLevel = 'Moderate';
    } else {
      interpretation = 'गंभीर संज्ञानात्मक हानि (Severe cognitive impairment)';
      riskLevel = 'Severe';
    }

    return {
      testType: 'MMSE',
      score: totalScore,
      maxScore: 30,
      percentage,
      categoryScores,
      interpretation,
      riskLevel,
      timestamp: new Date(),
    };
  }

  // Convert MMSE score to ML format
  convertToMLFormat(testResult: TestResult, age: number = 65, gender: number = 1): any {
    return {
      MMSE: testResult.score,
      Age: age,
      Gender: gender,
      // Add other default values
      Education: 16,
      SES: 2,
      CDR: testResult.score < 24 ? 0.5 : 0,
    };
  }
}

export default new ClinicalTestService();
