// Language/Localization Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type Language = 'en' | 'hi' | 'mr';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
  };
}

// All app translations
export const translations: Translations = {
  // Common
  appName: { en: 'Cognix', hi: 'कॉग्निक्स', mr: 'कॉग्निक्स' },
  loading: { en: 'Loading...', hi: 'लोड हो रहा है...', mr: 'लोड होत आहे...' },
  save: { en: 'Save', hi: 'सेव करें', mr: 'सेव्ह करा' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', mr: 'रद्द करा' },
  delete: { en: 'Delete', hi: 'हटाएं', mr: 'हटवा' },
  back: { en: 'Back', hi: 'वापस', mr: 'मागे' },
  done: { en: 'Done', hi: 'हो गया', mr: 'पूर्ण' },
  error: { en: 'Error', hi: 'त्रुटि', mr: 'त्रुटी' },
  success: { en: 'Success', hi: 'सफल', mr: 'यशस्वी' },

  // Home Screen
  goodMorning: { en: 'Good Morning', hi: 'सुप्रभात', mr: 'सुप्रभात' },
  goodAfternoon: { en: 'Good Afternoon', hi: 'नमस्कार', mr: 'नमस्कार' },
  goodEvening: { en: 'Good Evening', hi: 'शुभ संध्या', mr: 'शुभ संध्याकाळ' },
  brainHealth: { en: 'Brain Health Check', hi: 'मस्तिष्क स्वास्थ्य जांच', mr: 'मेंदू आरोग्य तपासणी' },
  startTest: { en: 'Start Test', hi: 'टेस्ट शुरू करें', mr: 'चाचणी सुरू करा' },
  scanDoc: { en: 'Scan Doc', hi: 'स्कैन करें', mr: 'स्कॅन करा' },
  quickTest: { en: 'Quick Test', hi: 'त्वरित टेस्ट', mr: 'जलद चाचणी' },
  clinical: { en: 'Clinical', hi: 'क्लिनिकल', mr: 'क्लिनिकल' },
  history: { en: 'History', hi: 'इतिहास', mr: 'इतिहास' },
  detectDiseases: { en: 'We can detect these diseases', hi: 'हम इन बीमारियों का पता लगा सकते हैं', mr: 'आम्ही या आजारांचा शोध घेऊ शकतो' },
  dailyTip: { en: 'Daily Brain Tip', hi: 'दैनिक मस्तिष्क टिप', mr: 'दैनिक मेंदू टिप' },

  // History Screen
  yourHistory: { en: 'Your History', hi: 'आपका इतिहास', mr: 'तुमचा इतिहास' },
  healthJourney: { en: 'Your health journey', hi: 'आपकी स्वास्थ्य यात्रा', mr: 'तुमचा आरोग्य प्रवास' },
  all: { en: 'All', hi: 'सभी', mr: 'सर्व' },
  scans: { en: 'Scans', hi: 'स्कैन', mr: 'स्कॅन' },
  tests: { en: 'Tests', hi: 'टेस्ट', mr: 'चाचण्या' },
  reports: { en: 'Reports', hi: 'रिपोर्ट', mr: 'अहवाल' },
  noHistory: { en: 'No History Yet', hi: 'अभी कोई इतिहास नहीं', mr: 'अद्याप इतिहास नाही' },
  uploadReport: { en: 'Upload Report', hi: 'रिपोर्ट अपलोड करें', mr: 'अहवाल अपलोड करा' },
  documentScan: { en: 'Document Scan', hi: 'दस्तावेज़ स्कैन', mr: 'दस्तऐवज स्कॅन' },
  cognitiveTest: { en: 'Cognitive Test', hi: 'संज्ञानात्मक टेस्ट', mr: 'संज्ञानात्मक चाचणी' },
  personalReport: { en: 'Personal Report', hi: 'व्यक्तिगत रिपोर्ट', mr: 'वैयक्तिक अहवाल' },

  // Profile Screen
  profile: { en: 'Profile', hi: 'प्रोफाइल', mr: 'प्रोफाइल' },
  account: { en: 'Account', hi: 'खाता', mr: 'खाते' },
  personalDocuments: { en: 'Personal Documents', hi: 'व्यक्तिगत दस्तावेज़', mr: 'वैयक्तिक दस्तऐवज' },
  secureStorage: { en: 'Secure encrypted storage', hi: 'सुरक्षित एन्क्रिप्टेड स्टोरेज', mr: 'सुरक्षित एन्क्रिप्टेड स्टोरेज' },
  medicalHistory: { en: 'Medical History', hi: 'चिकित्सा इतिहास', mr: 'वैद्यकीय इतिहास' },
  testReports: { en: 'Test Reports', hi: 'टेस्ट रिपोर्ट', mr: 'चाचणी अहवाल' },
  preferences: { en: 'Preferences', hi: 'प्राथमिकताएं', mr: 'प्राधान्ये' },
  notifications: { en: 'Notifications', hi: 'सूचनाएं', mr: 'सूचना' },
  language: { en: 'Language', hi: 'भाषा', mr: 'भाषा' },
  support: { en: 'Support', hi: 'सहायता', mr: 'सहाय्य' },
  helpCenter: { en: 'Help Center', hi: 'सहायता केंद्र', mr: 'मदत केंद्र' },
  contactUs: { en: 'Contact Us', hi: 'संपर्क करें', mr: 'संपर्क साधा' },
  privacyPolicy: { en: 'Privacy Policy', hi: 'गोपनीयता नीति', mr: 'गोपनीयता धोरण' },
  termsOfService: { en: 'Terms of Service', hi: 'सेवा की शर्तें', mr: 'सेवा अटी' },
  signOut: { en: 'Sign Out', hi: 'साइन आउट', mr: 'साइन आउट' },
  documentsSecured: { en: 'Documents Secured', hi: 'दस्तावेज़ सुरक्षित', mr: 'दस्तऐवज सुरक्षित' },

  // Test Screen
  simpleTest: { en: 'Simple Cognitive Test', hi: 'सरल संज्ञानात्मक टेस्ट', mr: 'सोपी संज्ञानात्मक चाचणी' },
  quickAssessment: { en: 'Quick & Easy Assessment', hi: 'त्वरित और आसान मूल्यांकन', mr: 'जलद आणि सोपे मूल्यांकन' },
  question: { en: 'Question', hi: 'प्रश्न', mr: 'प्रश्न' },
  next: { en: 'Next', hi: 'अगला', mr: 'पुढे' },
  previous: { en: 'Previous', hi: 'पिछला', mr: 'मागील' },
  finish: { en: 'Finish', hi: 'समाप्त', mr: 'पूर्ण' },
  testResults: { en: 'Test Results', hi: 'टेस्ट परिणाम', mr: 'चाचणी निकाल' },
  retakeTest: { en: 'Take New Test', hi: 'नया टेस्ट लें', mr: 'नवीन चाचणी घ्या' },
  aiPrediction: { en: 'AI Prediction', hi: 'AI भविष्यवाणी', mr: 'AI अंदाज' },

  // Document Scan
  aiDocAnalysis: { en: 'AI Document Analysis', hi: 'AI दस्तावेज़ विश्लेषण', mr: 'AI दस्तऐवज विश्लेषण' },
  scanMedicalReports: { en: 'Scan medical reports • Get cognitive health insights', hi: 'मेडिकल रिपोर्ट स्कैन करें • संज्ञानात्मक स्वास्थ्य जानकारी प्राप्त करें', mr: 'वैद्यकीय अहवाल स्कॅन करा • संज्ञानात्मक आरोग्य माहिती मिळवा' },
  takePhoto: { en: 'Take Photo', hi: 'फोटो लें', mr: 'फोटो घ्या' },
  captureDoc: { en: 'Capture document using camera', hi: 'कैमरे से दस्तावेज़ कैप्चर करें', mr: 'कॅमेऱ्याने दस्तऐवज कॅप्चर करा' },
  uploadGallery: { en: 'Upload from Gallery', hi: 'गैलरी से अपलोड करें', mr: 'गॅलरीमधून अपलोड करा' },
  selectDoc: { en: 'Select existing document', hi: 'मौजूदा दस्तावेज़ चुनें', mr: 'विद्यमान दस्तऐवज निवडा' },
  analyzeWithAI: { en: 'Analyze with AI', hi: 'AI से विश्लेषण करें', mr: 'AI सह विश्लेषण करा' },
  analysisResults: { en: 'Analysis Results', hi: 'विश्लेषण परिणाम', mr: 'विश्लेषण निकाल' },
  mlPrediction: { en: 'ML Prediction', hi: 'ML भविष्यवाणी', mr: 'ML अंदाज' },
  confidence: { en: 'Confidence', hi: 'विश्वास', mr: 'विश्वास' },
  riskLevel: { en: 'Risk Level', hi: 'जोखिम स्तर', mr: 'जोखीम पातळी' },
  keyFindings: { en: 'Key Findings', hi: 'मुख्य निष्कर्ष', mr: 'मुख्य निष्कर्ष' },
  recommendations: { en: 'AI Recommendations', hi: 'AI सिफारिशें', mr: 'AI शिफारसी' },
  followUpPlan: { en: 'Follow-up Plan', hi: 'फॉलो-अप योजना', mr: 'फॉलो-अप योजना' },
  scanAnother: { en: 'Scan Another', hi: 'एक और स्कैन करें', mr: 'आणखी एक स्कॅन करा' },

  // Risk Levels
  lowRisk: { en: 'Low Risk', hi: 'कम जोखिम', mr: 'कमी जोखीम' },
  moderateRisk: { en: 'Moderate Risk', hi: 'मध्यम जोखिम', mr: 'मध्यम जोखीम' },
  highRisk: { en: 'High Risk', hi: 'उच्च जोखिम', mr: 'उच्च जोखीम' },

  // Detail View
  viewDetails: { en: 'View Details', hi: 'विवरण देखें', mr: 'तपशील पहा' },
  recordDetails: { en: 'Record Details', hi: 'रिकॉर्ड विवरण', mr: 'रेकॉर्ड तपशील' },
  dateTime: { en: 'Date & Time', hi: 'दिनांक और समय', mr: 'दिनांक आणि वेळ' },
  prediction: { en: 'Prediction', hi: 'भविष्यवाणी', mr: 'अंदाज' },
  score: { en: 'Score', hi: 'स्कोर', mr: 'गुण' },

  // Welcome Screen
  cognitiveHealth: { en: 'Cognitive Health', hi: 'संज्ञानात्मक स्वास्थ्य', mr: 'संज्ञानात्मक आरोग्य' },
  madeSimple: { en: 'Made Simple', hi: 'आसान बनाया', mr: 'सोपे केले' },
  getStarted: { en: 'Get Started', hi: 'शुरू करें', mr: 'सुरू करा' },
  haveAccount: { en: 'Already have an account?', hi: 'पहले से खाता है?', mr: 'आधीच खाते आहे?' },
  signIn: { en: 'Sign In', hi: 'साइन इन', mr: 'साइन इन' },
};

// Language names for display
export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

// Zustand store for language state
interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const useLanguage = create<LanguageState>((set, get) => ({
  language: 'en',
  setLanguage: async (lang: Language) => {
    set({ language: lang });
    await AsyncStorage.setItem('@app_language', lang);
  },
  t: (key: string) => {
    const lang = get().language;
    const translation = translations[key];
    if (!translation) return key;
    return translation[lang] || translation.en || key;
  },
}));

// Initialize language from storage
export const initializeLanguage = async () => {
  try {
    const stored = await AsyncStorage.getItem('@app_language');
    if (stored && (stored === 'en' || stored === 'hi' || stored === 'mr')) {
      useLanguage.getState().setLanguage(stored as Language);
    }
  } catch (error) {
    console.log('Error loading language:', error);
  }
};

export default useLanguage;
