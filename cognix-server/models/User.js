const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Clerk user ID
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Basic Info from Clerk
  email: {
    type: String,
    required: true,
    unique: true
  },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  
  // Profile Setup Data
  fullName: String,
  age: Number,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  education: String,
  role: {
    type: String,
    enum: ['patient', 'caregiver'],
    default: 'patient'
  },
  
  // Health Information
  familyHistory: {
    type: Boolean,
    default: false
  },
  medicalConditions: {
    type: Boolean,
    default: false
  },
  
  // Profile Status
  profileCompleted: {
    type: Boolean,
    default: false
  },
  
  // Test History
  tests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test'
  }],
  
  // Family & Caregiver mode
  caregivers: [{
    type: String, // Clerk ID of the caregiver
    index: true
  }],
  caregiverEmails: [{
    email: String,
    name: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  patients: [{
    type: String, // Clerk ID of the patient
    index: true
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ clerkId: 1 });

module.exports = mongoose.model('User', userSchema);
