const Test = require('../models/Test');
const User = require('../models/User');
const emailService = require('./emailService');

class TestService {
  /**
   * Save test result
   */
  async saveTest(clerkId, testData) {
    try {
      const { testData: data, prediction, testType } = testData;

      // Find user
      const user = await User.findOne({ clerkId });

      if (!user) {
        throw new Error('User not found');
      }

      // Map testType to valid DB enum values
      const validDbTypes = ['hybrid', 'individual', 'multiclass'];
      const dbTestType = validDbTypes.includes(testType) ? testType : 'hybrid';

      // Create test record
      const test = new Test({
        userId: user._id,
        testData: data,
        prediction,
        testType: dbTestType
      });

      await test.save();

      // Add test to user's tests array
      user.tests.push(test._id);
      await user.save();

      console.log(`✅ Test saved for user: ${user.email}`);

      // ---------------------------------------------------------
      // SEND EMAIL NOTIFICATION TO CAREGIVERS
      // ---------------------------------------------------------
      try {
        // 0. Debug caregiver data
        console.log(`🔍 Checking caregivers for user: ${user.email}`);
        console.log(`   - Registered caregivers (link IDs):`, user.caregivers);
        console.log(`   - Manual caregiver emails:`, user.caregiverEmails);

        const emailsToSend = [];

        // 1. Get registered caregivers (linked via Clerk ID)
        if (user.caregivers && user.caregivers.length > 0) {
          const caregivers = await User.find({ 
            clerkId: { $in: user.caregivers } 
          });
          
          caregivers.forEach(caregiver => {
            if (caregiver.email) {
              emailsToSend.push({
                email: caregiver.email,
                name: caregiver.fullName || `${caregiver.firstName} ${caregiver.lastName}` || 'Caregiver'
              });
            }
          });
        }

        // 2. Get non-registered caregiver emails (manually added)
        if (user.caregiverEmails && user.caregiverEmails.length > 0) {
          user.caregiverEmails.forEach(cg => {
            // Avoid duplicates
            if (cg.email && !emailsToSend.find(e => e.email === cg.email)) {
              emailsToSend.push({
                email: cg.email,
                name: cg.name || cg.email.split('@')[0]
              });
            }
          });
        }

        if (emailsToSend.length > 0) {
          console.log(`📧 Found ${emailsToSend.length} caregivers to notify for user ${user.email}`);
          
          // Prepare results for email
          const emailResults = {
            prediction: {
              disease: prediction?.predicted_class || 'Assessment Complete',
              riskLevel: prediction?.risk_level || 'Pending Analysis',
              confidence: prediction?.confidence || 0,
            },
            // Try to format score if MMSE is available
            score: data.mmse_score ? {
              current: data.mmse_score,
              max: 30, // MMSE is usually out of 30
              percentage: Math.round((data.mmse_score / 30) * 100)
            } : null,
            summary: prediction?.recommendations ? prediction.recommendations.join('. ') : null
          };

          // Send to each caregiver
          for (const caregiver of emailsToSend) {
            await emailService.sendReportToCaregiver({
              caregiverEmail: caregiver.email,
              caregiverName: caregiver.name,
              patientName: user.fullName || `${user.firstName} ${user.lastName}` || 'Patient',
              testType: 'test', // 'test' maps to 'Cognitive Test' label
              results: emailResults
            });
          }
        } else {
          console.log(`ℹ️ No caregivers found for user ${user.email}. Skipping email notification.`);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send caregiver emails (non-critical):', emailError);
        // Do not throw, so the test save is still considered successful
      }

      return test;
    } catch (error) {
      console.error('❌ TestService.saveTest error:', error);
      throw error;
    }
  }

  /**
   * Get user's test history
   */
  async getTestHistory(clerkId, page = 1, limit = 10) {
    try {
      // Find user
      const user = await User.findOne({ clerkId });

      if (!user) {
        throw new Error('User not found');
      }

      const skip = (page - 1) * limit;

      // Get all tests for this user
      const tests = await Test.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Test.countDocuments({ userId: user._id });

      return {
        tests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ TestService.getTestHistory error:', error);
      throw error;
    }
  }

  /**
   * Get latest test
   */
  async getLatestTest(clerkId) {
    try {
      // Find user
      const user = await User.findOne({ clerkId });

      if (!user) {
        throw new Error('User not found');
      }

      // Get latest test
      const test = await Test.findOne({ userId: user._id })
        .sort({ createdAt: -1 });

      return test;
    } catch (error) {
      console.error('❌ TestService.getLatestTest error:', error);
      throw error;
    }
  }

  /**
   * Get test by ID
   */
  async getTestById(testId) {
    try {
      const test = await Test.findById(testId).populate('userId');
      return test;
    } catch (error) {
      console.error('❌ TestService.getTestById error:', error);
      throw error;
    }
  }

  /**
   * Delete test
   */
  async deleteTest(testId) {
    try {
      const test = await Test.findById(testId);
      
      if (!test) {
        throw new Error('Test not found');
      }

      // Remove test from user's tests array
      await User.findByIdAndUpdate(test.userId, {
        $pull: { tests: testId }
      });

      // Delete the test
      await Test.findByIdAndDelete(testId);

      console.log(`✅ Test deleted: ${testId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ TestService.deleteTest error:', error);
      throw error;
    }
  }
}

module.exports = new TestService();
