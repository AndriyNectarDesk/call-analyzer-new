/**
 * Script to fix Beltone agent names from transcript data
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Beltone organization ID
const BELTONE_ORG_ID = '6803d34e2ee3fb8ef1971aac';

// Connection URI
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/test?retryWrites=true&w=majority&appName=CallAnalyzer';

async function fixBeltoneAgentNames() {
  let client;
  
  try {
    console.log('Connecting to MongoDB directly...');
    client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    const agentsCollection = db.collection('agents');
    const transcriptsCollection = db.collection('transcripts');
    
    // Get all Beltone agents
    const agents = await agentsCollection.find({ 
      organizationId: new ObjectId(BELTONE_ORG_ID)
    }).toArray();
    
    console.log(`Found ${agents.length} Beltone agents to process`);
    let updatedCount = 0;
    
    // Process each agent
    for (const agent of agents) {
      console.log(`Processing agent ${agent._id} (externalId: ${agent.externalId})`);
      
      // Find a transcript with this agent's ID
      const transcript = await transcriptsCollection.findOne({
        agentId: agent._id,
        'callDetails.agent': { $exists: true }
      });
      
      if (transcript && transcript.callDetails && transcript.callDetails.agent) {
        const agentDetails = transcript.callDetails.agent;
        const updateData = {};
        let shouldUpdate = false;
        
        // Check if agent has a name in transcript
        if (agentDetails.name) {
          // Split the name (usually in format "First Last")
          const nameParts = agentDetails.name.split(' ');
          
          if (nameParts.length >= 2) {
            // Use last part as lastName, everything else as firstName
            const lastName = nameParts.pop();
            const firstName = nameParts.join(' ');
            
            updateData.firstName = firstName;
            updateData.lastName = lastName;
            shouldUpdate = true;
          } else if (nameParts.length === 1) {
            // Only one name part, use as firstName
            updateData.firstName = agentDetails.name;
            shouldUpdate = true;
          }
        }
        
        // Check for other fields
        if (agentDetails.email && (!agent.email || agent.email === null)) {
          updateData.email = agentDetails.email;
          shouldUpdate = true;
        }
        
        if (agentDetails.phone && (!agent.phone || agent.phone === null)) {
          updateData.phone = agentDetails.phone;
          shouldUpdate = true;
        }
        
        // Update the agent if we have new data
        if (shouldUpdate) {
          await agentsCollection.updateOne(
            { _id: agent._id },
            { $set: updateData }
          );
          
          console.log(`Updated agent ${agent._id} with:`, updateData);
          updatedCount++;
        } else {
          console.log(`No name information found for agent ${agent._id}`);
        }
      } else {
        console.log(`No transcript found with agent information for ${agent._id}`);
      }
    }
    
    console.log(`Updated ${updatedCount} out of ${agents.length} agents`);
    
  } catch (error) {
    console.error('Error fixing agent names:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
fixBeltoneAgentNames(); 