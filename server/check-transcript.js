const mongoose = require('mongoose');
require('dotenv').config();

// Import both models
const Organization = require('./models/organization');
const Transcript = require('./models/transcript');

async function checkTranscriptOrganization() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const transcript = await Transcript.findById('67ff0583abb9abce287b5aee').populate('organizationId');
    
    if (transcript) {
      console.log('Transcript found:');
      console.log(`ID: ${transcript._id}`);
      console.log(`Source: ${transcript.source}`);
      console.log(`Call Type: ${transcript.callType}`);
      console.log(`Created At: ${transcript.createdAt}`);
      
      if (transcript.organizationId) {
        console.log('\nOrganization:');
        console.log(`ID: ${transcript.organizationId._id}`);
        console.log(`Name: ${transcript.organizationId.name}`);
        console.log(`Code: ${transcript.organizationId.code}`);
        console.log(`Description: ${transcript.organizationId.description || 'N/A'}`);
        console.log(`Contact Email: ${transcript.organizationId.contactEmail || 'N/A'}`);
        console.log(`Active: ${transcript.organizationId.active}`);
        console.log(`Subscription Tier: ${transcript.organizationId.subscriptionTier || 'N/A'}`);
        console.log(`Is Master Organization: ${transcript.organizationId.isMaster ? 'Yes' : 'No'}`);
      } else {
        console.log('No organization assigned to this transcript');
      }
      
      // Also fetch all organizations to show master org
      console.log('\nAll Organizations:');
      const orgs = await Organization.find({});
      for (const org of orgs) {
        console.log(`- ${org.name} (${org.code}) - ID: ${org._id} - IsMaster: ${org.isMaster ? 'Yes' : 'No'}`);
      }
    } else {
      console.log('Transcript not found');
    }
    
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
  }
}

checkTranscriptOrganization(); 