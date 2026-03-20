// PDF Report Generation Service with Gemini AI Recommendations

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { TestResult } from './clinicalTest';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface AIRecommendations {
  precautions: string[];
  lifestyle: {
    diet: string[];
    exercise: string[];
    sleep: string[];
    mentalExercises: string[];
  };
  medicalAdvice: {
    followUp: string;
    tests: string[];
    warnings: string[];
  };
  emotionalSupport: string[];
}

export interface ReportData {
  patientName: string;
  age: number;
  gender: string;
  testResult: TestResult;
  mlPrediction?: any;
  aiRecommendations?: AIRecommendations;
}

class ReportService {
  // Generate AI Recommendations using Gemini
  async generateRecommendations(
    testResult: TestResult,
    mlPrediction?: any
  ): Promise<AIRecommendations> {
    try {
      const prompt = `आप एक अनुभवी neurologist हैं। एक patient का cognitive assessment complete हुआ है। 
      
Test Results:
- Test Type: ${testResult.testType}
- Score: ${testResult.score}/${testResult.maxScore} (${testResult.percentage.toFixed(1)}%)
- Risk Level: ${testResult.riskLevel}
- Interpretation: ${testResult.interpretation}

${mlPrediction ? `
AI Prediction:
- Predicted Disease: ${mlPrediction.predicted_disease}
- Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%
- Risk Level: ${mlPrediction.risk_level}
- Severity: ${mlPrediction.severity}
` : ''}

कृपया निम्नलिखित format में detailed recommendations दें (JSON format में):

{
  "precautions": [
    "सावधानी 1 (हिंदी में)",
    "सावधानी 2",
    "सावधानी 3"
  ],
  "lifestyle": {
    "diet": [
      "आहार सुझाव 1",
      "आहार सुझाव 2",
      "आहार सुझाव 3"
    ],
    "exercise": [
      "व्यायाम सुझाव 1",
      "व्यायाम सुझाव 2"
    ],
    "sleep": [
      "नींद से संबंधित सुझाव 1",
      "नींद से संबंधित सुझाव 2"
    ],
    "mentalExercises": [
      "मानसिक व्यायाम 1",
      "मानसिक व्यायाम 2",
      "मानसिक व्यायाम 3"
    ]
  },
  "medicalAdvice": {
    "followUp": "कब doctor से मिलें (timeline)",
    "tests": [
      "जांच 1",
      "जांच 2"
    ],
    "warnings": [
      "चेतावनी 1",
      "चेतावनी 2"
    ]
  },
  "emotionalSupport": [
    "भावनात्मक सहायता 1",
    "भावनात्मक सहायता 2",
    "भावनात्मक सहायता 3"
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }

      let text = data.candidates[0].content.parts[0].text;
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const recommendations = JSON.parse(text);
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.getFallbackRecommendations(testResult.riskLevel);
    }
  }

  // Fallback recommendations
  private getFallbackRecommendations(riskLevel: string): AIRecommendations {
    return {
      precautions: [
        'नियमित रूप से doctor की सलाह लें',
        'तनाव से बचें',
        'पर्याप्त आराम करें',
      ],
      lifestyle: {
        diet: [
          'Mediterranean diet अपनाएं',
          'Omega-3 fatty acids लें (मछली, अखरोट)',
          'हरी सब्जियां और फल खाएं',
        ],
        exercise: [
          'रोज 30 मिनट टहलें',
          'Yoga या meditation करें',
        ],
        sleep: [
          '7-8 घंटे की नींद लें',
          'नियमित sleep schedule बनाएं',
        ],
        mentalExercises: [
          'पहेलियां और sudoku solve करें',
          'नई भाषा सीखें',
          'किताबें पढ़ें',
        ],
      },
      medicalAdvice: {
        followUp: riskLevel === 'Severe' ? '1 महीने में' : riskLevel === 'Moderate' ? '3 महीने में' : '6 महीने में',
        tests: [
          'MRI brain scan',
          'Blood tests (Vitamin B12, Thyroid)',
        ],
        warnings: [
          'लक्षण बढ़ने पर तुरंत doctor से संपर्क करें',
          'गाड़ी चलाते समय सावधान रहें',
        ],
      },
      emotionalSupport: [
        'परिवार के साथ समय बिताएं',
        'Support group join करें',
        'Counselor से बात करें',
      ],
    };
  }

  // Generate HTML for PDF
  private generateHTML(data: ReportData): string {
    const { patientName, age, gender, testResult, mlPrediction, aiRecommendations } = data;
    const date = new Date().toLocaleDateString('hi-IN');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cognitive Assessment Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      background: #fff;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #6366F1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #6366F1;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .patient-info {
      background: #F9FAFB;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .patient-info h2 {
      color: #6366F1;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #6366F1;
      font-size: 20px;
      margin-bottom: 15px;
      border-bottom: 2px solid #E5E7EB;
      padding-bottom: 10px;
    }
    .score-card {
      background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 20px;
    }
    .score-card h3 {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .score-card p {
      font-size: 18px;
      opacity: 0.9;
    }
    .risk-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 10px;
    }
    .risk-normal { background: #10B981; color: white; }
    .risk-mild { background: #F59E0B; color: white; }
    .risk-moderate { background: #EF4444; color: white; }
    .risk-severe { background: #DC2626; color: white; }
    .category-scores {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .category-item {
      background: #F9FAFB;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #6366F1;
    }
    .category-item h4 {
      color: #333;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .category-item p {
      color: #666;
      font-size: 16px;
      font-weight: bold;
    }
    .prediction-card {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .prediction-card h3 {
      color: #92400E;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .prediction-card p {
      color: #78350F;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .recommendations {
      background: #F0FDF4;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #10B981;
    }
    .recommendations h3 {
      color: #065F46;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .recommendations ul {
      list-style: none;
      padding-left: 0;
    }
    .recommendations li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
      color: #064E3B;
      font-size: 14px;
      line-height: 1.6;
    }
    .recommendations li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10B981;
      font-weight: bold;
    }
    .subsection {
      margin-bottom: 20px;
    }
    .subsection h4 {
      color: #6366F1;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .footer p {
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧠 COGNITIVE ASSESSMENT REPORT</h1>
    <p>संज्ञानात्मक मूल्यांकन रिपोर्ट</p>
    <p>Generated by Cognix AI • ${date}</p>
  </div>

  <div class="patient-info">
    <h2>Patient Information / रोगी की जानकारी</h2>
    <div class="info-row">
      <span class="info-label">Name / नाम:</span>
      <span>${patientName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Age / आयु:</span>
      <span>${age} years</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gender / लिंग:</span>
      <span>${gender}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Test Date / परीक्षण तिथि:</span>
      <span>${date}</span>
    </div>
  </div>

  <div class="section">
    <h2>Test Results / परीक्षण परिणाम</h2>
    <div class="score-card">
      <h3>${testResult.score}/${testResult.maxScore}</h3>
      <p>${testResult.testType} Score • ${testResult.percentage.toFixed(1)}%</p>
      <span class="risk-badge risk-${testResult.riskLevel.toLowerCase()}">${testResult.riskLevel} Risk</span>
    </div>
    <p style="text-align: center; color: #666; margin-bottom: 20px;">
      <strong>Interpretation:</strong> ${testResult.interpretation}
    </p>

    <h3 style="color: #6366F1; margin-bottom: 15px;">Category-wise Scores / श्रेणी-वार अंक</h3>
    <div class="category-scores">
      ${Object.entries(testResult.categoryScores).map(([category, scores]) => `
        <div class="category-item">
          <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
          <p>${scores.score}/${scores.max} points</p>
        </div>
      `).join('')}
    </div>
  </div>

  ${mlPrediction ? `
  <div class="section">
    <h2>AI Prediction / AI भविष्यवाणी</h2>
    <div class="prediction-card">
      <h3>${mlPrediction.predicted_disease}</h3>
      <p><strong>Confidence:</strong> ${(mlPrediction.confidence * 100).toFixed(1)}%</p>
      <p><strong>Risk Level:</strong> ${mlPrediction.risk_level}</p>
      <p><strong>Severity:</strong> ${mlPrediction.severity}</p>
    </div>
  </div>
  ` : ''}

  ${aiRecommendations ? `
  <div class="section">
    <h2>Medical Recommendations / चिकित्सा सिफारिशें</h2>
    
    <div class="subsection">
      <h4>⚠️ Precautions / सावधानियां</h4>
      <div class="recommendations">
        <ul>
          ${aiRecommendations.precautions.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="subsection">
      <h4>🥗 Diet Recommendations / आहार सुझाव</h4>
      <div class="recommendations">
        <ul>
          ${aiRecommendations.lifestyle.diet.map(d => `<li>${d}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="subsection">
      <h4>💪 Exercise / व्यायाम</h4>
      <div class="recommendations">
        <ul>
          ${aiRecommendations.lifestyle.exercise.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="subsection">
      <h4>😴 Sleep / नींद</h4>
      <div class="recommendations">
        <ul>
          ${aiRecommendations.lifestyle.sleep.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="subsection">
      <h4>🧩 Mental Exercises / मानसिक व्यायाम</h4>
      <div class="recommendations">
        <ul>
          ${aiRecommendations.lifestyle.mentalExercises.map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="subsection">
      <h4>🏥 Medical Advice / चिकित्सा सलाह</h4>
      <div class="recommendations">
        <h3 style="font-size: 14px; margin-bottom: 10px;">Follow-up:</h3>
        <p style="color: #064E3B; margin-bottom: 15px;">${aiRecommendations.medicalAdvice.followUp}</p>
        
        <h3 style="font-size: 14px; margin-bottom: 10px;">Recommended Tests:</h3>
        <ul>
          ${aiRecommendations.medicalAdvice.tests.map(t => `<li>${t}</li>`).join('')}
        </ul>
        
        <h3 style="font-size: 14px; margin-bottom: 10px; margin-top: 15px;">Warnings:</h3>
        <ul>
          ${aiRecommendations.medicalAdvice.warnings.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="subsection">
      <h4>❤️ Emotional Support / भावनात्मक सहायता</h4>
      <div class="recommendations">
        <ul>
          ${aiRecommendations.emotionalSupport.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Disclaimer:</strong> This report is generated by AI and should not replace professional medical advice.</p>
    <p>यह रिपोर्ट AI द्वारा तैयार की गई है और पेशेवर चिकित्सा सलाह का स्थान नहीं ले सकती।</p>
    <p style="margin-top: 10px;">Generated by <strong>Cognix AI</strong> • Cognitive Disease Prediction System</p>
  </div>
</body>
</html>
    `;
  }

  // Generate and Share PDF
  async generateAndSharePDF(data: ReportData): Promise<string> {
    try {
      const html = this.generateHTML(data);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Save to permanent location - Simplified to just use the temp file for sharing
      // to avoid 'moveAsync' deprecation error in newer Expo SDKs
      /* 
      const fileName = `Cognix_Report_${data.patientName}_${Date.now()}.pdf`;
      const newUri = FileSystem.documentDirectory + fileName;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });
      */
      const newUri = uri; // Use the generated file directly

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Cognitive Assessment Report',
        });
      }

      return newUri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

export default new ReportService();
