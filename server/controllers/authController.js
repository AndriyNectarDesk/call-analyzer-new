const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Organization = require('../models/organization');
const crypto = require('crypto');
const { emailService } = require('../services');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Generate JWT token with user info and organization
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    isMasterAdmin: user.isMasterAdmin,
    role: user.role,
    organizationId: user.organizationId
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

// User login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email }).exec();
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    // Validate password
    const isValidPassword = user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login time
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Fetch organization details if user belongs to one
    let organization = null;
    if (user.organizationId) {
      organization = await Organization.findById(user.organizationId)
        .select('name code subscriptionTier features.customBranding')
        .exec();
    }
    
    // Return token and user info
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isMasterAdmin: user.isMasterAdmin,
        organization: organization
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Register a new user (for master admin only)
exports.registerUser = async (req, res) => {
  try {
    const { email, firstName, lastName, password, role, organizationId } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Validate organization if provided
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(400).json({ error: 'Invalid organization' });
      }
    }
    
    // Create new user
    const user = new User({
      email,
      firstName,
      lastName,
      password,
      role: role || 'user',
      organizationId: organizationId || null,
      isMasterAdmin: false // Only set through direct DB actions
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Get current user info
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .exec();
      
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Default organization from user's primary organization
    let organizations = [];
    
    // Fetch organization details if user belongs to one
    if (user.organizationId) {
      const primaryOrg = await Organization.findById(user.organizationId)
        .select('name code subscriptionTier features.customBranding isMaster')
        .exec();
      
      if (primaryOrg) {
        organizations.push({
          _id: primaryOrg._id,
          id: primaryOrg._id, // For compatibility
          name: primaryOrg.name,
          code: primaryOrg.code,
          isMaster: primaryOrg.isMaster || false,
          subscriptionTier: primaryOrg.subscriptionTier,
          features: primaryOrg.features
        });
      }
      
      // If master admin, fetch all organizations
      if (user.isMasterAdmin) {
        const allOrgs = await Organization.find({})
          .select('name code isMaster subscriptionTier features.customBranding')
          .exec();
        
        // Add any organizations not already included
        allOrgs.forEach(org => {
          if (!organizations.some(o => o._id.toString() === org._id.toString())) {
            organizations.push({
              _id: org._id,
              id: org._id, // For compatibility
              name: org.name,
              code: org.code,
              isMaster: org.isMaster || false,
              subscriptionTier: org.subscriptionTier,
              features: org.features
            });
          }
        });
      }
    }
    
    res.json({
      user: {
        id: user._id,
        _id: user._id, // For compatibility
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isMasterAdmin: user.isMasterAdmin,
        organization: organizations[0] || null, // For backward compatibility
        organizationId: user.organizationId, // Include raw organizationId
        organizations: organizations // Include all organizations
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate current password
    const isValidPassword = user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Middleware to authenticate JWT token
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user information to request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is master admin
exports.requireMasterAdmin = (req, res, next) => {
  if (!req.user.isMasterAdmin) {
    return res.status(403).json({ error: 'Master admin permissions required' });
  }
  
  next();
};

// Middleware to check if user is an organization admin
exports.requireOrgAdmin = (req, res, next) => {
  if (!req.user.isMasterAdmin && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permissions required' });
  }
  
  next();
};

// Middleware to check organization membership
exports.requireSameOrganization = (req, res, next) => {
  const targetOrgId = req.params.organizationId || req.body.organizationId;
  
  // Master admins can access any organization
  if (req.user.isMasterAdmin) {
    return next();
  }
  
  // Check if user belongs to the target organization
  if (req.user.organizationId && req.user.organizationId.toString() === targetOrgId) {
    return next();
  }
  
  return res.status(403).json({ error: 'You do not have access to this organization' });
};

// Password reset functionality
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email }).exec();
    
    // Always return success even if user not found (security best practice)
    if (!user) {
      return res.status(200).json({ message: 'If your email exists in our system, you will receive password reset instructions' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // Save token to user document
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();
    
    // Send email with reset link
    let emailService;
    let emailSent = false;
    
    try {
      emailService = require('../services').emailService;
      emailSent = await emailService.sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      console.error('Error with email service:', emailError);
      // Continue execution - we'll still return success to the user
    }
    
    if (!emailSent) {
      console.log('Email not sent, but password reset token was created for user:', user.email);
    }
    
    res.status(200).json({
      message: 'If your email exists in our system, you will receive password reset instructions',
      // Only include token in development environments
      ...(process.env.NODE_ENV !== 'production' && { resetToken })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    }).exec();
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}; 