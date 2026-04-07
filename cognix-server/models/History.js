const mongoose = require("mongoose");


const historySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["scan", "test", "clinical", "report", "speech"],
    required: true,
  },
  // For Document Scans
  documentInfo: {
    type: {
      type: String,
    },
    imageUrl: String,
    cloudinaryId: String,
    rawText: String,
    clinicalValues: [
      {
        name: String,
        value: String,
        unit: String,
      },
    ],
  },
  // For Tests
  testInfo: {
    testType: String,
    score: Number,
    maxScore: Number,
    percentage: Number,
    answers: mongoose.Schema.Types.Mixed,
  },
  // For Clinical Assessments
  clinicalInfo: {
    domainScores: {
      demographic: Number,
      cognitive: Number,
      motoric: Number,
      neuropsychiatric: Number,
    },
    userAnswers: {
      demographic: [String],
      cognitive: [String],
      motoric: [String],
      neuropsychiatric: [String],
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
    },
  },
  // ML Prediction Results
  prediction: {
    disease: String,
    confidence: Number,
    severity: String,
    riskLevel: String,
    allPredictions: mongoose.Schema.Types.Mixed,
  },
  // AI Analysis
  aiAnalysis: {
    cognitiveAssessment: {
      overallRisk: String,
      riskScore: Number,
      primaryConcern: String,
      explanation: String,
    },
    keyFindings: [
      {
        finding: String,
        significance: String,
        status: String,
      },
    ],
    recommendations: {
      immediate: [String],
      lifestyle: [String],
      medical: [String],
      cognitive: [String],
      dietary: [String],
    },
    followUpPlan: {
      urgency: String,
      specialists: [String],
      tests: [String],
      timeline: String,
    },
  },
  // Report Information
  report: {
    reportId: String,
    reportUrl: String,
    generatedAt: Date,
    reportType: {
      type: String,
      enum: ["ocr_scan", "clinical_test", "quick_test", "comprehensive"],
    },
  },
  // Top-level Summary and Recommendations (GROQ Generated)
  summary: {
    type: String,
  },
  recommendations: {
    type: [String],
  },
  // Status
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "completed",
  },
  // Behavioral Metrics
  behavioralMetrics: {
    timeTakenPerQuestion: [Number], // in milliseconds
    delayBeforeFirstInput: [Number], // in milliseconds
    editCount: [Number],
    backspaceCount: [Number],
    typingSpeedChanges: [Number], // average chars per second changes
    answerModificationFrequency: Number,
    // Calculated Cognitive Indicators
    hesitationIndex: Number,
    responseInstabilityScore: Number,
    cognitiveFrictionScore: Number,
    aiBehavioralSummary: String,
  },
  // Speech & Language Analysis
  speechAnalysis: {
    transcript: String,
    taskType: String,
    coherenceScore: Number,
    fluencyScore: Number,
    recallDifficulty: String,
    pauseCount: Number,
    duration: Number,
    markers: [String],
    clinicalInsight: String,
    audioUrl: String,
  },
  // Cognitive Domain Scores (For Timeline)
  cognitiveScores: {
    memory: Number,
    attention: Number,
    language: Number,
    executiveFunction: Number,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
historySchema.index({ userId: 1, createdAt: -1 });
historySchema.index({ userId: 1, type: 1 });

// Pre-save middleware
historySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("History", historySchema);
