const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const agentRoutes = require('./routes/agentRoutes');
const callTypeRoutes = require('./routes/callTypeRoutes');
const transcriptRoutes = require('./routes/transcriptRoutes');
const masterAdminRoutes = require('./routes/masterAdminRoutes');
const organizationRoutes = require('./routes/organizationRoutes');

// Use all route files
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/agents', agentRoutes);
router.use('/call-types', callTypeRoutes);
router.use('/transcripts', transcriptRoutes);
router.use('/master-admin', masterAdminRoutes);
router.use('/organizations', organizationRoutes);

module.exports = router; 