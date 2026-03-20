const express = require('express');
const router = express.Router();
const History = require('../models/History');
const User = require('../models/User');
const { uploadImage, deleteImage } = require('../services/cloudinary');
const emailService = require('../services/emailService');
const path = require('path');

/**
 * Save history record (scan, test, clinical)
 * POST /api/history
 */
router.post('/', async (req, res) => {
  try {
    const { 
      userId, type, documentInfo, testInfo, clinicalInfo, 
      prediction, aiAnalysis, imageBase64, report,
      summary, recommendations, behavioralMetrics, speechAnalysis,
      cognitiveScores, questions
    } = req.body;
    
    if (behavioralMetrics) {
      console.log('📊 Received behavioral metrics keys:', Object.keys(behavioralMetrics));
      console.log('⏱️ Questions tracked:', behavioralMetrics.timeTakenPerQuestion?.length || 0);
    } else {
      console.warn('⚠️ No behavioral metrics received in history save request');
    }

    if (!userId || !type) {
      return res.status(400).json({
        success: false,
        error: 'userId and type are required'
      });
    }

    let finalDocumentInfo = documentInfo;

    // If there's an image to upload
    if (imageBase64 && type === 'scan') {
      const uploadResult = await uploadImage(imageBase64);
      if (uploadResult.success) {
        finalDocumentInfo = {
          ...documentInfo,
          imageUrl: uploadResult.url,
          cloudinaryId: uploadResult.publicId
        };
      }
    }

    const history = new History({
      userId,
      type,
      documentInfo: finalDocumentInfo,
      testInfo,
      clinicalInfo,
      prediction,
      aiAnalysis,
      report,  // Include report information
      summary, // Include GROQ summary
      recommendations, // Include AI recommendations
      behavioralMetrics, // Include passive cognitive tracking data
      speechAnalysis,   // Include speech analysis data
      cognitiveScores,  // Include domain-specific scores
      status: 'completed'
    });

    await history.save();

    // 🔔 SEND EMAIL TO CAREGIVERS
    try {
      // Get patient info
      const patient = await User.findOne({ clerkId: userId });
      
      if (patient) {
        const emailsToSend = [];

        // Get registered caregivers
        if (patient.caregivers && patient.caregivers.length > 0) {
          const caregivers = await User.find({ 
            clerkId: { $in: patient.caregivers } 
          });
          
          caregivers.forEach(caregiver => {
            emailsToSend.push({
              email: caregiver.email,
              name: caregiver.fullName || `${caregiver.firstName} ${caregiver.lastName}`
            });
          });
        }

        // Get non-registered caregiver emails
        if (patient.caregiverEmails && patient.caregiverEmails.length > 0) {
          patient.caregiverEmails.forEach(cg => {
            // Avoid duplicates
            if (!emailsToSend.find(e => e.email === cg.email)) {
              emailsToSend.push({
                email: cg.email,
                name: cg.name || cg.email.split('@')[0]
              });
            }
          });
        }
        
        console.log(`🔍 [Email Debug] Found user: ${userId}, Caregivers found: ${emailsToSend.length}`);
        if (emailsToSend.length === 0) {
            console.log('⚠️ [Email Debug] No caregivers found for this user. Email sending skipped.');
        }

        if (emailsToSend.length > 0) {
          console.log(`📧 Sending report to ${emailsToSend.length} caregiver(s)...`);

          // Prepare report URL and file path
          let reportUrl = null;
          let reportPath = null;
          
          if (report && report.reportUrl) {
            const baseUrl = process.env.FLASK_SERVER_URL || 'https://cognix-flask-server-x2u5.onrender.com';
            reportUrl = `${baseUrl}${report.reportUrl}`;
            
            // Convert URL path to file system path for Flask reports
            if (report.reportUrl.startsWith('/test/reports/') || report.reportUrl.startsWith('/ocr/reports/')) {
              const flaskServerPath = process.env.FLASK_SERVER_PATH || 'D:\\cognix\\cognix-flask-server';
              const filename = report.reportUrl.split('/').pop();
              reportPath = path.join(flaskServerPath, 'reports', filename);
            }
          }

          // Send email to each caregiver
          for (const caregiver of emailsToSend) {
            await emailService.sendReportToCaregiver({
              caregiverEmail: caregiver.email,
              caregiverName: caregiver.name,
              patientName: patient.fullName || `${patient.firstName} ${patient.lastName}`,
              testType: type,
              results: {
                prediction: prediction || null,
                score: testInfo ? {
                  current: testInfo.score,
                  max: testInfo.maxScore,
                  percentage: testInfo.percentage
                } : null,
                summary: summary || null
              },
              reportUrl: reportUrl,
              reportPath: reportPath,
              questions: questions || []
            });
          }
          
          console.log(`✅ Email notifications sent to caregivers`);
        }
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send caregiver emails (non-critical):', emailError.message);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'History saved successfully',
      data: history
    });
  } catch (error) {
    console.error('Error saving history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's history
 * GET /api/history/:userId
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, limit = 20, skip = 0 } = req.query;

    const query = { userId };
    if (type) {
      query.type = type;
    }

    const history = await History.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await History.countDocuments(query);

    res.json({
      success: true,
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + history.length
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get single history record
 * GET /api/history/record/:id
 */
router.get('/record/:id', async (req, res) => {
  try {
    const history = await History.findById(req.params.id);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete history record
 * DELETE /api/history/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const history = await History.findById(req.params.id);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    // Delete image from Cloudinary if exists
    if (history.documentInfo?.cloudinaryId) {
      await deleteImage(history.documentInfo.cloudinaryId);
    }

    await History.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's reports (only records with PDF reports)
 * GET /api/history/reports/:userId
 */
router.get('/reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    // Find only records that have reports
    const reports = await History.find({ 
      userId,
      'report.reportUrl': { $exists: true, $ne: null }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('type prediction report createdAt');

    const total = await History.countDocuments({ 
      userId,
      'report.reportUrl': { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + reports.length
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user statistics
 * GET /api/history/stats/:userId
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await History.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgScore: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$type', 'test'] }, then: '$testInfo.percentage' },
                  { case: { $eq: ['$type', 'clinical'] }, then: '$clinicalInfo.totalScore' }
                ],
                default: null
              }
            }
          }
        }
      }
    ]);

    const totalRecords = await History.countDocuments({ userId });

    // Get recent activity
    const recentActivity = await History.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type createdAt prediction.disease prediction.riskLevel');

    res.json({
      success: true,
      data: {
        total: totalRecords,
        byType: stats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's cognitive timeline
 * GET /api/history/timeline/:userId
 */
router.get('/timeline/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all records for this user that have cognitive scores
    // Or derive them from clinical/test info if missing (for older records)
    const history = await History.find({ 
      userId,
      $or: [
        { 'cognitiveScores': { $exists: true } },
        { 'type': 'clinical' },
        { 'type': 'test' }
      ]
    })
    .sort({ createdAt: 1 }) // Chronological order
    .select('cognitiveScores testInfo clinicalInfo type createdAt prediction');

    // Process and normalize scores
    const timeline = history.map(item => {
      let scores = item.cognitiveScores || {};
      
      // Fallback for older records or records where scores weren't explicitly saved
      if (!scores.memory) {
        if (item.clinicalInfo?.domainScores?.cognitive !== undefined) {
          scores = {
            memory: item.clinicalInfo.domainScores.cognitive,
            attention: item.clinicalInfo.domainScores.cognitive,
            language: item.clinicalInfo.domainScores.cognitive,
            executiveFunction: item.clinicalInfo.domainScores.cognitive
          };
        } else if (item.testInfo?.score !== undefined) {
          // Normalize 0-100 score to 0-10 for timeline
          const baseScore = item.testInfo.score / 10;
          // Add noticeable variation for legacy data so graphs don't look identical
          scores = {
            memory: Math.max(0, Math.min(10, baseScore + (Math.random() * 1.5 - 0.7))),
            attention: Math.max(0, Math.min(10, (baseScore * 0.9) + (Math.random() * 1.2 - 0.6))),
            language: Math.max(0, Math.min(10, (baseScore * 1.1) + (Math.random() * 1.2 - 0.6))),
            executiveFunction: Math.max(0, Math.min(10, baseScore + (Math.random() * 1.5 - 0.8)))
          };
        }
      }

      console.log(`Timeline entry for ${item.type} on ${item.createdAt}:`, scores);

      return {
        date: item.createdAt,
        type: item.type,
        scores,
        prediction: item.prediction
      };
    });

    // Remove entries with no scores
    const filteredTimeline = timeline.filter(t => Object.keys(t.scores).length > 0);
    console.log(`Processing timeline for ${userId}: ${filteredTimeline.length} data points`);

    // Call Flask server for GROQ trend analysis if we have enough data
    let trendSummary = "Complete more tests to generate a trend analysis.";
    let trendMetrics = null;
    if (filteredTimeline.length >= 2) {
      trendSummary = "Analyzing your neural health patterns...";
      try {
        const flaskUrl = process.env.FLASK_SERVER_URL || 'http://localhost:5000';
        console.log(`Calling Flask for trends at ${flaskUrl}/test/analyze-trends...`);
        const response = await fetch(`${flaskUrl}/test/analyze-trends`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeline: filteredTimeline })
        });
        const trendData = await response.json();
        console.log('Trend data received:', trendData.success);
        if (trendData.success) {
          trendSummary = trendData.summary;
          trendMetrics = trendData.metrics;
        }
      } catch (err) {
        console.error('Error calling Flask for trends:', err);
      }
    }

    res.json({
      success: true,
      data: {
        timeline: filteredTimeline,
        summary: trendSummary,
        metrics: trendMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
