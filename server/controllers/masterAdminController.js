const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');
const Organization = require('../models/organization');
const { emailService } = require('../services');

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
    const { id } = req.params;
    
    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`Error getting organization details: Invalid ObjectId format for id "${id}"`);
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }
    
    const organization = await Organization.findById(id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const users = await User.find({ organizationId: id })
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

// Get organization stats
exports.getOrganizationStats = async (req, res) => {
  try {
    const organizationId = req.params.id;
    console.log('Getting stats for organization:', organizationId);
    
    // Get current user count
    const currentUserCount = await User.countDocuments({
      organizationId: mongoose.Types.ObjectId(organizationId),
      isActive: true
    });
    console.log('Current user count:', currentUserCount);

    // Get current transcript count
    const currentTranscriptCount = await mongoose.model('Transcript').countDocuments({
      organizationId: mongoose.Types.ObjectId(organizationId)
    });
    console.log('Current transcript count:', currentTranscriptCount);
    
    res.json({
      currentUserCount,
      currentTranscriptCount,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting organization stats:', error);
    res.status(500).json({ message: 'Error getting organization stats' });
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
    const { email, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Get master organization
    const masterOrg = await Organization.findOne({ code: 'master-org' });
    if (!masterOrg) {
      return res.status(500).json({ message: 'Master organization not found' });
    }
    
    // Generate a temporary password (will be reset by user)
    const tempPassword = crypto.randomBytes(16).toString('hex');
    
    // Create new master admin user
    const newUser = new User({
      email,
      firstName,
      lastName,
      password: tempPassword, // Will be hashed by the model's pre-save hook
      role: 'admin', // Master admins are also admins
      organizationId: masterOrg._id,
      isMasterAdmin: true
    });
    
    await newUser.save();
    
    // Update master organization user count
    await Organization.findByIdAndUpdate(
      masterOrg._id,
      { $inc: { 'usageStats.totalUsers': 1 } }
    );
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = Date.now() + 86400000; // 24 hours
    
    // Save token to user document
    newUser.passwordResetToken = resetToken;
    newUser.passwordResetExpires = resetExpiry;
    await newUser.save();
    
    console.log(`Creating Master Admin user: ${firstName} ${lastName} (${email})`);
    console.log(`Reset token generated with expiry: ${new Date(resetExpiry).toISOString()}`);
    
    // Send password reset email
    await emailService.sendMasterAdminWelcomeEmail(email, firstName, resetToken);
    
    res.status(201).json({
      message: 'Master Admin user created successfully. Check email for password reset instructions.',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    });
  } catch (error) {
    console.error('Error creating master admin user:', error);
    res.status(500).json({ message: 'Failed to create master admin user' });
  }
};

// Get all Master Admin users
exports.getAllMasterAdmins = async (req, res) => {
  try {
    const masterAdmins = await User.find({ 
      isMasterAdmin: true,
      isActive: true 
    })
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

// Delete (deactivate) a Master Admin user
exports.deleteMasterAdmin = async (req, res) => {
  try {
    const userId = req.params.id;

    // Don't allow users to delete themselves
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    // Find the user and ensure they are a master admin
    const masterAdmin = await User.findOne({ _id: userId, isMasterAdmin: true });
    if (!masterAdmin) {
      return res.status(404).json({ message: 'Master Admin user not found' });
    }
    
    // Soft delete by deactivating the user
    masterAdmin.isActive = false;
    await masterAdmin.save();
    
    res.json({ message: 'Master Admin user deactivated successfully' });
  } catch (error) {
    console.error('Error deleting master admin user:', error);
    res.status(500).json({ message: 'Failed to delete master admin user' });
  }
};

// Ensure Master Organization exists and all Master Admins are assigned to it
exports.ensureMasterOrganization = async () => {
  try {
    console.log('Checking/creating Master Organization and assigning Master Admins...');
    
    // Find or create the Master Organization
    let masterOrg = await Organization.findOne({ code: 'master-org' });
    
    if (!masterOrg) {
      console.log('Creating Master Organization...');
      masterOrg = new Organization({
        name: 'AI Nectar Desk',
        code: 'master-org',
        contactEmail: 'admin@nectardesk.ai',
        subscriptionTier: 'enterprise',
        features: {
          maxUsers: 999999,
          maxCalls: 999999,
          apiAccess: true,
          customPrompts: true,
          customBranding: true
        }
      });
      
      await masterOrg.save();
      console.log('Master Organization created with ID:', masterOrg._id);
    }
    
    // Find all Master Admins without an organization and update them
    const masterAdminsToUpdate = await User.find({ 
      isMasterAdmin: true, 
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null }
      ] 
    });
    
    if (masterAdminsToUpdate.length > 0) {
      console.log(`Found ${masterAdminsToUpdate.length} Master Admins without organization, updating...`);
      
      // Update each Master Admin
      for (const admin of masterAdminsToUpdate) {
        admin.organizationId = masterOrg._id;
        await admin.save();
        console.log(`Assigned Master Admin ${admin._id} to Master Organization`);
      }
    } else {
      console.log('All Master Admins already have an organization assigned.');
    }
    
    return masterOrg;
  } catch (error) {
    console.error('Error ensuring Master Organization:', error);
    throw error;
  }
}; 