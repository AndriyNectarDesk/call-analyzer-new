/**
 * Utility script to find the Master Organization in the database
 * and print its ID for environment variable configuration
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./models/organization');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function findMasterOrg() {
  try {
    // Find organizations with name containing "master" or exactly "nectardesk"
    const masterOrgs = await Organization.find({
      $or: [
        { name: { $regex: /master/i } },
        { name: 'NectarDesk' },
        { code: { $regex: /master/i } },
        { code: 'master-org' }
      ]
    });

    if (masterOrgs.length === 0) {
      console.log('No master organization found. Please create one first.');
      process.exit(0);
    }

    console.log('\n=== Found Master Organization Candidates ===');
    masterOrgs.forEach((org, index) => {
      console.log(`[${index + 1}] ID: ${org._id}`);
      console.log(`    Name: ${org.name}`);
      console.log(`    Code: ${org.code}`);
      console.log(`    Created: ${org.createdAt}`);
      console.log('--------------------------------------------');
    });

    if (masterOrgs.length === 1) {
      console.log('\n=== CONFIGURATION INSTRUCTIONS ===');
      console.log('Add this to your .env file:');
      console.log(`MASTER_ORG_ID=${masterOrgs[0]._id}`);
    } else {
      console.log('\nMultiple candidates found. Please choose the correct one and add to your .env file.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error finding master organization:', error);
    process.exit(1);
  }
}

findMasterOrg(); 