const User = require('../models/User');

class UserService {
  /**
   * Create or update user
   */
  async createOrUpdateUser(userData) {
    try {
      const { clerkId, email, firstName, lastName, profileImageUrl } = userData;

      if (!clerkId || !email) {
        throw new Error('clerkId and email are required');
      }

      // Check if user exists
      let user = await User.findOne({ clerkId });

      if (user) {
        // Update existing user
        user.email = email;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.profileImageUrl = profileImageUrl || user.profileImageUrl;
        user.updatedAt = Date.now();
        await user.save();

        console.log(`✅ User updated: ${email}`);
        return { user, isNew: false };
      } else {
        // Create new user
        user = new User({
          clerkId,
          email,
          firstName,
          lastName,
          profileImageUrl,
          profileCompleted: false
        });
        await user.save();

        console.log(`✅ User created: ${email}`);
        return { user, isNew: true };
      }
    } catch (error) {
      console.error('❌ UserService.createOrUpdateUser error:', error);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId) {
    try {
      const user = await User.findOne({ clerkId }).populate('tests');
      return user;
    } catch (error) {
      console.error('❌ UserService.getUserByClerkId error:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email }).populate('tests');
      return user;
    } catch (error) {
      console.error('❌ UserService.getUserByEmail error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(clerkId, profileData) {
    try {
      const user = await User.findOne({ clerkId });

      if (!user) {
        throw new Error('User not found');
      }

      // Update profile fields
      const allowedFields = [
        'fullName', 'age', 'gender', 'education', 
        'role', 'familyHistory', 'medicalConditions'
      ];

      allowedFields.forEach(field => {
        if (profileData[field] !== undefined) {
          user[field] = profileData[field];
        }
      });

      user.profileCompleted = true;
      user.updatedAt = Date.now();

      await user.save();
      console.log(`✅ Profile updated for: ${user.email}`);
      
      return user;
    } catch (error) {
      console.error('❌ UserService.updateUserProfile error:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(clerkId) {
    try {
      const result = await User.deleteOne({ clerkId });
      console.log(`✅ User deleted: ${clerkId}`);
      return result;
    } catch (error) {
      console.error('❌ UserService.deleteUser error:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const users = await User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments();
      
      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ UserService.getAllUsers error:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
