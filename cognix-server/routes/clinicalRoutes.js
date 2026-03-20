const express = require('express');
const router = express.Router();
const axios = require('axios');
const History = require('../models/History');
const groqService = require('../services/groqService');

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5000';

/**
 * Analyze text answers for a domain
 * POST /api/clinical/analyze
 */
router.post('/analyze', async (req, res) => {
  try {
    const { domain, answers } = req.body;

    if (!domain || !answers || !Array.isArray(answers) || answers.length !== 4) {
      return res.status(400).json({
        success: false,
        error: 'Domain and 4 answers are required'
      });
    }

    // Call Flask API to analyze answers
    const response = await axios.post(`${FLASK_API_URL}/clinical/analyze`, {
      domain,
      answers
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error analyzing answers:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Complete clinical assessment and save to database
 * POST /api/clinical/assess
 */
router.post('/assess', async (req, res) => {
  try {
    const {
      userId,
      demographic_score,
      cognitive_score,
      motoric_score,
      neuropsychiatric_score,
      user_answers,
      includeCaregiver = false
    } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (
      demographic_score === undefined ||
      cognitive_score === undefined ||
      motoric_score === undefined ||
      neuropsychiatric_score === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'All 4 domain scores are required'
      });
    }

    // Optional: Fetch latest caregiver signals if requested
    let caregiverSignals = null;
    if (includeCaregiver) {
      const CaregiverObservation = require('../models/CaregiverObservation');
      const latestObservation = await CaregiverObservation.findOne({ patientId: userId }).sort({ observationDate: -1 });
      if (latestObservation && latestObservation.structuredSignals) {
        caregiverSignals = latestObservation.structuredSignals;
      }
    }

    // Call Flask API for prediction
    const predictionResponse = await axios.post(`${FLASK_API_URL}/clinical/predict`, {
      demographic_score,
      cognitive_score,
      motoric_score,
      neuropsychiatric_score,
      user_answers,
      caregiver_signals: caregiverSignals
    });

    const predictionData = predictionResponse.data;

    if (!predictionData.success) {
      return res.status(500).json({
        success: false,
        error: 'Prediction failed'
      });
    }

    const prediction = predictionData.prediction;

    // Determine risk level based on confidence and disease
    let riskLevel = 'Low';
    if (prediction.confidence > 0.7) {
      riskLevel = 'High';
    } else if (prediction.confidence > 0.4) {
      riskLevel = 'Medium';
    }

    // Save to database
    const history = new History({
      userId,
      type: 'clinical',
      clinicalInfo: {
        domainScores: {
          demographic: demographic_score,
          cognitive: cognitive_score,
          motoric: motoric_score,
          neuropsychiatric: neuropsychiatric_score
        },
        userAnswers: user_answers || {},
        assessmentDate: new Date()
      },
      prediction: {
        disease: prediction.predicted_disease,
        confidence: prediction.confidence,
        riskLevel,
        allPredictions: prediction.probabilities
      },
      status: 'completed'
    });

    await history.save();

    res.status(201).json({
      success: true,
      message: 'Clinical assessment completed and saved',
      data: {
        historyId: history._id,
        prediction: {
          predicted_disease: prediction.predicted_disease,
          confidence: prediction.confidence,
          probabilities: prediction.probabilities,
          riskLevel
        },
        domainScores: prediction.domain_scores
      }
    });
  } catch (error) {
    console.error('Error in clinical assessment:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * Get user's clinical assessment history
 * GET /api/clinical/history/:userId
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const assessments = await History.find({
      userId,
      type: 'clinical'
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('clinicalInfo prediction createdAt');

    const total = await History.countDocuments({ userId, type: 'clinical' });

    res.json({
      success: true,
      data: assessments,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + assessments.length
      }
    });
  } catch (error) {
    console.error('Error fetching clinical history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get clinical assessment details
 * GET /api/clinical/assessment/:id
 */
router.get('/assessment/:id', async (req, res) => {
  try {
    const assessment = await History.findById(req.params.id);

    if (!assessment || assessment.type !== 'clinical') {
      return res.status(404).json({
        success: false,
        error: 'Clinical assessment not found'
      });
    }

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate clinical questions using GROQ AI
 * POST /api/clinical/generate-questions
 */
router.post('/generate-questions', async (req, res) => {
  try {
    const { domain } = req.body;

    // Validate domain if provided
    const validDomains = ['demographic', 'cognitive', 'motoric', 'neuropsychiatric'];
    if (domain && !validDomains.includes(domain)) {
      return res.status(400).json({
        success: false,
        error: `Invalid domain. Must be one of: ${validDomains.join(', ')}`
      });
    }

    const result = await groqService.generateClinicalQuestions(domain);

    res.json(result);
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions'
    });
  }
});

/**
 * Generate quick test questions (10 yes/no questions)
 * POST /api/clinical/generate-quick-questions
 */
router.post('/generate-quick-questions', async (req, res) => {
  try {
    const result = await groqService.generateQuickTestQuestions();
    res.json(result);
  } catch (error) {
    console.error('Error generating quick questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate quick questions'
    });
  }
});

module.exports = router;
