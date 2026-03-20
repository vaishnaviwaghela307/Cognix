const User = require('../models/User');
const CaregiverObservation = require('../models/CaregiverObservation');
const axios = require('axios');

class CaregiverController {
  /**
   * @route POST /api/caregiver/link
   * @desc Link a caregiver to a patient
   */
  async linkCaregiver(req, res) {
    try {
      const { patientId, caregiverEmail } = req.body;

      if (!caregiverEmail || !caregiverEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address.'
        });
      }

      // Find patient
      const patient = await User.findOne({ clerkId: patientId });
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found.'
        });
      }

      // Check if this email is already linked
      const existingEmail = patient.caregiverEmails?.find(c => c.email === caregiverEmail);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'This caregiver email is already linked to your account.'
        });
      }

      // Try to find if this is a registered user
      const caregiver = await User.findOne({ email: caregiverEmail });
      
      if (caregiver) {
        // Registered user - link by clerkId
        if (!patient.caregivers.includes(caregiver.clerkId)) {
          patient.caregivers.push(caregiver.clerkId);
          if (!caregiver.patients.includes(patient.clerkId)) {
            caregiver.patients.push(patient.clerkId);
            await caregiver.save();
          }
        }
      }

      // Always add to caregiverEmails for email notifications
      if (!patient.caregiverEmails) {
        patient.caregiverEmails = [];
      }
      
      patient.caregiverEmails.push({
        email: caregiverEmail,
        name: caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : caregiverEmail.split('@')[0],
        addedAt: new Date()
      });

      await patient.save();

      res.json({
        success: true,
        message: 'Caregiver email added successfully. They will receive reports via email.',
        caregiver: {
          email: caregiverEmail,
          name: caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : caregiverEmail.split('@')[0],
          isRegistered: !!caregiver
        }
      });
    } catch (error) {
      console.error('CaregiverController.linkCaregiver error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route POST /api/caregiver/observation
   * @desc Log a daily observation
   */
  async logObservation(req, res) {
    try {
      const { caregiverId, patientId, observations, notes } = req.body;

      const observation = new CaregiverObservation({
        caregiverId,
        patientId,
        observations,
        notes
      });

      await observation.save();

      // Trigger AI processing in Flask server
      try {
        const flaskResponse = await axios.post(`${process.env.FLASK_SERVER_URL}/api/process-caregiver-observation`, {
          observationId: observation._id,
          observations,
          notes
        });

        if (flaskResponse.data.success) {
          observation.structuredSignals = flaskResponse.data.structuredSignals;
          await observation.save();
        }
      } catch (aiError) {
        console.error('AI processing of observation failed:', aiError.message);
        // We still saved the observation, just without structured signals for now
      }

      res.status(201).json({
        success: true,
        message: 'Observation logged successfully',
        observation
      });
    } catch (error) {
      console.error('CaregiverController.logObservation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/caregiver/patients/:caregiverId
   * @desc Get all patients for a caregiver
   */
  async getPatients(req, res) {
    try {
      const { caregiverId } = req.params;
      const caregiver = await User.findOne({ clerkId: caregiverId });
      
      if (!caregiver) {
        return res.status(404).json({ success: false, error: 'Caregiver not found' });
      }

      const patients = await User.find({ clerkId: { $in: caregiver.patients } });

      res.json({
        success: true,
        patients: patients.map(p => ({
          clerkId: p.clerkId,
          fullName: p.fullName || `${p.firstName} ${p.lastName}`,
          email: p.email,
          profileImageUrl: p.profileImageUrl
        }))
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * @route GET /api/caregiver/observations/:patientId
   * @desc Get observations for a patient
   */
  async getObservations(req, res) {
    try {
      const { patientId } = req.params;
      const observations = await CaregiverObservation.find({ patientId }).sort({ observationDate: -1 });

      res.json({
        success: true,
        observations
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new CaregiverController();
