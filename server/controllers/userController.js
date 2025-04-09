const User = require('../models/user');
const Organization = require('../models/organization');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    // If org admin, limit to organization users
    const query = req.user.isMasterAdmin 
      ? {} 
      : { organizationId: req.user.organizationId };
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Failed to retrieve users' });
  }
};

// Get users for an organization
exports.getOrganizationUsers = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    
    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Get users for the organization
    const users = await User.find({ organizationId })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error getting organization users:', error);
    res.status(500).json({ message: 'Failed to retrieve organization users' });
  }
};

// Get a single user
exports.getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // If not master admin, user can only view themselves or users in their org
    if (!req.user.isMasterAdmin && userId !== req.user.userId && 
        (req.user.role !== 'admin' || userId.toString() !== req.user.organizationId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Failed to retrieve user' });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, password, role, organizationId } = req.body;
    
    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Validate organization
    if (organizationId) {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        return res.status(400).json({ message: 'Invalid organization' });
      }
    }
    
    // Determine organization ID
    const userOrgId = organizationId || (req.user.organizationId || null);
    
    // Create new user
    const newUser = new User({
      email,
      firstName,
      lastName,
      password, // Will be hashed by the model's pre-save hook
      role: role || 'user',
      organizationId: userOrgId,
      isMasterAdmin: false // Master admin flag should never be set via API
    });
    
    await newUser.save();
    
    res.status(201).json({
      id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      organizationId: newUser.organizationId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, role, isActive } = req.body;
    
    // Validate permissions
    if ((!req.user.isMasterAdmin && userId !== req.user.userId) || 
        (req.user.role !== 'admin' && req.body.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prepare update object
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    
    // Only admins can update roles and status
    if ((req.user.isMasterAdmin || req.user.role === 'admin') && role) {
      updates.role = role;
    }
    
    if ((req.user.isMasterAdmin || req.user.role === 'admin') && isActive !== undefined) {
      updates.isActive = isActive;
    }
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

// Delete (deactivate) a user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent self-deletion
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Soft delete by setting isActive to false
    await User.findByIdAndUpdate(userId, { isActive: false });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
}; 