const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiverController');

// Link caregiver to patient
router.post('/link', caregiverController.linkCaregiver.bind(caregiverController));

// Log observation
router.post('/observation', caregiverController.logObservation.bind(caregiverController));

// Get patients for a caregiver
router.get('/patients/:caregiverId', caregiverController.getPatients.bind(caregiverController));

// Get observations for a patient
router.get('/observations/:patientId', caregiverController.getObservations.bind(caregiverController));

module.exports = router;
