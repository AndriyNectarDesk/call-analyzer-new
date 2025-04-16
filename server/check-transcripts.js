require('dotenv').config();
const mongoose = require('mongoose');
const Transcript = require('./models/transcript');
const Organization = require('./models/organization');

// Function to check transcripts
async function checkTranscripts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('Available collections:', collectionNames);
    
    if (!collectionNames.includes('transcripts')) {
      console.log('Warning: transcripts collection does not exist in database');
      await mongoose.disconnect();
      return;
    }
    
    // Get total count of transcripts
    const totalCount = await Transcript.countDocuments({});
    console.log(`Total transcripts in database: ${totalCount}`);
    
    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`Total organizations: ${organizations.length}`);
    
    // Count transcripts by organization
    for (const org of organizations) {
      const count = await Transcript.countDocuments({ organizationId: org._id });
      console.log(`Organization: ${org.name} (${org._id}) - Transcripts: ${count}`);
    }
    
    // Check for transcripts with no organizationId
    const noOrgCount = await Transcript.countDocuments({ organizationId: null });
    console.log(`Transcripts with no organization: ${noOrgCount}`);
    
    // List some sample transcripts
    if (totalCount > 0) {
      const samples = await Transcript.find({})
        .limit(3)
        .select('_id createdAt organizationId callType')
        .lean();
      
      console.log('Sample transcripts:');
      console.log(JSON.stringify(samples, null, 2));
    }
    
    // Check for transcripts with the master organization
    const masterOrg = await Organization.findOne({ isMaster: true });
    if (masterOrg) {
      const masterCount = await Transcript.countDocuments({ organizationId: masterOrg._id });
      console.log(`Master organization ${masterOrg.name} (${masterOrg._id}) - Transcripts: ${masterCount}`);
    } else {
      console.log('No master organization found');
    }
    
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error checking transcripts:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the function
checkTranscripts()
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 