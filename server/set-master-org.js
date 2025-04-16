const mongoose = require('mongoose');
const Organization = require('./models/organization');
require('dotenv').config();

async function setupMasterOrganization() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the master organization
    const masterOrg = await Organization.findOne({ isMaster: true });
    
    if (masterOrg) {
      console.log('Master organization already set:');
      console.log(`ID: ${masterOrg._id}`);
      console.log(`Name: ${masterOrg.name}`);
      console.log(`Code: ${masterOrg.code}`);
    } else {
      console.log('No master organization found. Looking for organization with code master-org...');
      
      // Find the organization with code 'master-org'
      const masterOrgByCode = await Organization.findOne({ code: 'master-org' });
      
      if (masterOrgByCode) {
        console.log('Organization with code master-org found:');
        console.log(`ID: ${masterOrgByCode._id}`);
        console.log(`Name: ${masterOrgByCode.name}`);
        console.log(`Code: ${masterOrgByCode.code}`);
        console.log(`isMaster flag: ${masterOrgByCode.isMaster}`);
        
        // Update this organization to be the master organization
        console.log('Setting this as the master organization...');
        masterOrgByCode.isMaster = true;
        await masterOrgByCode.save();
        console.log('Organization successfully set as master organization');
      } else {
        console.log('No organization with code master-org found');
      }
    }
    
    console.log('\nAll Organizations:');
    const orgs = await Organization.find({});
    for (const org of orgs) {
      console.log(`- ${org.name} (${org.code}) - ID: ${org._id} - IsMaster: ${org.isMaster ? 'Yes' : 'No'}`);
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

setupMasterOrganization(); 