const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// Save test result
router.post('/', testController.saveTest.bind(testController));

// Get user's test history
router.get('/:clerkId', testController.getTestHistory.bind(testController));

// Get latest test
router.get('/:clerkId/latest', testController.getLatestTest.bind(testController));

// Get test by ID
router.get('/test/:testId', testController.getTestById.bind(testController));

// Delete test
router.delete('/:testId', testController.deleteTest.bind(testController));

module.exports = router;
