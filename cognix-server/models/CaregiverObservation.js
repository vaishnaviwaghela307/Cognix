const mongoose = require('mongoose');

const caregiverObservationSchema = new mongoose.Schema({
  patientId: {
    type: String, // Clerk ID of the patient
    required: true,
    index: true
  },
  caregiverId: {
    type: String, // Clerk ID of the caregiver
    required: true,
    index: true
  },
  observations: {
    forgetfulness: {
      type: Number, // 0-5 scale or similar
      default: 0
    },
    wandering: {
      type: Number,
      default: 0
    },
    moodSwings: {
      type: Number,
      default: 0
    },
    aggression: {
      type: Number,
      default: 0
    },
    confusion: {
      type: Number,
      default: 0
    }
  },
  notes: String,
  structuredSignals: {
    type: mongoose.Schema.Types.Mixed, // Populated by AI
  },
  observationDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CaregiverObservation', caregiverObservationSchema);
