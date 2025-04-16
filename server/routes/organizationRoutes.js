const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateJWT, isMasterAdmin, isOrgAdmin, belongsToOrganization, tenantIsolation, handleOrganizationContext } = require('../middleware/authMiddleware');

// Add tenant isolation middleware to all non-master admin routes
const orgRoutes = express.Router();
orgRoutes.use(tenantIsolation);

// Master admin only routes
router.get('/all', authenticateJWT, isMasterAdmin, organizationController.getAllOrganizations);
router.post('/', authenticateJWT, isMasterAdmin, organizationController.createOrganization);

// API key management routes (these need to come BEFORE the /:id routes)
router.get('/api-key', authenticateJWT, handleOrganizationContext, tenantIsolation, organizationController.getCurrentApiKey);
router.post('/api-key', authenticateJWT, isOrgAdmin, tenantIsolation, organizationController.generateApiKey);

// Organization specific routes (require authentication)
router.get('/:id', authenticateJWT, belongsToOrganization, tenantIsolation, organizationController.getOrganization);
router.put('/:id', authenticateJWT, isOrgAdmin, belongsToOrganization, tenantIsolation, organizationController.updateOrganization);
router.delete('/:id', authenticateJWT, isMasterAdmin, organizationController.deactivateOrganization);

// API key management for specific organizations
router.get('/:id/api-key', authenticateJWT, handleOrganizationContext, organizationController.getOrganizationApiKey);
router.post('/:id/api-keys', authenticateJWT, isOrgAdmin, belongsToOrganization, tenantIsolation, organizationController.generateApiKey);
router.delete('/:id/api-keys/:keyId', authenticateJWT, isOrgAdmin, belongsToOrganization, tenantIsolation, organizationController.deleteApiKey);

// Organization stats
router.get('/:id/stats', authenticateJWT, isOrgAdmin, belongsToOrganization, tenantIsolation, organizationController.getOrganizationStats);

module.exports = router; 