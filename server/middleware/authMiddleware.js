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
    
    // The API key format appears to be prefix_part1_part2...
    // For example: ca_d2e9f5a7_2edaea7fa0ee15d47b95835702a5951ea890b6c3ac64438c92fa4065d649204b
    // Where ca_d2e9f5a7 is the prefix and the rest is the key
    
    // First check if the key starts with 'ca_' which is our expected prefix format
    if (!apiKey.startsWith('ca_')) {
      console.error('Invalid API key format - should start with ca_');
      return res.status(401).json({ error: 'Invalid API key format' });
    }
    
    // Extract the prefix (ca_XXXXXXXX) and the rest of the key
    const parts = apiKey.split('_');
    if (parts.length < 3) {
      console.error('Invalid API key format - not enough parts');
      return res.status(401).json({ error: 'Invalid API key format' });
    }
    
    // The prefix is ca_XXXXXXXX (first two parts)
    const prefix = `${parts[0]}_${parts[1]}`;
    // The key is everything after the prefix
    const key = parts.slice(2).join('_');
    
    console.log('API key parsed - prefix:', prefix, 'key length:', key.length);
    
    let organization;
    let apiKeyRecord;
    
    // Try to find the API key in the ApiKey model
    try {
      const ApiKey = require('../models/ApiKey');
      
      // First try exact prefix match
      apiKeyRecord = await ApiKey.findOne({
        prefix: prefix,
        isActive: true
      }).exec();
      
      if (apiKeyRecord) {
        console.log('Found API key with prefix:', prefix);
        
        // Verify the key matches
        if (apiKeyRecord.key === key) {
          console.log('API key validated successfully');
          // Get the organization associated with this key
          organization = await Organization.findOne({
            _id: apiKeyRecord.organizationId,
            active: true
          }).exec();
        } else {
          console.error('API key found but key part does not match');
        }
      } else {
        // Try flexible lookup approach in case the prefix_key format has changed
        console.log('API key not found with exact prefix, trying flexible lookup...');
        
        // Get all active API keys and manually check
        const allActiveKeys = await ApiKey.find({ isActive: true }).exec();
        console.log(`Checking against ${allActiveKeys.length} active API keys`);
        
        for (const keyRecord of allActiveKeys) {
          const fullKey = `${keyRecord.prefix}_${keyRecord.key}`;
          if (apiKey === fullKey) {
            console.log('Found matching API key with different format');
            apiKeyRecord = keyRecord;
            
            // Get the organization
            organization = await Organization.findOne({
              _id: keyRecord.organizationId,
              active: true
            }).exec();
            
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error looking up API key:', err);
    }
    
    // If not found in ApiKey model, try the inline organization.apiKeys as fallback
    if (!organization) {
      console.log('API key not found in ApiKey model, checking organization.apiKeys...');
      
      // Try to find organization with this key in the inline apiKeys array
      organization = await Organization.findOne({
        'apiKeys.key': key,
        'apiKeys.isActive': true,
        active: true
      }).exec();
      
      if (organization) {
        console.log('Found valid API key in organization.apiKeys for organization:', organization.name);
      }
    } else {
      console.log('Found organization:', organization.name);
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
    
    // Update last used timestamp if we have an apiKeyRecord
    if (apiKeyRecord) {
      try {
        apiKeyRecord.lastUsed = new Date();
        await apiKeyRecord.save();
        console.log('Updated API key last used timestamp');
      } catch (updateErr) {
        console.error('Failed to update API key last used timestamp:', updateErr);
        // Continue anyway - this is not critical
      }
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

// New middleware to handle organization context switching
exports.organizationContextMiddleware = async (req, res, next) => {
  try {
    // Skip if user is not authenticated
    if (!req.user) {
      console.log('[Organization Context] No user found in request, skipping organization context');
      return next();
    }

    const requestedOrgId = req.headers['x-organization-id'] || req.cookies['organization_id'];
    
    if (requestedOrgId) {
      console.log(`[Organization Context] Override requested for org ID: ${requestedOrgId}`);
      
      // Check if user has permission to access this organization
      if (req.user.role === 'master_admin') {
        console.log('[Organization Context] User is master admin, allowing override');
        req.organizationId = requestedOrgId;
      } else if (req.user.organizationId === requestedOrgId) {
        console.log('[Organization Context] Organization matches user organization, allowing access');
        req.organizationId = requestedOrgId;
      } else {
        console.log(`[Organization Context] User does not have permission to access org ${requestedOrgId}`);
        // Use the user's assigned organization instead
        req.organizationId = req.user.organizationId;
      }
    } else {
      // Use the user's assigned organization
      console.log(`[Organization Context] Using user's assigned organization: ${req.user.organizationId}`);
      req.organizationId = req.user.organizationId;
    }
    
    // Log the final organization context
    console.log(`[Organization Context] Set to: ${req.organizationId}`);
  } catch (error) {
    // Log the error but don't block the request
    console.error('[Organization Context] Error setting organization context:', error);
  }
  
  // Always continue to the next middleware
  next();
};

// Tenant isolation middleware - adds organizationId filter to all queries
exports.tenantIsolation = (req, res, next) => {
  // Skip isolation for master admins in master admin routes
  if (req.path.startsWith('/api/admin') && req.user.isMasterAdmin) {
    return next();
  }
  
  // Get the appropriate organization ID
  // First check for overridden organization (from handleOrganizationContext middleware)
  if (req.overrideOrganizationId) {
    req.tenantId = req.overrideOrganizationId;
    console.log(`Tenant isolation using overridden organization: ${req.overrideOrganizationName} (${req.tenantId})`);
    return next();
  }
  
  // Fall back to user's organization from JWT
  if (req.user && req.user.organizationId) {
    req.tenantId = req.user.organizationId;
    console.log(`Tenant isolation using user organization: ${req.tenantId}`);
    return next();
  }
  
  // If no organization found, deny access
  return res.status(403).json({ error: 'Access denied. No organization context found' });
};

// Handle organization context for API key and other organization-specific routes
exports.handleOrganizationContext = async (req, res, next) => {
  try {
    // If there's an organization ID in the URL params, use that
    if (req.params.id) {
      req.overrideOrganizationId = req.params.id;
      console.log(`Setting organization context from URL param: ${req.overrideOrganizationId}`);
    } 
    // If there's an organization ID in the query params, use that
    else if (req.query.organizationId) {
      req.overrideOrganizationId = req.query.organizationId;
      console.log(`Setting organization context from query param: ${req.overrideOrganizationId}`);
    }
    // Otherwise, use the user's organization from JWT
    else if (req.user && req.user.organizationId) {
      req.overrideOrganizationId = req.user.organizationId;
      console.log(`Setting organization context from user JWT: ${req.overrideOrganizationId}`);
    }
    
    // If we have an organization ID, try to get the organization name
    if (req.overrideOrganizationId) {
      const Organization = require('../models/organization');
      const organization = await Organization.findById(req.overrideOrganizationId);
      if (organization) {
        req.overrideOrganizationName = organization.name;
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in handleOrganizationContext middleware:', error);
    next(error);
  }
};

// Add verifyToken as an alias for authenticateJWT for backward compatibility
exports.verifyToken = exports.authenticateJWT;

// Add requireMasterAdmin as an alias for isMasterAdmin for backward compatibility 