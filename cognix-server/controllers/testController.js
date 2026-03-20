const testService = require('../services/testService');

class TestController {
  /**
   * @route POST /api/tests
   * @desc Save test result
   */
  async saveTest(req, res) {
    try {
      const { clerkId, ...testData } = req.body;
      console.log('📝 Controller: Received saveTest request for clerkId:', clerkId);
      console.log('📝 Controller: Test data payload:', JSON.stringify(testData, null, 2));

      if (!clerkId) {
        return res.status(400).json({
          success: false,
          error: 'clerkId is required'
        });
      }

      const test = await testService.saveTest(clerkId, testData);

      res.status(201).json({
        success: true,
        message: 'Test saved successfully',
        test
      });
    } catch (error) {
      console.error('TestController.saveTest error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/tests/:clerkId
   * @desc Get user's test history
   */
  async getTestHistory(req, res) {
    try {
      const { clerkId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await testService.getTestHistory(clerkId, page, limit);

      res.json({
        success: true,
        count: result.tests.length,
        ...result
      });
    } catch (error) {
      console.error('TestController.getTestHistory error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/tests/:clerkId/latest
   * @desc Get latest test
   */
  async getLatestTest(req, res) {
    try {
      const { clerkId } = req.params;
      const test = await testService.getLatestTest(clerkId);

      if (!test) {
        return res.status(404).json({
          success: false,
          error: 'No tests found'
        });
      }

      res.json({
        success: true,
        test
      });
    } catch (error) {
      console.error('TestController.getLatestTest error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/tests/test/:testId
   * @desc Get test by ID
   */
  async getTestById(req, res) {
    try {
      const { testId } = req.params;
      const test = await testService.getTestById(testId);

      if (!test) {
        return res.status(404).json({
          success: false,
          error: 'Test not found'
        });
      }

      res.json({
        success: true,
        test
      });
    } catch (error) {
      console.error('TestController.getTestById error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route DELETE /api/tests/:testId
   * @desc Delete test
   */
  async deleteTest(req, res) {
    try {
      const { testId } = req.params;
      await testService.deleteTest(testId);

      res.json({
        success: true,
        message: 'Test deleted successfully'
      });
    } catch (error) {
      console.error('TestController.deleteTest error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new TestController();
