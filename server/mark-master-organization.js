const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Organization = require('./models/organization');

async function markMasterOrganization() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if we already have a master organization
    const existingMaster = await Organization.findOne({ isMaster: true });
    
    if (existingMaster) {
      console.log(`Master organization already exists: "${existingMaster.name}" (${existingMaster._id})`);
      console.log('No changes made.');
    } else {
      // Find an organization with "master", "nectar", or "AIdesk" in the name
      let possibleMaster = await Organization.findOne({ 
        $or: [
          { name: { $regex: /master/i } },
          { name: { $regex: /nectar/i } },
          { name: { $regex: /aidesk/i } },
          { code: { $regex: /master/i } },
          { code: 'master-org' }
        ]
      });
      
      if (!possibleMaster) {
        // If still not found, try to find one called "AI Nectar Desk"
        possibleMaster = await Organization.findOne({ 
          name: "AI Nectar Desk"
        });
      }
      
      if (possibleMaster) {
        console.log(`Found possible master organization: "${possibleMaster.name}" (${possibleMaster._id})`);
        console.log('Marking as master organization...');
        
        await Organization.findByIdAndUpdate(
          possibleMaster._id,
          { isMaster: true }
        );
        
        console.log('✅ Master organization set successfully!');
      } else {
        // If no suitable organization found, get all orgs
        const allOrgs = await Organization.find().sort('name');
        
        if (allOrgs.length === 0) {
          console.log('No organizations found in the database.');
        } else {
          console.log('No master organization candidate found. Available organizations:');
          
          allOrgs.forEach((org, index) => {
            console.log(`${index + 1}. "${org.name}" (${org._id})`);
          });
          
          console.log('\nTo manually set a master organization, run:');
          console.log('node -e \'require("mongoose").connect(process.env.MONGODB_URI).then(() => require("./models/organization").findByIdAndUpdate("ORG_ID_HERE", { isMaster: true }).then(() => console.log("Done!")).catch(e => console.error(e)).finally(() => mongoose.disconnect()))\'');
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

markMasterOrganization(); 