const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Organization = require('../models/organization');

// Verify JWT token and add user to request
exports.authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.error('Authentication failed: No authorization header');
    return res.status(401).json({ error: 'Access denied. No token provided' });
  }
  
  // Check if header has correct format
  if (!authHeader.startsWith('Bearer ')) {
    console.error('Authentication failed: Invalid authorization header format');
    return res.status(401).json({ error: 'Invalid authorization format. Use Bearer token' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    console.error('Authentication failed: Empty token');
    return res.status(401).json({ error: 'Empty token provided' });
  }
  
  // Log token details for debugging (in development only)
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('JWT header:', header);
      console.log('JWT payload:', payload);
    }
  } catch (decodeErr) {
    console.error('Error decoding token for debug:', decodeErr);
  }
  
  try {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    console.log('Verifying token with secret:', jwtSecret ? 'Secret is defined' : 'Secret is MISSING');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Token successfully verified for user:', decoded.userId);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.name, error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify API key
exports.authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  console.log('Authenticating API key request, key provided:', apiKey ? 'Yes' : 'No');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Access denied. No API key provided' });
  }

  try {
    console.log('Validating API key:', apiKey.substring(0, 8) + '...');
    
    // First, check if the key format is valid - should be in format prefix_key
    const keyParts = apiKey.split('_');
    if (keyParts.length < 2) {
      console.error('Invalid API key format - missing prefix/key separator');
      return res.status(401).json({ error: 'Invalid API key format' });
    }
    
    const prefix = keyParts[0];
    const key = keyParts.slice(1).join('_'); // In case there are more underscores in the key part
    
    console.log('API key prefix:', prefix);
    
    let organization;
    
    // Try to find organization with matching inline apiKeys array first
    organization = await Organization.findOne({
      'apiKeys.key': key,
      'apiKeys.isActive': true,
      active: true
    }).exec();
    
    // If not found in organization.apiKeys, check the ApiKey model
    if (!organization) {
      console.log('Key not found in organization.apiKeys, checking ApiKey model...');
      
      const ApiKey = require('../models/ApiKey');
      const apiKeyRecord = await ApiKey.findOne({
        prefix: prefix,
        key: key,
        isActive: true
      }).exec();
      
      if (apiKeyRecord) {
        console.log('Found valid API key in ApiKey model with prefix:', prefix);
        
        // Get the organization associated with this key
        organization = await Organization.findOne({
          _id: apiKeyRecord.organizationId,
          active: true
        }).exec();
        
        if (!organization) {
          console.error('API key exists but organization not found or inactive');
        } else {
          console.log('Found organization:', organization.name);
        }
      } else {
        console.error('API key not found in ApiKey model');
      }
    } else {
      console.log('Found valid API key in organization.apiKeys for organization:', organization.name);
    }
    
    if (!organization) {
      console.error('Invalid API key - organization not found');
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Add organization info to request
    req.organization = {
      id: organization._id,
      name: organization.name,
      code: organization.code
    };
    
    console.log('API key validation successful for organization:', organization.name);
    
    // Update last used timestamp
    try {
      const ApiKey = require('../models/ApiKey');
      await ApiKey.findOneAndUpdate(
        { prefix: prefix, key: key },
        { $set: { lastUsed: new Date() } }
      );
    } catch (updateErr) {
      console.error('Failed to update API key last used timestamp:', updateErr);
      // Continue anyway - this is not critical
    }
    
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    console.error(error.stack);
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