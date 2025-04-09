require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/call-analyzer';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define User schema (simplified version of your actual schema)
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'admin'
  },
  isMasterAdmin: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', UserSchema);

// Create master admin user
async function createMasterAdmin() {
  try {
    // Check if master admin already exists
    const existingAdmin = await User.findOne({ isMasterAdmin: true });
    if (existingAdmin) {
      console.log('Master admin already exists:', existingAdmin.email);
      return;
    }

    // Master admin credentials
    const adminEmail = 'admin@nectardesk.ai';
    const adminPassword = 'Admin@123'; // Please change this after first login
    
    // Hash the password
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    
    // Create master admin user
    const masterAdmin = new User({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Master',
      lastName: 'Admin',
      role: 'admin',
      isMasterAdmin: true,
      isActive: true
    });
    
    await masterAdmin.save();
    console.log('Master admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Please change the password after first login for security.');
  } catch (error) {
    console.error('Error creating master admin:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the function
createMasterAdmin(); 