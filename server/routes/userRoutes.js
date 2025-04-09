const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT, isOrgAdmin, isMasterAdmin, belongsToOrganization } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateJWT);

// Get all users (admin only)
router.get('/', isOrgAdmin, userController.getAllUsers);

// Get users for an organization
router.get('/organization/:organizationId', belongsToOrganization, userController.getOrganizationUsers);

// Get a single user
router.get('/:id', userController.getUser);

// Create a new user (admin only)
router.post('/', isOrgAdmin, userController.createUser);

// Update a user
router.put('/:id', userController.updateUser);

// Delete a user (admin only)
router.delete('/:id', isOrgAdmin, userController.deleteUser);

module.exports = router; 