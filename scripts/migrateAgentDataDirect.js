/**
 * Migration script to populate the Agent collection from existing transcript data
 * Using direct MongoDB native driver to avoid Mongoose connection issues
 * 
 * Usage: node scripts/migrateAgentDataDirect.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function migrateAgentData() {
  // Get MongoDB URI from environment
  const mongoURI = process.env.MONGODB_URI;
  let client;
  
  try {
    console.log('Connecting to database using MongoDB native driver...');
    
    // Connect with extended timeouts
    client = new MongoClient(mongoURI, {
      serverSelectionTimeoutMS: 120000, // 2 minutes
      connectTimeoutMS: 120000,
      socketTimeoutMS: 120000,
      maxPoolSize: 10
    });
    
    await client.connect();
    console.log('Connection successful!');
    
    // Get database from URI
    const dbName = mongoURI.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    console.log(`Connected to database: ${dbName}`);
    
    // Get collections
    const orgsCollection = db.collection('organizations');
    const transcriptsCollection = db.collection('transcripts');
    const agentsCollection = db.collection('agents');
    
    // Ensure indexes for better performance
    console.log('Ensuring indexes...');
    await agentsCollection.createIndex({ "organizationId": 1, "externalId": 1 }, { unique: true, sparse: true });
    await agentsCollection.createIndex({ "organizationId": 1, "email": 1 }, { sparse: true });
    await agentsCollection.createIndex({ "organizationId": 1, "status": 1 });
    
    // Get all organizations
    console.log('Fetching organizations...');
    const organizations = await orgsCollection.find({}).toArray();
    console.log(`Found ${organizations.length} organizations`);
    
    let totalAgentsCreated = 0;
    let totalTranscriptsUpdated = 0;
    
    // Process each organization
    for (const org of organizations) {
      try {
        const orgId = org._id;
        console.log(`\n===== Processing organization: ${org.name || 'Unnamed'} (${orgId}) =====`);
        
        // Find all unique agent data in this organization using aggregation
        console.log('Finding all unique agent data in transcripts...');
        
        const uniqueAgents = await transcriptsCollection.aggregate([
          // Match transcripts for this organization with agent data
          { $match: { 
            organizationId: orgId, 
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
        ], { maxTimeMS: 120000 }).toArray(); // 2 minute timeout for the aggregation
        
        console.log(`Found ${uniqueAgents.length} unique agents in this organization`);
        
        // Create agents and update transcripts
        for (let i = 0; i < uniqueAgents.length; i++) {
          try {
            const agentData = uniqueAgents[i].agent;
            const key = agentData.id || agentData.email || `${agentData.firstName}-${agentData.lastName}`;
            
            console.log(`Processing agent ${i+1}/${uniqueAgents.length}: ${key}`);
            
            // Check if agent already exists using appropriate query
            const query = { organizationId: orgId };
            if (agentData.id) {
              query.externalId = agentData.id;
            } else if (agentData.email) {
              query.email = agentData.email;
            } else {
              // If using names, continue with next agent if not enough data
              if (!agentData.firstName || !agentData.lastName) {
                console.log('Skipping agent due to insufficient identification data');
                continue;
              }
              query.firstName = agentData.firstName;
              query.lastName = agentData.lastName;
            }
            
            // Try to find existing agent
            let agent = await agentsCollection.findOne(query);
            
            // If agent doesn't exist, create a new one
            if (!agent) {
              const newAgent = {
                externalId: agentData.id,
                firstName: agentData.firstName,
                lastName: agentData.lastName,
                email: agentData.email,
                phone: agentData.phone,
                organizationId: orgId,
                status: 'active',
                performanceMetrics: {
                  currentPeriod: {},
                  historical: []
                },
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              const result = await agentsCollection.insertOne(newAgent);
              agent = { _id: result.insertedId, ...newAgent };
              totalAgentsCreated++;
              console.log(`Created agent: ${agent.firstName || ''} ${agent.lastName || ''} (${agent._id})`);
            } else {
              console.log(`Agent already exists: ${agent.firstName || ''} ${agent.lastName || ''} (${agent._id})`);
            }
            
            // Update transcripts in batches with longer timeouts
            const updateQuery = {
              organizationId: orgId,
              'callDetails.agent': { $exists: true },
              agentId: { $exists: false }
            };
            
            // Add proper agent identifier to match transcripts
            if (agentData.id) {
              updateQuery['callDetails.agent.id'] = agentData.id;
            } else if (agentData.email) {
              updateQuery['callDetails.agent.email'] = agentData.email;
            } else {
              if (agentData.firstName) updateQuery['callDetails.agent.firstName'] = agentData.firstName;
              if (agentData.lastName) updateQuery['callDetails.agent.lastName'] = agentData.lastName;
            }
            
            // Update all matching transcripts
            const updateResult = await transcriptsCollection.updateMany(
              updateQuery,
              { $set: { agentId: agent._id } },
              { maxTimeMS: 60000 }  // 1 minute timeout
            );
            
            totalTranscriptsUpdated += updateResult.modifiedCount;
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
    console.log(`Total transcripts updated: ${totalTranscriptsUpdated}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed');
    }
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