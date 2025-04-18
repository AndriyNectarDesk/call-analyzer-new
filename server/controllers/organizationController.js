const Organization = require('../models/organization');
const ApiKey = require('../models/ApiKey');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/user');
const Transcript = require('../models/transcript');

// Helper to generate API key
const generateApiKey = () => {
  return crypto.randomBytes(24).toString('hex');
};

// Get all organizations (master admin only)
exports.getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({ isActive: true }).select('-apiKeys');
    res.json(organizations);
  } catch (error) {
    console.error('Error getting organizations:', error);
    res.status(500).json({ message: 'Failed to retrieve organizations' });
  }
};

// Get single organization
exports.getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findOne({ 
      _id: req.params.id,
      isActive: true
    }).select('-apiKeys.secret');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error getting organization:', error);
    res.status(500).json({ message: 'Failed to retrieve organization' });
  }
};

// Create new organization
exports.createOrganization = async (req, res) => {
  try {
    const { name, code, description, contactEmail, active, subscriptionTier, features } = req.body;
    
    // Validate input
    if (!name || !code || !contactEmail) {
      return res.status(400).json({ message: 'Organization name, code, and contact email are required' });
    }
    
    // Check if organization with same name exists
    const existingOrg = await Organization.findOne({ 
      $or: [
        { name, active: true },
        { code, active: true }
      ]
    });
    
    if (existingOrg) {
      if (existingOrg.name === name) {
        return res.status(400).json({ message: 'An organization with this name already exists' });
      }
      if (existingOrg.code === code) {
        return res.status(400).json({ message: 'An organization with this code already exists' });
      }
    }
    
    const newOrganization = new Organization({
      name,
      code,
      description,
      contactEmail,
      active: active !== undefined ? active : true,
      subscriptionTier: subscriptionTier || 'free',
      features: features || undefined,
      createdBy: req.user.userId || req.user.id
    });
    
    await newOrganization.save();
    res.status(201).json(newOrganization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: error.message || 'Failed to create organization' });
  }
};

// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const { name, code, description, contactEmail, active } = req.body;
    
    // Check if name is being changed and if it conflicts
    if (name) {
      const existingOrg = await Organization.findOne({ 
        name, 
        _id: { $ne: req.params.id },
        active: true 
      });
      
      if (existingOrg) {
        return res.status(400).json({ message: 'An organization with this name already exists' });
      }
    }
    
    // Build the update object with only the fields that were provided
    const updateFields = { updatedAt: Date.now() };
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (contactEmail) updateFields.contactEmail = contactEmail;
    if (active !== undefined) updateFields.active = active;
    if (req.user.id) updateFields.updatedBy = req.user.id;
    
    console.log('Updating organization with fields:', updateFields);
    
    const updatedOrganization = await Organization.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-apiKeys.secret');
    
    if (!updatedOrganization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(updatedOrganization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ message: error.message || 'Failed to update organization' });
  }
};

// Deactivate organization (soft delete)
exports.deactivateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          active: false,
          deactivatedAt: Date.now(),
          deactivatedBy: req.user.id
        }
      },
      { new: true }
    );
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Deactivate all API keys for this organization
    await ApiKey.updateMany(
      { organizationId: req.params.id },
      { $set: { isActive: false } }
    );
    
    res.json({ message: 'Organization deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating organization:', error);
    res.status(500).json({ message: 'Failed to deactivate organization' });
  }
};

// Generate API key for organization
exports.generateApiKey = async (req, res) => {
  try {
    // Check if crypto module is available
    const crypto = require('crypto');
    if (!crypto) {
      console.error('Crypto module not available');
      return res.status(500).json({ message: 'Crypto module not available for key generation' });
    }
    
    // Get organization ID either from params or user object
    const organizationId = req.params.id || req.user.organizationId;
    console.log('Generating API key for organization:', organizationId);
    
    if (!organizationId) {
      console.error('No organization ID provided in params or user object');
      return res.status(400).json({ message: 'Organization ID is required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }
    
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    console.log('Looking for organization with ID:', orgObjectId.toString());
    
    // Check if organization exists
    const organization = await Organization.findOne({ 
      _id: orgObjectId
    });
    
    if (!organization) {
      console.error('Organization not found for ID:', organizationId);
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    console.log('Found organization:', organization.name);
    
    // Generate API key
    const keyValue = crypto.randomBytes(32).toString('hex');
    const keyPrefix = 'ca_' + crypto.randomBytes(4).toString('hex');
    const fullKeyFormat = `${keyPrefix}_${keyValue}`; // Store the full format for logging
    
    console.log('Generated new API key with prefix:', keyPrefix);
    
    // Create API key record
    const keyName = req.body.name || `API Key - ${new Date().toLocaleDateString()}`;
    console.log('Creating API key with name:', keyName);
    
    const newApiKey = new ApiKey({
      prefix: keyPrefix,
      key: keyValue,
      name: keyName,
      organizationId: orgObjectId,
      createdBy: req.user.userId
    });
    
    await newApiKey.save();
    console.log('API key saved successfully');
    
    // Return key (full value) only once
    res.status(201).json({
      id: newApiKey._id,
      name: newApiKey.name,
      prefix: newApiKey.prefix,
      key: fullKeyFormat, // Return full key only on creation
      createdAt: newApiKey.createdAt
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ message: 'Failed to generate API key: ' + error.message });
  }
};

// Delete API key
exports.deleteApiKey = async (req, res) => {
  try {
    const { id: organizationId, keyId } = req.params;
    
    const apiKey = await ApiKey.findOneAndUpdate(
      { 
        _id: keyId,
        organizationId,
        isActive: true
      },
      {
        $set: {
          isActive: false,
          deactivatedAt: Date.now(),
          deactivatedBy: req.user.id
        }
      }
    );
    
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ message: 'Failed to delete API key' });
  }
};

// Get organization stats
exports.getOrganizationStats = async (req, res) => {
  try {
    const organizationId = req.params.id;
    console.log('Getting stats for organization:', organizationId);

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }

    // Check if organization exists
    const organization = await Organization.findOne({ _id: new mongoose.Types.ObjectId(organizationId) });
    console.log('Found organization:', organization ? 'yes' : 'no');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Get active API key count
    const activeApiKeyCount = await ApiKey.countDocuments({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      isActive: true
    });
    console.log('Active API key count:', activeApiKeyCount);

    // Get current transcript count
    const transcriptCount = await Transcript.countDocuments({
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });
    console.log('Transcript count:', transcriptCount);

    // Get current user count
    const userCount = await User.countDocuments({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      isActive: true
    });
    console.log('User count:', userCount);

    const response = {
      activeApiKeyCount,
      currentTranscriptCount: transcriptCount,
      currentUserCount: userCount,
      timestamp: new Date()
    };
    console.log('Organization stats response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error getting organization stats:', error);
    res.status(500).json({ message: 'Error getting organization stats', error: error.message });
  }
};

// Get current API key for organization
exports.getCurrentApiKey = async (req, res) => {
  try {
    console.log('getCurrentApiKey called with user:', JSON.stringify({
      userId: req.user?.userId,
      email: req.user?.email,
      organizationId: req.user?.organizationId,
      isMasterAdmin: req.user?.isMasterAdmin
    }));
    
    if (!req.user) {
      console.error('No user object in request');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const organizationId = req.user.organizationId;
    console.log('Getting API key for organization:', organizationId);
    
    if (!organizationId) {
      console.error('No organizationId found in user object:', req.user);
      return res.status(400).json({ message: 'User not associated with any organization' });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    console.log('Converted to ObjectId:', orgObjectId.toString());

    // Find the most recently created active API key
    console.log('Looking for API key with organizationId:', orgObjectId.toString());
    const apiKey = await ApiKey.findOne({
      organizationId: orgObjectId,
      isActive: true
    }).sort({ createdAt: -1 }).lean(); // Use lean() to get a plain JavaScript object
    
    console.log('API key found:', apiKey ? 'Yes' : 'No');
    
    if (!apiKey) {
      // No active API key found, but instead of error, let's return a clear message
      console.log('No API key found for organization');
      return res.status(404).json({ 
        message: 'No active API key found', 
        organizationId: organizationId,
        needsGeneration: true 
      });
    }

    // Return only the prefix and full key
    const response = {
      id: apiKey._id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: `${apiKey.prefix}_${apiKey.key}`, // Return full key format
      createdAt: apiKey.createdAt,
      lastUsed: apiKey.lastUsed
    };
    
    console.log('Returning API key info:', { ...response, key: `${apiKey.prefix}_******` });
    res.json(response);
  } catch (error) {
    console.error('Error getting API key:', error);
    console.error(error.stack);
    res.status(500).json({ message: 'Failed to retrieve API key: ' + error.message });
  }
};

// Get API key for a specific organization by ID
exports.getOrganizationApiKey = async (req, res) => {
  try {
    // Priority order for organization ID: 
    // 1. Context override (Only Blooms mode)
    // 2. Query parameter (explicit organizationId)
    // 3. URL parameter (/:id)
    let organizationId;
    
    if (req.overrideOrganizationId) {
      // 1. Use context override if available (highest priority)
      console.log(`Organization context override active: Using ${req.overrideOrganizationName} (${req.overrideOrganizationId}) instead of requested ID ${req.params.id}`);
      organizationId = req.overrideOrganizationId;
    } else if (req.query.organizationId) {
      // 2. Use query parameter if available (second priority)
      console.log(`Using explicit organizationId from query parameter: ${req.query.organizationId}`);
      organizationId = req.query.organizationId;
    } else {
      // 3. Fallback to URL parameter (lowest priority)
      console.log('getOrganizationApiKey called for organization ID from URL param:', req.params.id);
      organizationId = req.params.id;
    }
    
    if (!organizationId) {
      console.error('No organization ID provided in request params, query or context');
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    console.log('Looking for API key with organizationId:', orgObjectId.toString());
    
    // Check if organization exists
    const organization = await Organization.findById(orgObjectId);
    if (!organization) {
      console.error(`Organization not found with ID: ${organizationId}`);
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Find the most recently created active API key
    const apiKey = await ApiKey.findOne({
      organizationId: orgObjectId,
      isActive: true
    }).sort({ createdAt: -1 }).lean();
    
    console.log('API key found for organization:', apiKey ? 'Yes' : 'No');
    
    if (!apiKey) {
      console.log(`No active API key found for organization: ${organizationId}`);
      return res.status(404).json({ 
        message: 'No active API key found', 
        organizationId: organizationId,
        needsGeneration: true 
      });
    }

    // Return the API key info
    const response = {
      id: apiKey._id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: `${apiKey.prefix}_${apiKey.key}`, // Return full key format
      createdAt: apiKey.createdAt,
      lastUsed: apiKey.lastUsed,
      organization: {
        id: organization._id,
        name: organization.name
      }
    };
    
    console.log('Returning organization API key info:', { ...response, key: `${apiKey.prefix}_******` });
    res.json(response);
  } catch (error) {
    console.error(`Error getting API key for organization ${req.params.id}:`, error);
    console.error(error.stack);
    res.status(500).json({ message: 'Failed to retrieve organization API key: ' + error.message });
  }
};

// Helper function to generate an API key for the current user's organization
const generateApiKeyForCurrentUser = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ message: 'Invalid organization ID' });
    }
    
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    
    // Generate API key
    const keyValue = crypto.randomBytes(32).toString('hex');
    const keyPrefix = 'ca_' + crypto.randomBytes(4).toString('hex');
    const fullKeyFormat = `${keyPrefix}_${keyValue}`;
    
    // Create API key record
    const keyName = `Default API Key - ${new Date().toLocaleDateString()}`;
    
    const newApiKey = new ApiKey({
      prefix: keyPrefix,
      key: keyValue,
      name: keyName,
      organizationId: orgObjectId,
      createdBy: req.user.userId
    });
    
    await newApiKey.save();
    
    console.log('Generated new API key with prefix:', keyPrefix);
    
    // Return the newly created key
    return res.status(201).json({
      id: newApiKey._id,
      name: newApiKey.name,
      prefix: newApiKey.prefix,
      key: fullKeyFormat,
      createdAt: newApiKey.createdAt
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    return res.status(500).json({ message: 'Failed to generate API key: ' + error.message });
  }
};

// Get API key for organization from query parameter
exports.getApiKeyByQuery = async (req, res) => {
  try {
    console.log('getApiKeyByQuery called with request query:', req.query);
    console.log('Context: overrideOrganizationId =', req.overrideOrganizationId, 'overrideOrganizationName =', req.overrideOrganizationName);
    console.log('Context headers:', JSON.stringify(req.headers, null, 2));
    
    // Priority for organization ID: 
    // 1. Query parameter (explicit organizationId in URL) - highest priority
    // 2. Context override (Only Blooms mode) - second priority
    // 3. JWT token (user's organization) - lowest priority
    let organizationId;
    
    if (req.query.organizationId) {
      // 1. Use query parameter if available (highest priority)
      console.log(`Using explicit organizationId from query parameter: ${req.query.organizationId}`);
      organizationId = req.query.organizationId;
    } else if (req.overrideOrganizationId) {
      // 2. Use context override if available (second priority)
      console.log(`Using organization context override: ${req.overrideOrganizationName} (${req.overrideOrganizationId})`);
      organizationId = req.overrideOrganizationId;
    } else if (req.user && req.user.organizationId) {
      // 3. Fallback to user's organization from JWT
      console.log(`Falling back to user's organization ID from JWT: ${req.user.organizationId}`);
      organizationId = req.user.organizationId;
    }
    
    if (!organizationId) {
      console.error('No organization ID provided in query, context or JWT');
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    console.log('Looking for API key with organizationId (via query):', orgObjectId.toString());
    
    // Check if organization exists
    const organization = await Organization.findById(orgObjectId);
    if (!organization) {
      console.error(`Organization not found with ID: ${organizationId}`);
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Find the most recently created active API key
    const apiKey = await ApiKey.findOne({
      organizationId: orgObjectId,
      isActive: true
    }).sort({ createdAt: -1 }).lean();
    
    console.log('API key found for organization (via query):', apiKey ? 'Yes' : 'No');
    
    if (!apiKey) {
      console.log(`No active API key found for organization: ${organizationId}`);
      return res.status(404).json({ 
        message: 'No active API key found', 
        organizationId: organizationId,
        needsGeneration: true 
      });
    }

    // Return the API key info
    const response = {
      id: apiKey._id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: `${apiKey.prefix}_${apiKey.key}`, // Return full key format
      createdAt: apiKey.createdAt,
      lastUsed: apiKey.lastUsed,
      organization: {
        id: organization._id,
        name: organization.name
      }
    };
    
    console.log('Returning organization API key info (via query):', { ...response, key: `${apiKey.prefix}_******` });
    res.json(response);
  } catch (error) {
    console.error(`Error getting API key via query:`, error);
    console.error(error.stack);
    res.status(500).json({ message: 'Failed to retrieve organization API key: ' + error.message });
  }
}; 