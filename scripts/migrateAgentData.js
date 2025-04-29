/**
 * Migration script to populate the Agent collection from existing transcript data
 * 
 * Usage: node scripts/migrateAgentData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transcript = require('../server/models/transcript');
const Organization = require('../server/models/organization');
const Agent = require('../server/models/agent');

// Set timeouts using the connection options instead of global settings

async function migrateAgentData() {
  try {
    console.log('Connecting to database with extended timeouts...');
    // Connect to MongoDB with extremely increased timeout
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 300000, // 5 minutes
      socketTimeoutMS: 300000, // 5 minutes
      connectTimeoutMS: 300000, // 5 minutes
      maxPoolSize: 10
    });
    
    console.log('Connected to database');
    console.log('Starting agent data migration...');
    
    // Fetch all organizations using lean() for performance
    console.log('Fetching all organizations...');
    const organizations = await Organization.find().lean();
    console.log(`Found ${organizations.length} organizations`);
    
    let totalAgentsCreated = 0;
    
    // Process each organization
    for (const org of organizations) {
      try {
        const orgId = org._id.toString();
        console.log(`\n===== Processing organization: ${org.name || 'Unnamed'} (${orgId}) =====`);
        
        // Step 1: Find all unique agent data in this organization
        console.log('Finding all agent data in transcripts... (this may take several minutes)');
        
        // Aggregation to get unique agent data
        const uniqueAgents = await Transcript.aggregate([
          // Match transcripts for this organization with agent data
          { $match: { 
            organizationId: new mongoose.Types.ObjectId(orgId), 
            'callDetails.agent': { $exists: true, $ne: null } 
          }},
          // Group by agent identifier fields
          { $group: {
            _id: {
              id: '$callDetails.agent.id',
              email: '$callDetails.agent.email',
              firstName: '$callDetails.agent.firstName',
              lastName: '$callDetails.agent.lastName'
            },
            // Get the first complete agent record
            agent: { $first: '$callDetails.agent' }
          }},
          // Include only records with meaningful identifiers
          { $match: {
            $or: [
              { '_id.id': { $exists: true, $ne: null } },
              { '_id.email': { $exists: true, $ne: null } },
              { 
                $and: [
                  { '_id.firstName': { $exists: true, $ne: null } },
                  { '_id.lastName': { $exists: true, $ne: null } }
                ]
              }
            ]
          }}
        ]).option({ maxTimeMS: 300000 }); // 5 minute timeout for the aggregation
        
        console.log(`Found ${uniqueAgents.length} unique agents in this organization`);
        
        // Create agents in the database
        for (let i = 0; i < uniqueAgents.length; i++) {
          try {
            const agentData = uniqueAgents[i].agent;
            const key = agentData.id || agentData.email || `${agentData.firstName}-${agentData.lastName}`;
            
            console.log(`Processing agent ${i+1}/${uniqueAgents.length}: ${key}`);
            
            // Check if agent already exists
            let agent = null;
            if (agentData.id) {
              agent = await Agent.findOne({
                organizationId: new mongoose.Types.ObjectId(orgId),
                externalId: agentData.id
              });
            }
            
            if (!agent && agentData.email) {
              agent = await Agent.findOne({
                organizationId: new mongoose.Types.ObjectId(orgId),
                email: agentData.email
              });
            }
            
            // If agent doesn't exist, create a new one
            if (!agent) {
              agent = new Agent({
                externalId: agentData.id,
                firstName: agentData.firstName,
                lastName: agentData.lastName,
                email: agentData.email,
                phone: agentData.phone,
                organizationId: new mongoose.Types.ObjectId(orgId),
                status: 'active',
                createdAt: new Date()
              });
              
              await agent.save();
              totalAgentsCreated++;
              console.log(`Created agent: ${agent.firstName || ''} ${agent.lastName || ''} (${agent._id})`);
            } else {
              console.log(`Agent already exists: ${agent.firstName || ''} ${agent.lastName || ''} (${agent._id})`);
            }
            
            // Update transcripts in batches with longer timeouts
            const query = {
              organizationId: new mongoose.Types.ObjectId(orgId),
              'callDetails.agent': { $exists: true },
              agentId: { $exists: false }
            };
            
            // Add proper agent identifier
            if (agentData.id) {
              query['callDetails.agent.id'] = agentData.id;
            } else if (agentData.email) {
              query['callDetails.agent.email'] = agentData.email;
            } else {
              if (agentData.firstName) query['callDetails.agent.firstName'] = agentData.firstName;
              if (agentData.lastName) query['callDetails.agent.lastName'] = agentData.lastName;
            }
            
            // Update all matching transcripts at once with timeout protection
            const updateResult = await Promise.race([
              Transcript.updateMany(query, { $set: { agentId: agent._id } }).maxTimeMS(120000),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Update timed out')), 120000))
            ]);
            
            console.log(`Updated ${updateResult.modifiedCount} transcripts for agent ${agent._id}`);
          } catch (agentError) {
            console.error(`Error processing agent: ${agentError.message}`);
            // Continue with next agent
          }
        }
      } catch (orgError) {
        console.error(`Error processing organization ${org._id}: ${orgError.message}`);
        // Continue with next organization
      }
    }
    
    console.log('\nMigration completed successfully');
    console.log(`Total agents created: ${totalAgentsCreated}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
migrateAgentData().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
}); 