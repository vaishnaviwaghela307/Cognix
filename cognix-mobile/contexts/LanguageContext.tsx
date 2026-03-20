/**
 * Language/Translation Context
 * Provides app-wide language switching using Google Translate
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
];

// App strings that can be translated
export const APP_STRINGS = {
  // Navigation
  home: 'Home',
  profile: 'Profile',
  settings: 'Settings',
  tests: 'Tests',
  results: 'Results',
  
  // Home Screen
  welcome: 'Welcome',
  welcomeBack: 'Welcome Back',
  yourCognitiveHealth: 'Your Cognitive Health Dashboard',
  takeTest: 'Take a Cognitive Test',
  viewHistory: 'View Test History',
  
  // Test Screens
  quickTest: 'Quick Test',
  fullAssessment: 'Full Assessment',
  clinicalTest: 'Clinical Test',
  startTest: 'Start Test',
  nextQuestion: 'Next Question',
  submitTest: 'Submit Test',
  questionOf: 'Question {current} of {total}',
  
  // Results
  testResults: 'Test Results',
  score: 'Score',
  riskLevel: 'Risk Level',
  lowRisk: 'Low Risk',
  mediumRisk: 'Medium Risk',
  highRisk: 'High Risk',
  recommendations: 'Recommendations',
  
  // Settings
  language: 'Language',
  selectLanguage: 'Select Language',
  notifications: 'Notifications',
  darkMode: 'Dark Mode',
  about: 'About',
  signOut: 'Sign Out',
  
  // Auth
  signIn: 'Sign In',
  signUp: 'Sign Up',
  email: 'Email',
  password: 'Password',
  forgotPassword: 'Forgot Password?',
  
  // Common
  loading: 'Loading...',
  error: 'Error',
  retry: 'Retry',
  cancel: 'Cancel',
  confirm: 'Confirm',
  save: 'Save',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  
  // Notes
  testQuestionsEnglishOnly: 'Note: Test questions are in English for accurate cognitive assessment.',
};

interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
  };
}

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => Promise<void>;
  translate: (text: string) => string;
  translateAsync: (text: string) => Promise<string>;
  isTranslating: boolean;
  strings: typeof APP_STRINGS;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = '@cognix_language';

// Simple translation cache
const translationCache: TranslationCache = {};

// Google Translate API (free tier via web)
async function translateWithGoogle(text: string, targetLang: string): Promise<string> {
  if (targetLang === 'en') return text;
  
  // Check cache first
  const cacheKey = text.toLowerCase().trim();
  if (translationCache[cacheKey]?.[targetLang]) {
    return translationCache[cacheKey][targetLang];
  }
  
  try {
    // Using Google Translate API (you can replace with your API key)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0]) {
      const translatedText = data[0].map((item: any) => item[0]).join('');
      
      // Cache the result
      if (!translationCache[cacheKey]) {
        translationCache[cacheKey] = {};
      }
      translationCache[cacheKey][targetLang] = translatedText;
      
      return translatedText;
    }
    
    return text;
  } catch (error) {
    console.warn('Translation failed:', error);
    return text;
  }
}

// Pre-translated strings cache (for common UI elements)
const preTranslatedStrings: { [lang: string]: Partial<typeof APP_STRINGS> } = {
  hi: {
    home: 'होम',
    profile: 'प्रोफ़ाइल',
    settings: 'सेटिंग्स',
    welcome: 'स्वागत है',
    welcomeBack: 'वापसी पर स्वागत है',
    quickTest: 'त्वरित परीक्षण',
    fullAssessment: 'पूर्ण मूल्यांकन',
    clinicalTest: 'नैदानिक परीक्षण',
    startTest: 'परीक्षण शुरू करें',
    nextQuestion: 'अगला प्रश्न',
    submitTest: 'परीक्षण जमा करें',
    testResults: 'परीक्षण परिणाम',
    score: 'स्कोर',
    riskLevel: 'जोखिम स्तर',
    lowRisk: 'कम जोखिम',
    mediumRisk: 'मध्यम जोखिम',
    highRisk: 'उच्च जोखिम',
    language: 'भाषा',
    selectLanguage: 'भाषा चुनें',
    signIn: 'साइन इन करें',
    signUp: 'साइन अप करें',
    signOut: 'साइन आउट',
    loading: 'लोड हो रहा है...',
    testQuestionsEnglishOnly: 'नोट: सटीक संज्ञानात्मक मूल्यांकन के लिए परीक्षण प्रश्न अंग्रेजी में हैं।',
  },
  mr: {
    home: 'होम',
    profile: 'प्रोफाइल',
    settings: 'सेटिंग्स',
    welcome: 'स्वागत आहे',
    welcomeBack: 'परत स्वागत आहे',
    quickTest: 'जलद चाचणी',
    fullAssessment: 'संपूर्ण मूल्यांकन',
    startTest: 'चाचणी सुरू करा',
    language: 'भाषा',
    selectLanguage: 'भाषा निवडा',
    signIn: 'साइन इन करा',
    signUp: 'साइन अप करा',
    signOut: 'साइन आउट',
    testQuestionsEnglishOnly: 'टीप: अचूक संज्ञानात्मक मूल्यांकनासाठी चाचणी प्रश्न इंग्रजीत आहेत.',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedStrings, setTranslatedStrings] = useState<typeof APP_STRINGS>(APP_STRINGS);

  // Load saved language preference
  useEffect(() => {
    loadLanguage();
  }, []);

  // Translate strings when language changes
  useEffect(() => {
    if (currentLanguage !== 'en') {
      translateAllStrings();
    } else {
      setTranslatedStrings(APP_STRINGS);
    }
  }, [currentLanguage]);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLang && SUPPORTED_LANGUAGES.some(l => l.code === savedLang)) {
        setCurrentLanguage(savedLang);
      }
    } catch (error) {
      console.warn('Failed to load language preference:', error);
    }
  };

  const setLanguage = async (lang: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  };

  const translateAllStrings = async () => {
    if (preTranslatedStrings[currentLanguage]) {
      // Use pre-translated strings for common languages
      setTranslatedStrings({
        ...APP_STRINGS,
        ...preTranslatedStrings[currentLanguage],
      });
    } else {
      // Translate dynamically for other languages
      setIsTranslating(true);
      const translated: any = {};
      
      for (const [key, value] of Object.entries(APP_STRINGS)) {
        translated[key] = await translateWithGoogle(value, currentLanguage);
      }
      
      setTranslatedStrings(translated as typeof APP_STRINGS);
      setIsTranslating(false);
    }
  };

  const translate = (text: string): string => {
    // Check if it's a known string key
    const key = Object.entries(APP_STRINGS).find(([_, v]) => v === text)?.[0];
    if (key && translatedStrings[key as keyof typeof APP_STRINGS]) {
      return translatedStrings[key as keyof typeof APP_STRINGS];
    }
    return text;
  };

  const translateAsync = async (text: string): Promise<string> => {
    if (currentLanguage === 'en') return text;
    return translateWithGoogle(text, currentLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        translate,
        translateAsync,
        isTranslating,
        strings: translatedStrings,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
