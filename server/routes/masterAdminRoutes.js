const express = require('express');
const router = express.Router();
const masterAdminController = require('../controllers/masterAdminController');
const { authenticateJWT, isMasterAdmin } = require('../middleware/authMiddleware');

// Apply authentication and master admin check to all routes
router.use(authenticateJWT, isMasterAdmin);

// Organization management routes
router.get('/organizations', masterAdminController.getAllOrganizations);
router.get('/organizations/:id', masterAdminController.getOrganizationDetails);
router.put('/organizations/:id/subscription', masterAdminController.updateOrganizationSubscription);
router.put('/organizations/:id/features', masterAdminController.updateOrganizationFeatures);
router.get('/organizations/:id/stats', masterAdminController.getOrganizationStats);

// User management routes
router.post('/organizations/:id/users', masterAdminController.createOrganizationUser);
router.put('/organizations/:id/users/:userId', masterAdminController.updateOrganizationUser);

module.exports = router; 