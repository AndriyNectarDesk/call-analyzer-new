const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const { authenticateJWT, tenantIsolation } = require('../middleware/authMiddleware');

// All routes require authentication and tenant isolation
router.use(authenticateJWT);
router.use(tenantIsolation);

// Get all transcripts with pagination and filtering
router.get('/', transcriptController.getAllTranscripts);

// Get a single transcript by ID
router.get('/:id', transcriptController.getTranscript);

// Create a new transcript from raw text
router.post('/', transcriptController.createTranscript);

// Get transcript analytics 
router.get('/analytics/summary', transcriptController.getTranscriptAnalytics);

// Delete a transcript
router.delete('/:id', transcriptController.deleteTranscript);

module.exports = router; 