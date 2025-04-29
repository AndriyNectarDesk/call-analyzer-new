const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticateJWT, tenantIsolation, handleOrganizationContext } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateJWT);

// Add organization context handling middleware
router.use(handleOrganizationContext);

// Add tenant isolation middleware
router.use(tenantIsolation);

// Get all agents with pagination and filtering
router.get('/', agentController.getAllAgents);

// Get a single agent by ID
router.get('/:id', agentController.getAgent);

// Create a new agent
router.post('/', agentController.createAgent);

// Update an agent
router.put('/:id', agentController.updateAgent);

// Delete an agent
router.delete('/:id', agentController.deleteAgent);

// Get performance trends for an agent
router.get('/:id/performance-trends', agentController.getAgentPerformanceTrends);

module.exports = router; 