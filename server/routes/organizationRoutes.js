const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateJWT, isMasterAdmin, isOrgAdmin, belongsToOrganization } = require('../middleware/authMiddleware');

// Master admin only routes
router.get('/all', authenticateJWT, isMasterAdmin, organizationController.getAllOrganizations);
router.post('/', authenticateJWT, isMasterAdmin, organizationController.createOrganization);

// Organization specific routes (require authentication)
router.get('/:id', authenticateJWT, belongsToOrganization, organizationController.getOrganization);
router.put('/:id', authenticateJWT, isOrgAdmin, belongsToOrganization, organizationController.updateOrganization);
router.delete('/:id', authenticateJWT, isMasterAdmin, organizationController.deactivateOrganization);

// API key management
router.post('/:id/api-keys', authenticateJWT, isOrgAdmin, belongsToOrganization, organizationController.generateApiKey);
router.delete('/:id/api-keys/:keyId', authenticateJWT, isOrgAdmin, belongsToOrganization, organizationController.deleteApiKey);
router.get('/api-key', authenticateJWT, organizationController.getCurrentApiKey);
router.post('/api-key', authenticateJWT, isOrgAdmin, organizationController.generateApiKey);

// Organization stats
router.get('/:id/stats', authenticateJWT, isOrgAdmin, belongsToOrganization, organizationController.getOrganizationStats);

module.exports = router; 