const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const { authenticateJWT, tenantIsolation, handleOrganizationContext } = require('../middleware/authMiddleware');
const Transcript = require('../models/transcript');
const mongoose = require('mongoose');

// All routes require authentication
router.use(authenticateJWT);

// Add organization context handling middleware
router.use(handleOrganizationContext);

// Add tenant isolation middleware
router.use(tenantIsolation);

// Add test endpoint for debugging
router.get('/debug/agent/:agentId', async (req, res) => {
  try {
    const agentId = req.params.agentId;
    
    // Validate agent ID
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid agent ID format' });
    }
    
    // Count transcripts with this agent ID
    const count = await Transcript.countDocuments({ agentId });
    
    // Get one example transcript
    const sampleTranscript = await Transcript.findOne({ agentId })
      .select('_id createdAt callType agentId organizationId')
      .populate('agentId', 'firstName lastName')
      .limit(1);
    
    res.json({
      agentId,
      transcriptCount: count,
      sample: sampleTranscript,
      message: count > 0 ? 'Transcripts found for this agent' : 'No transcripts found for this agent'
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ message: 'Error in debug endpoint', error: error.message });
  }
});

// Get all transcripts with pagination and filtering
router.get('/', transcriptController.getAllTranscripts);

// Get transcript analytics 
router.get('/analytics/summary', transcriptController.getTranscriptAnalytics);

// Get transcripts by agent ID
router.get('/agent/:agentId', transcriptController.getTranscriptsByAgent);

// Get a single transcript by ID
router.get('/:id', transcriptController.getTranscript);

// Create a new transcript from raw text
router.post('/', transcriptController.createTranscript);

// Delete a transcript
router.delete('/:id', transcriptController.deleteTranscript);

module.exports = router; 