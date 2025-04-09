const Organization = require('../models/organization');
const User = require('../models/user');
const mongoose = require('mongoose');

// Get all organizations with detailed information
exports.getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({})
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(organizations);
  } catch (error) {
    console.error('Error getting organizations:', error);
    res.status(500).json({ message: 'Failed to retrieve organizations' });
  }
};

// Get organization details with users
exports.getOrganizationDetails = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const users = await User.find({ organizationId: req.params.id })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      organization,
      users
    });
  } catch (error) {
    console.error('Error getting organization details:', error);
    res.status(500).json({ message: 'Failed to retrieve organization details' });
  }
};

// Update organization subscription
exports.updateOrganizationSubscription = async (req, res) => {
  try {
    const { subscriptionTier, subscriptionStatus, subscriptionPeriod, billingInfo } = req.body;
    
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subscriptionTier,
          subscriptionStatus,
          subscriptionPeriod,
          billingInfo,
          updatedAt: Date.now()
        }
      },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Error updating organization subscription:', error);
    res.status(500).json({ message: 'Failed to update organization subscription' });
  }
};

// Update organization features
exports.updateOrganizationFeatures = async (req, res) => {
  try {
    const { features } = req.body;
    
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          features,
          updatedAt: Date.now()
        }
      },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Error updating organization features:', error);
    res.status(500).json({ message: 'Failed to update organization features' });
  }
};

// Create user in organization
exports.createOrganizationUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check organization user limit
    const organization = await Organization.findById(req.params.id);
    const userCount = await User.countDocuments({ organizationId: req.params.id });
    
    if (userCount >= organization.features.maxUsers) {
      return res.status(400).json({ message: 'Organization user limit reached' });
    }

    const newUser = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      organizationId: req.params.id
    });

    await newUser.save();

    // Update organization user count
    await Organization.findByIdAndUpdate(
      req.params.id,
      { $inc: { 'usageStats.totalUsers': 1 } }
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating organization user:', error);
    res.status(500).json({ message: 'Failed to create organization user' });
  }
};

// Update user in organization
exports.updateOrganizationUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    
    const user = await User.findOneAndUpdate(
      { 
        _id: req.params.userId,
        organizationId: req.params.id
      },
      {
        $set: {
          role,
          isActive,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating organization user:', error);
    res.status(500).json({ message: 'Failed to update organization user' });
  }
};

// Get organization usage statistics
exports.getOrganizationStats = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .select('usageStats features subscriptionTier subscriptionStatus');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const userCount = await User.countDocuments({ 
      organizationId: req.params.id,
      isActive: true
    });

    const transcriptCount = await mongoose.model('Transcript').countDocuments({
      organizationId: req.params.id
    });

    res.json({
      ...organization.toObject(),
      currentUserCount: userCount,
      currentTranscriptCount: transcriptCount
    });
  } catch (error) {
    console.error('Error getting organization stats:', error);
    res.status(500).json({ message: 'Failed to retrieve organization statistics' });
  }
}; 