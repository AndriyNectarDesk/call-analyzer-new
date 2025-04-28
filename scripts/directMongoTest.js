/**
 * Direct MongoDB connection test
 * 
 * This script tests connecting directly to MongoDB using the native driver
 * rather than through Mongoose to diagnose connection issues.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testDirectConnection() {
  // Extract connection details from the MONGODB_URI
  const mongoURI = process.env.MONGODB_URI;
  let client;
  
  try {
    console.log('Attempting direct MongoDB connection...');
    
    // Connect directly with very long timeout
    client = new MongoClient(mongoURI, {
      serverSelectionTimeoutMS: 60000, // 1 minute
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxPoolSize: 5
    });
    
    // Connect to the server
    await client.connect();
    console.log('Connection successful!');
    
    // Get database name from URI
    const dbName = mongoURI.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    console.log(`Connected to database: ${dbName}`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Check 'organizations' collection
    console.log('\nChecking organizations collection...');
    const orgsCollection = db.collection('organizations');
    const orgCount = await orgsCollection.countDocuments();
    console.log(`Found ${orgCount} organizations`);
    
    if (orgCount > 0) {
      // Get one organization
      const org = await orgsCollection.findOne({});
      console.log('Sample organization:');
      console.log(`- ID: ${org._id}`);
      console.log(`- Name: ${org.name || 'Unnamed'}`);
      
      // Check for transcripts
      console.log('\nChecking transcripts collection...');
      const transcriptsCollection = db.collection('transcripts');
      const transcriptCount = await transcriptsCollection.countDocuments({
        organizationId: org._id
      });
      console.log(`Found ${transcriptCount} transcripts for this organization`);
      
      // Create a test agent collection if it doesn't exist
      if (!collections.some(c => c.name === 'agents')) {
        console.log('\nCreating agents collection...');
        await db.createCollection('agents');
        console.log('Agents collection created');
      }
      
      // Insert a test agent
      console.log('\nInserting a test agent...');
      const agentsCollection = db.collection('agents');
      const agent = {
        externalId: 'TEST-DIRECT-001',
        firstName: 'Direct',
        lastName: 'Test',
        email: 'direct.test@example.com',
        organizationId: org._id,
        status: 'active',
        createdAt: new Date()
      };
      
      const result = await agentsCollection.insertOne(agent);
      console.log(`Agent inserted with ID: ${result.insertedId}`);
      
      // Update a transcript to reference this agent
      if (transcriptCount > 0) {
        console.log('\nUpdating a transcript to reference the agent...');
        const transcript = await transcriptsCollection.findOne({
          organizationId: org._id,
          'callDetails.agent': { $exists: true }
        });
        
        if (transcript) {
          await transcriptsCollection.updateOne(
            { _id: transcript._id },
            { $set: { agentId: result.insertedId } }
          );
          console.log(`Updated transcript ${transcript._id} with agent reference`);
        } else {
          console.log('No suitable transcript found to update');
        }
      }
    }
    
    console.log('\nDatabase test completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the test
testDirectConnection().catch(console.error); 