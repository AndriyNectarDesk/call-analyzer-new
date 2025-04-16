const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Organization = require('./models/organization');
const Transcript = require('./models/transcript');

async function checkTranscripts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check total transcript count
    const totalTranscripts = await Transcript.countDocuments();
    console.log(`Total transcripts in database: ${totalTranscripts}`);
    
    if (totalTranscripts === 0) {
      console.log('No transcripts found in the database.');
      console.log('You may need to create some transcripts first.');
    } else {
      // Get organizations
      const organizations = await Organization.find();
      console.log(`Found ${organizations.length} organizations`);
      
      // Check transcripts for each organization
      for (const org of organizations) {
        const count = await Transcript.countDocuments({ organizationId: org._id });
        console.log(`Organization "${org.name}" (${org._id}) - Transcripts: ${count} - isMaster: ${org.isMaster || false}`);
        
        if (count > 0) {
          // Get a sample transcript for this organization
          const sample = await Transcript.findOne({ organizationId: org._id });
          console.log(`Sample transcript ID: ${sample._id}, created: ${sample.createdAt}`);
        }
      }
      
      // Get transcripts with missing organizationId
      const missingOrgCount = await Transcript.countDocuments({ organizationId: { $exists: false } });
      console.log(`Transcripts with missing organizationId: ${missingOrgCount}`);
      
      if (missingOrgCount > 0) {
        const missingOrgSample = await Transcript.findOne({ organizationId: { $exists: false } });
        console.log(`Sample missing org transcript ID: ${missingOrgSample._id}, created: ${missingOrgSample.createdAt}`);
      }
      
      // Check the master organization
      const masterOrg = await Organization.findOne({ isMaster: true });
      if (masterOrg) {
        console.log(`Master organization found: "${masterOrg.name}" (${masterOrg._id})`);
      } else {
        console.log('No master organization found. You should set one organization as the master.');
        
        // Find an organization with "master" in the name as a fallback
        const possibleMaster = await Organization.findOne({ 
          name: { $regex: /master/i } 
        });
        
        if (possibleMaster) {
          console.log(`Possible master organization: "${possibleMaster.name}" (${possibleMaster._id})`);
          console.log('To mark as master, update with: Organization.findByIdAndUpdate("' + possibleMaster._id + '", { isMaster: true })');
        }
      }
    }
    
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTranscripts(); 