const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const { authenticateJWT, tenantIsolation, handleOrganizationContext } = require('../middleware/authMiddleware');

// Add logging middleware to debug request context
router.use((req, res, next) => {
  console.log('Transcript API Request:');
  console.log('- Path:', req.path);
  console.log('- Method:', req.method);
  console.log('- Headers:', JSON.stringify({
    'authorization': req.headers.authorization ? 'Bearer [redacted]' : 'none',
    'x-organization-id': req.headers['x-organization-id'] || 'none',
    'x-organization-name': req.headers['x-organization-name'] || 'none',
    'x-organization-is-master': req.headers['x-organization-is-master'] || 'none'
  }));
  next();
});

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