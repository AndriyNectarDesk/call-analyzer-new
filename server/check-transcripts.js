require('dotenv').config();
const mongoose = require('mongoose');
const Transcript = require('./models/transcript');
const Organization = require('./models/organization');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.log('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Function to check transcripts
async function checkTranscripts() {
  try {
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('Available collections:', collectionNames);
    
    if (!collectionNames.includes('transcripts')) {
      console.log('Warning: transcripts collection does not exist in database');
      process.exit(0);
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
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error checking transcripts:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

checkTranscripts(); 