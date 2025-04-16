require('dotenv').config();
const mongoose = require('mongoose');
const Transcript = require('./models/transcript');
const Organization = require('./models/organization');

async function fixTranscriptOrganizations() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Try to find the master organization by the isMaster flag
    let masterOrg = await Organization.findOne({ isMaster: true });
    
    // If no master org found, try to find by name or code
    if (!masterOrg) {
      console.log('No organization with isMaster flag set. Trying to find by name...');
      // Try various identifiers that might indicate the master organization
      masterOrg = await Organization.findOne({ 
        $or: [
          { name: 'Master Organization' },
          { name: 'AI Nectar Desk' },
          { code: 'master-org' }
        ] 
      });
    }
    
    // If still no master org, get the first organization as a fallback
    if (!masterOrg) {
      console.log('Still no master organization found. Using first organization as fallback...');
      masterOrg = await Organization.findOne({}).sort({ createdAt: 1 });
    }
    
    if (!masterOrg) {
      console.error('No organizations found in the database. Please create an organization first.');
      process.exit(1);
    }
    
    console.log(`Using organization as master: ${masterOrg.name} (${masterOrg._id})`);
    
    // Find transcripts with missing or null organizationId
    const orphanedTranscripts = await Transcript.find({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null }
      ]
    });
    
    console.log(`Found ${orphanedTranscripts.length} transcripts with missing organization ID`);
    
    // Update all orphaned transcripts to be assigned to the master organization
    if (orphanedTranscripts.length > 0) {
      console.log('Updating transcripts...');
      
      const updateResult = await Transcript.updateMany(
        {
          $or: [
            { organizationId: { $exists: false } },
            { organizationId: null }
          ]
        },
        {
          $set: { organizationId: masterOrg._id }
        }
      );
      
      console.log(`Updated ${updateResult.modifiedCount} transcripts to be assigned to the master organization`);
    }
    
    // Optional: Update the master organization to set the isMaster flag if it's not set
    if (!masterOrg.isMaster) {
      console.log('Setting isMaster flag on the master organization...');
      masterOrg.isMaster = true;
      await masterOrg.save();
      console.log('Master organization updated');
    }
    
    // Validate that there are no more orphaned transcripts
    const remainingOrphans = await Transcript.countDocuments({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null }
      ]
    });
    
    console.log(`Remaining orphaned transcripts: ${remainingOrphans}`);
    
    if (remainingOrphans === 0) {
      console.log('All transcripts now have a valid organization assignment');
    } else {
      console.log('Some transcripts still do not have an organization assignment. Manual inspection may be required.');
    }
    
    // Verify all organizations exist
    const distinctOrgIds = await Transcript.distinct('organizationId');
    
    console.log(`Found ${distinctOrgIds.length} distinct organization IDs in transcripts`);
    
    for (const orgId of distinctOrgIds) {
      if (orgId) { // Skip null values
        const org = await Organization.findById(orgId);
        if (!org) {
          console.log(`Organization with ID ${orgId} not found. Reassigning its transcripts to master organization...`);
          
          const updateResult = await Transcript.updateMany(
            { organizationId: orgId },
            { $set: { organizationId: masterOrg._id } }
          );
          
          console.log(`Reassigned ${updateResult.modifiedCount} transcripts to master organization`);
        }
      }
    }
    
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error fixing transcript organizations:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
fixTranscriptOrganizations(); 