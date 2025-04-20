const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const { authenticateJWT, tenantIsolation, handleOrganizationContext } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateJWT);

// Add organization context handling middleware
router.use(handleOrganizationContext);

// Add tenant isolation middleware
router.use(tenantIsolation);

// Get all transcripts with pagination and filtering
router.get('/', transcriptController.getAllTranscripts);

// Get transcript analytics 
router.get('/analytics/summary', transcriptController.getTranscriptAnalytics);

// Get a single transcript by ID
router.get('/:id', transcriptController.getTranscript);

// Create a new transcript from raw text
router.post('/', transcriptController.createTranscript);

// Delete a transcript
router.delete('/:id', transcriptController.deleteTranscript);

module.exports = router; 