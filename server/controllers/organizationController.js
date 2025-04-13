const Organization = require('../models/organization');
const ApiKey = require('../models/ApiKey');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/user');

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
    const organizationId = req.params.id;
    
    // Check if organization exists
    const organization = await Organization.findOne({ 
      _id: organizationId,
      isActive: true
    });
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Generate API key
    const keyValue = crypto.randomBytes(32).toString('hex');
    const keyPrefix = 'ca_' + crypto.randomBytes(4).toString('hex');
    
    // Create API key record
    const newApiKey = new ApiKey({
      prefix: keyPrefix,
      key: keyValue,
      name: req.body.name || 'API Key',
      organizationId,
      createdBy: req.user.id
    });
    
    await newApiKey.save();
    
    // Return key (full value) only once
    res.status(201).json({
      id: newApiKey._id,
      name: newApiKey.name,
      prefix: newApiKey.prefix,
      key: `${keyPrefix}_${keyValue}`, // Return full key only on creation
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

    // Check if organization exists
    const organization = await Organization.findOne({ _id: mongoose.Types.ObjectId(organizationId) });
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Get active API key count
    const activeApiKeyCount = await ApiKey.countDocuments({
      organizationId: mongoose.Types.ObjectId(organizationId),
      isActive: true
    });

    // Get current transcript count
    const currentTranscriptCount = await mongoose.model('Transcript').countDocuments({
      organizationId: mongoose.Types.ObjectId(organizationId)
    });

    // Get current user count
    const currentUserCount = await User.countDocuments({
      organizationId: mongoose.Types.ObjectId(organizationId),
      isActive: true
    });

    res.json({
      activeApiKeyCount,
      currentTranscriptCount,
      currentUserCount,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting organization stats:', error);
    res.status(500).json({ message: 'Error getting organization stats' });
  }
}; 