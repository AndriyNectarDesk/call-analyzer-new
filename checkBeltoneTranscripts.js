/**
 * Simplified script to check Beltone transcripts without updating agents
 * Just diagnostic information
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Beltone organization ID
const BELTONE_ORG_ID = '6803d34e2ee3fb8ef1971aac';

// Connection URI
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/test?retryWrites=true&w=majority&appName=CallAnalyzer';

async function checkBeltoneData() {
  let client;
  
  try {
    console.log('Connecting to MongoDB directly...');
    const { MongoClient } = require('mongodb');
    
    // Connect using direct MongoDB driver
    client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000
    });
    
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    
    // 1. Check organization exists
    const orgsCollection = db.collection('organizations');
    const organization = await orgsCollection.findOne({ _id: new ObjectId(BELTONE_ORG_ID) });
    
    if (organization) {
      console.log(`Found Beltone organization: ${organization.name || 'Unnamed'}`);
    } else {
      console.log('Beltone organization not found with that ID!');
    }
    
    // 2. Check agents
    const agentsCollection = db.collection('agents');
    const agents = await agentsCollection.find({ 
      organizationId: new ObjectId(BELTONE_ORG_ID)
    }).limit(10).toArray();
    
    console.log(`Found ${agents.length} agents for Beltone (showing first 10)`);
    
    // Show first agent as sample
    if (agents.length > 0) {
      console.log('First agent sample:');
      console.log(JSON.stringify(agents[0], null, 2));
    }
    
    // 3. Check transcripts
    const transcriptsCollection = db.collection('transcripts');
    const transcriptCount = await transcriptsCollection.countDocuments({
      organizationId: new ObjectId(BELTONE_ORG_ID)
    });
    
    console.log(`Total Beltone transcripts: ${transcriptCount}`);
    
    // Get sample transcript
    if (transcriptCount > 0) {
      const transcript = await transcriptsCollection.findOne({
        organizationId: new ObjectId(BELTONE_ORG_ID)
      });
      
      console.log('Sample transcript metadata:');
      
      // Just show relevant fields, not the full transcript
      const metadata = {
        _id: transcript._id,
        agentId: transcript.agentId,
        hasCallDetails: !!transcript.callDetails,
        hasAnalysis: !!transcript.analysis,
        hasScorecard: !!(transcript.analysis && transcript.analysis.scorecard),
        callDuration: transcript.callDetails?.duration,
        agent: transcript.callDetails?.agent
      };
      
      console.log(JSON.stringify(metadata, null, 2));
      
      // 4. Check if any transcript is linked to an agent
      const linkedTranscripts = await transcriptsCollection.countDocuments({
        organizationId: new ObjectId(BELTONE_ORG_ID),
        agentId: { $exists: true, $ne: null }
      });
      
      console.log(`Transcripts with linked agents: ${linkedTranscripts}/${transcriptCount}`);
      
      if (linkedTranscripts > 0) {
        const linkedSample = await transcriptsCollection.findOne({
          organizationId: new ObjectId(BELTONE_ORG_ID),
          agentId: { $exists: true, $ne: null }
        });
        
        if (linkedSample) {
          console.log('Sample linked transcript:');
          console.log(JSON.stringify({
            transcriptId: linkedSample._id,
            agentId: linkedSample.agentId,
            agent: linkedSample.callDetails?.agent
          }, null, 2));
          
          // Check if linked agent exists
          const linkedAgent = await agentsCollection.findOne({
            _id: linkedSample.agentId
          });
          
          if (linkedAgent) {
            console.log('Linked agent exists with ID:', linkedSample.agentId);
          } else {
            console.log('WARNING: Linked agent does not exist with ID:', linkedSample.agentId);
          }
        }
      } else {
        console.log('No transcripts are linked to agents. This is the root issue!');
      }
    }
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
checkBeltoneData(); 