require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/call-analyzer';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define User schema (simplified version matching your actual schema)
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

// Create the User model
const User = mongoose.model('User', UserSchema);

// Function to update master admin email
async function updateMasterAdminEmail() {
  try {
    // Find the master admin user
    const masterAdmin = await User.findOne({ isMasterAdmin: true });
    
    if (!masterAdmin) {
      console.log('No master admin user found');
      mongoose.disconnect();
      return;
    }
    
    // Log the current email
    console.log('Current master admin email:', masterAdmin.email);
    
    // The new email address
    const newEmail = 'aa@nectardesk.com';
    
    // Update the email
    masterAdmin.email = newEmail;
    await masterAdmin.save();
    
    console.log('Master admin email updated successfully!');
    console.log('New email:', newEmail);
  } catch (error) {
    console.error('Error updating master admin email:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the function
updateMasterAdminEmail(); 