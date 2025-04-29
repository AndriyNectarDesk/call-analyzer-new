const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateJWT, isMasterAdmin, isOrgAdmin, belongsToOrganization, tenantIsolation, handleOrganizationContext } = require('../middleware/authMiddleware');

// Add tenant isolation middleware to all non-master admin routes
const orgRoutes = express.Router();
orgRoutes.use(tenantIsolation);

// Root route to get all organizations
router.get('/', authenticateJWT, async (req, res) => {
  try {
    console.log('GET /api/organizations called by user:', req.user.userId);
    
    const Organization = require('../models/organization');
    
    // If user is master admin, return all organizations
    if (req.user.isMasterAdmin) {
      console.log('Master admin requesting all organizations');
      const organizations = await Organization.find()
        .select('_id name code isMaster')
        .lean();
      
      console.log(`Found ${organizations.length} organizations`);
      
      // Add 'id' field for compatibility
      const orgsWithId = organizations.map(org => ({
        ...org,
        id: org._id
      }));
      
      return res.json({ organizations: orgsWithId });
    }
    
    // For regular users, just return their own organization
    if (req.user.organizationId) {
      console.log('Regular user requesting their organization:', req.user.organizationId);
      const organization = await Organization.findById(req.user.organizationId)
        .select('_id name code isMaster')
        .lean();
      
      if (organization) {
        // Add 'id' field for compatibility
        organization.id = organization._id;
        return res.json({ organizations: [organization] });
      }
    }
    
    // No organizations found
    console.log('No organizations found for user:', req.user.userId);
    return res.json({ organizations: [] });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Master admin only routes
router.get('/all', authenticateJWT, isMasterAdmin, organizationController.getAllOrganizations);
router.post('/', authenticateJWT, isMasterAdmin, organizationController.createOrganization);

// API key management routes (these need to come BEFORE the /:id routes)
router.get('/api-key', authenticateJWT, handleOrganizationContext, tenantIsolation, organizationController.getCurrentApiKey);
router.post('/api-key', authenticateJWT, isOrgAdmin, tenantIsolation, organizationController.generateApiKey);

// New route for getting an organization's API key via query parameter
// This is used in Only Blooms mode to avoid path parameter conflicts
router.get('/api-key-by-query', authenticateJWT, handleOrganizationContext, organizationController.getApiKeyByQuery);

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