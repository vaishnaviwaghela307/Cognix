const userService = require('../services/userService');

class UserController {
  /**
   * @route POST /api/users
   * @desc Create or update user
   */
  async createOrUpdateUser(req, res) {
    try {
      const userData = req.body;
      const { user, isNew } = await userService.createOrUpdateUser(userData);

      res.status(isNew ? 201 : 200).json({
        success: true,
        message: isNew ? 'User created successfully' : 'User updated successfully',
        user
      });
    } catch (error) {
      console.error('UserController.createOrUpdateUser error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/users/:clerkId
   * @desc Get user by Clerk ID
   */
  async getUserByClerkId(req, res) {
    try {
      const { clerkId } = req.params;
      const user = await userService.getUserByClerkId(clerkId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('UserController.getUserByClerkId error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route PUT /api/users/:clerkId/profile
   * @desc Update user profile
   */
  async updateUserProfile(req, res) {
    try {
      const { clerkId } = req.params;
      const profileData = req.body;

      const user = await userService.updateUserProfile(clerkId, profileData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error('UserController.updateUserProfile error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/users
   * @desc Get all users (with pagination)
   */
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await userService.getAllUsers(page, limit);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('UserController.getAllUsers error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new UserController();
