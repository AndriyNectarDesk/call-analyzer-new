require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/call-analyzer';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define Organization schema (simplified version of your actual schema)
const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'enterprise'
  },
  features: {
    maxUsers: {
      type: Number,
      default: 100
    },
    maxCalls: {
      type: Number,
      default: 10000
    },
    apiAccess: {
      type: Boolean,
      default: true
    },
    customPrompts: {
      type: Boolean,
      default: true
    },
    customBranding: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Organization = mongoose.model('Organization', OrganizationSchema);

// Create default organization
async function createDefaultOrganization() {
  try {
    // Check if organization already exists
    const existingOrg = await Organization.findOne({ code: 'nectar' });
    if (existingOrg) {
      console.log('Default organization already exists:', existingOrg.name);
      console.log('Organization ID:', existingOrg._id);
      return;
    }
    
    // Create default organization
    const defaultOrg = new Organization({
      name: 'Nectar Desk',
      code: 'nectar',
      contactEmail: 'admin@nectardesk.ai',
      subscriptionTier: 'enterprise',
      features: {
        maxUsers: 100,
        maxCalls: 10000,
        apiAccess: true,
        customPrompts: true,
        customBranding: true
      },
      isActive: true
    });
    
    await defaultOrg.save();
    console.log('Default organization created successfully!');
    console.log('Organization ID:', defaultOrg._id);
    console.log('Name:', defaultOrg.name);
  } catch (error) {
    console.error('Error creating default organization:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the function
createDefaultOrganization(); 