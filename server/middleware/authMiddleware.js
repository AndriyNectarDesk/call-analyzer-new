const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Organization = require('../models/organization');

// Verify JWT token and add user to request
exports.authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify API key
exports.authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Access denied. No API key provided' });
  }
  
  try {
    // Find organization with matching API key
    const organization = await Organization.findOne({
      'apiKeys.key': apiKey,
      active: true
    }).exec();
    
    if (!organization) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Add organization info to request
    req.organization = {
      id: organization._id,
      name: organization.name,
      code: organization.code
    };
    
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check if user is a master admin
exports.isMasterAdmin = (req, res, next) => {
  if (!req.user || !req.user.isMasterAdmin) {
    return res.status(403).json({ error: 'Access denied. Master admin privileges required' });
  }
  
  next();
};

// Check if user is organization admin
exports.isOrgAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && !req.user.isMasterAdmin)) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required' });
  }
  
  next();
};

// Verify user belongs to organization
exports.belongsToOrganization = (req, res, next) => {
  // Skip check for master admins
  if (req.user.isMasterAdmin) {
    return next();
  }
  
  const orgId = req.params.organizationId || req.body.organizationId;
  
  if (!orgId || req.user.organizationId.toString() !== orgId) {
    return res.status(403).json({ error: 'Access denied. You do not belong to this organization' });
  }
  
  next();
};

// Tenant isolation middleware - adds organizationId filter to all queries
exports.tenantIsolation = (req, res, next) => {
  // Skip isolation for master admins in master admin routes
  if (req.path.startsWith('/api/admin') && req.user.isMasterAdmin) {
    return next();
  }
  
  // Get organization ID from user token or API key authentication
  const organizationId = req.user ? req.user.organizationId : 
                       (req.organization ? req.organization.id : null);
  
  if (!organizationId) {
    return res.status(403).json({ error: 'Organization context not found' });
  }
  
  // Add organization context to request for use in controllers
  req.tenantId = organizationId;
  
  next();
}; 