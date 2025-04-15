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
    const { name, description, contactEmail } = req.body;
    
    // Validate input
    if (!name || !contactEmail) {
      return res.status(400).json({ message: 'Organization name and contact email are required' });
    }
    
    // Check if organization with same name exists
    const existingOrg = await Organization.findOne({ name, isActive: true });
    if (existingOrg) {
      return res.status(400).json({ message: 'An organization with this name already exists' });
    }
    
    const newOrganization = new Organization({
      name,
      description,
      contactEmail,
      createdBy: req.user.id
    });
    
    await newOrganization.save();
    res.status(201).json(newOrganization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Failed to create organization' });
  }
};

// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const { name, description, contactEmail } = req.body;
    
    // Check if name is being changed and if it conflicts
    if (name) {
      const existingOrg = await Organization.findOne({ 
        name, 
        _id: { $ne: req.params.id },
        isActive: true 
      });
      
      if (existingOrg) {
        return res.status(400).json({ message: 'An organization with this name already exists' });
      }
    }
    
    const updatedOrganization = await Organization.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          name: name || undefined,
          description: description || undefined,
          contactEmail: contactEmail || undefined,
          updatedAt: Date.now(),
          updatedBy: req.user.id
        }
      },
      { new: true, runValidators: true }
    ).select('-apiKeys.secret');
    
    if (!updatedOrganization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(updatedOrganization);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ message: 'Failed to update organization' });
  }
};

// Deactivate organization (soft delete)
exports.deactivateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          isActive: false,
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
    // Get organization ID either from params or user object
    const organizationId = req.params.id || req.user.organizationId;
    console.log('Generating API key for organization:', organizationId);
    
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }
    
    // Check if organization exists
    const organization = await Organization.findOne({ 
      _id: new mongoose.Types.ObjectId(organizationId),
      isActive: true
    });
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Generate API key
    const keyValue = crypto.randomBytes(32).toString('hex');
    const keyPrefix = 'ca_' + crypto.randomBytes(4).toString('hex');
    const fullKeyFormat = `${keyPrefix}_${keyValue}`; // Store the full format for logging
    
    console.log('Generated new API key with prefix:', keyPrefix);
    
    // Create API key record
    const keyName = req.body.name || `API Key - ${new Date().toISOString().split('T')[0]}`;
    console.log('Creating API key with name:', keyName);
    
    const newApiKey = new ApiKey({
      prefix: keyPrefix,
      key: keyValue,
      name: keyName,
      organizationId,
      createdBy: req.user.id
    });
    
    await newApiKey.save();
    
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
    res.status(500).json({ message: 'Failed to generate API key' });
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
    const organizationId = req.user.organizationId;
    console.log('Getting API key for organization:', organizationId);
    
    if (!organizationId) {
      console.error('No organizationId found in user object:', req.user);
      return res.status(400).json({ message: 'User organization not found' });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      console.error('Invalid organization ID format:', organizationId);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }

    // Find the most recently created active API key
    const apiKey = await ApiKey.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      isActive: true
    }).sort({ createdAt: -1 }).lean(); // Use lean() to get a plain JavaScript object
    
    console.log('API key found:', apiKey ? 'Yes' : 'No');
    
    if (!apiKey) {
      return res.status(404).json({ message: 'No active API key found' });
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
    res.status(500).json({ message: 'Failed to retrieve API key' });
  }
}; 