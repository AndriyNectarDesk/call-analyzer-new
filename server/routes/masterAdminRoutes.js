const express = require('express');
const router = express.Router();
const masterAdminController = require('../controllers/masterAdminController');
const organizationController = require('../controllers/organizationController');
const { authenticateJWT, isMasterAdmin } = require('../middleware/authMiddleware');

// Apply authentication and master admin check to all routes
router.use(authenticateJWT, isMasterAdmin);

// Organization management routes
router.get('/organizations', masterAdminController.getAllOrganizations);
router.post('/organizations', organizationController.createOrganization);
router.get('/organizations/:id', masterAdminController.getOrganizationDetails);
router.put('/organizations/:id/subscription', masterAdminController.updateOrganizationSubscription);
router.put('/organizations/:id/features', masterAdminController.updateOrganizationFeatures);
router.put('/organizations/:id/status', masterAdminController.updateOrganizationStatus);
router.get('/organizations/:id/stats', masterAdminController.getOrganizationStats);

// User management routes
router.post('/organizations/:id/users', masterAdminController.createOrganizationUser);
router.get('/organizations/:id/users/:userId', masterAdminController.getOrganizationUser);
router.put('/organizations/:id/users/:userId', masterAdminController.updateOrganizationUser);
router.post('/organizations/:id/users/:userId/reset-password', masterAdminController.resetUserPassword);

// Master Admin user management routes
router.get('/master-admins', masterAdminController.getAllMasterAdmins);
router.post('/master-admins', masterAdminController.createMasterAdminUser);
router.put('/master-admins/:id', masterAdminController.updateMasterAdmin);
router.post('/master-admins/:id/reset-password', masterAdminController.resetMasterAdminPassword);
router.delete('/master-admins/:id', masterAdminController.deleteMasterAdmin);

module.exports = router; 