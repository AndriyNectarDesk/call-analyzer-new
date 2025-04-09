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
    const { firstName, lastName, role, isActive, password } = req.body;
    
    // Find the user first to ensure they exist
    const existingUser = await User.findOne({
      _id: req.params.userId,
      organizationId: req.params.id
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update basic info
    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.role = role;
    existingUser.isActive = isActive;
    existingUser.updatedAt = Date.now();
    
    // Update password if provided
    if (password) {
      existingUser.password = password; // Model should hash this via pre-save hook
    }
    
    await existingUser.save();
    
    // Return user object without password
    const userResponse = existingUser.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating organization user:', error);
    res.status(500).json({ message: 'Failed to update organization user' });
  }
};

// Get single user from organization
exports.getOrganizationUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      organizationId: req.params.id
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting organization user:', error);
    res.status(500).json({ message: 'Failed to retrieve user' });
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

// Reset user password
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Find the user
    const user = await User.findOne({
      _id: req.params.userId,
      organizationId: req.params.id
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update password
    user.password = newPassword;
    user.updatedAt = Date.now();
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// Create a new Master Admin user
exports.createMasterAdminUser = async (req, res) => {
  try {
    const { email, firstName, lastName, password } = req.body;
    
    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Create new master admin user
    const newUser = new User({
      email,
      firstName,
      lastName,
      password, // Will be hashed by the model's pre-save hook
      role: 'admin', // Master admins are also admins
      organizationId: null, // Master admins don't belong to any specific organization
      isMasterAdmin: true
    });
    
    await newUser.save();
    
    // Return the new user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating master admin user:', error);
    res.status(500).json({ message: 'Failed to create master admin user' });
  }
};

// Get all Master Admin users
exports.getAllMasterAdmins = async (req, res) => {
  try {
    const masterAdmins = await User.find({ isMasterAdmin: true })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(masterAdmins);
  } catch (error) {
    console.error('Error getting master admin users:', error);
    res.status(500).json({ message: 'Failed to retrieve master admin users' });
  }
};

// Update Master Admin user
exports.updateMasterAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, isActive } = req.body;
    
    // Check if user exists and is a master admin
    const masterAdmin = await User.findOne({ _id: userId, isMasterAdmin: true });
    if (!masterAdmin) {
      return res.status(404).json({ message: 'Master Admin user not found' });
    }
    
    // Prepare update object
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (isActive !== undefined) updates.isActive = isActive;
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating master admin user:', error);
    res.status(500).json({ message: 'Failed to update master admin user' });
  }
};

// Reset Master Admin password
exports.resetMasterAdminPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Find the user
    const masterAdmin = await User.findOne({ _id: userId, isMasterAdmin: true });
    if (!masterAdmin) {
      return res.status(404).json({ message: 'Master Admin user not found' });
    }
    
    // Update password
    masterAdmin.password = newPassword; // Will be hashed by the model's pre-save hook
    await masterAdmin.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting master admin password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
}; 