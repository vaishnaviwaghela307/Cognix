const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Test Input Data
  testData: {
    age: Number,
    gender: Number,
    mmse_score: Number,
    functional_assessment: Number,
    memory_complaints: Number,
    behavioral_problems: Number,
    adl_score: Number
  },
  
  // Test Results
  prediction: {
    predicted_class: String,
    confidence: Number,
    probabilities: mongoose.Schema.Types.Mixed,
    risk_level: String,
    recommendations: [String]
  },
  
  // Test Type
  testType: {
    type: String,
    enum: ['hybrid', 'individual', 'multiclass'],
    default: 'hybrid'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
testSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Test', testSchema);
