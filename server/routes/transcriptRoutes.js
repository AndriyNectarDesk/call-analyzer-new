const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const { authenticateJWT, tenantIsolation, handleOrganizationContext } = require('../middleware/authMiddleware');

// Enhanced logging middleware for transcript routes
router.use((req, res, next) => {
  console.log('=============================================');
  console.log('Transcript API Request Debug:');
  console.log('- Path:', req.path);
  console.log('- Method:', req.method);
  console.log('- Query Params:', JSON.stringify(req.query));
  console.log('- Headers:', JSON.stringify({
    'authorization': req.headers.authorization ? 'Bearer [redacted]' : 'none',
    'x-organization-id': req.headers['x-organization-id'] || 'none',
    'x-organization-name': req.headers['x-organization-name'] || 'none',
    'x-organization-is-master': req.headers['x-organization-is-master'] || 'none'
  }));
  console.log('- User:', req.user ? `ID: ${req.user.userId}, Org: ${req.user.organizationId}, IsMaster: ${req.user.isMasterAdmin}` : 'Not authenticated yet');
  
  // Capture and log the response
  const originalSend = res.send;
  res.send = function(body) {
    try {
      const isJSON = typeof body === 'string' && (body.startsWith('{') || body.startsWith('['));
      if (isJSON) {
        const parsed = JSON.parse(body);
        console.log('Response data structure:', Object.keys(parsed));
        if (parsed.transcripts) {
          console.log(`Response contains ${parsed.transcripts.length} transcripts`);
        } else {
          console.log('Response does not contain transcripts array');
        }
      } else {
        console.log('Response is not JSON, length:', body?.length || 0);
        if (body && body.length < 200) {
          console.log('Response preview:', body);
        }
      }
    } catch (e) {
      console.log('Error parsing response:', e.message);
    }
    return originalSend.call(this, body);
  };
  
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