const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Create or update user
router.post('/', userController.createOrUpdateUser.bind(userController));

// Get all users (with pagination)
router.get('/', userController.getAllUsers.bind(userController));

// Get user by Clerk ID
router.get('/:clerkId', userController.getUserByClerkId.bind(userController));

// Update user profile
router.put('/:clerkId/profile', userController.updateUserProfile.bind(userController));

module.exports = router;
