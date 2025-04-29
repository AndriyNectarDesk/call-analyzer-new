/**
 * Script to fetch detailed data for agent Shay Pearce from Beltone organization
 */

const { MongoClient, ObjectId } = require('mongodb');

// Shay Pearce agent ID (from previous output)
const AGENT_ID = '680fde1d0dfc32d279f7374d';

// Connection URI
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/test?retryWrites=true&w=majority&appName=CallAnalyzer';

async function getShayPearceData() {
  let client;
  
  try {
    console.log('Connecting to MongoDB directly...');
    client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    const agentsCollection = db.collection('agents');
    const transcriptsCollection = db.collection('transcripts');
    
    // Get Shay Pearce's agent data
    const agent = await agentsCollection.findOne({ 
      _id: new ObjectId(AGENT_ID)
    });
    
    if (!agent) {
      console.log('Agent not found!');
      return;
    }
    
    console.log('\n======== AGENT PROFILE ========');
    
    // Display basic info
    const basicInfo = {
      _id: agent._id,
      externalId: agent.externalId,
      name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
      email: agent.email || 'N/A',
      phone: agent.phone || 'N/A',
      status: agent.status,
      department: agent.department || 'N/A',
      position: agent.position || 'N/A',
      hireDate: agent.hireDate || 'N/A',
      skills: agent.skills || []
    };
    
    console.log(JSON.stringify(basicInfo, null, 2));
    
    // Display current period metrics
    console.log('\n======== CURRENT PERIOD PERFORMANCE METRICS ========');
    
    if (agent.performanceMetrics && agent.performanceMetrics.currentPeriod) {
      const currentPeriod = agent.performanceMetrics.currentPeriod;
      
      // Format dates to be more readable
      const formattedPeriod = {
        ...currentPeriod,
        startDate: new Date(currentPeriod.startDate).toLocaleDateString(),
        endDate: new Date(currentPeriod.endDate).toLocaleDateString()
      };
      
      console.log(JSON.stringify(formattedPeriod, null, 2));
    } else {
      console.log('No current period metrics found!');
    }
    
    // Display historical data summary
    console.log('\n======== HISTORICAL DATA ========');
    
    if (agent.performanceMetrics && agent.performanceMetrics.historical && agent.performanceMetrics.historical.length > 0) {
      console.log(`Found ${agent.performanceMetrics.historical.length} historical entries`);
      
      // Show first historical entry
      const historicalEntry = agent.performanceMetrics.historical[0];
      
      // Format dates
      const formattedEntry = {
        ...historicalEntry,
        startDate: new Date(historicalEntry.startDate).toLocaleDateString(),
        endDate: new Date(historicalEntry.endDate).toLocaleDateString(),
        periodName: historicalEntry.periodName
      };
      
      console.log('\nMost Recent Historical Entry:');
      console.log(JSON.stringify(formattedEntry, null, 2));
    } else {
      console.log('No historical data found!');
    }
    
    // Get transcript data summary
    console.log('\n======== TRANSCRIPT SUMMARY ========');
    
    const transcriptCount = await transcriptsCollection.countDocuments({
      agentId: new ObjectId(AGENT_ID)
    });
    
    console.log(`Total transcripts for Shay Pearce: ${transcriptCount}`);
    
    // Get sample transcript
    if (transcriptCount > 0) {
      const transcript = await transcriptsCollection.findOne({
        agentId: new ObjectId(AGENT_ID)
      });
      
      console.log('\nSample Transcript Details:');
      
      // Only show metadata, not the full transcript which would be too large
      const transcriptMeta = {
        _id: transcript._id,
        callDate: transcript.callDetails?.startedDate 
          ? new Date(transcript.callDetails.startedDate).toLocaleString() 
          : 'N/A',
        duration: transcript.callDetails?.duration || 'N/A',
        hasAnalysis: !!transcript.analysis,
        scores: transcript.analysis?.scorecard || 'N/A',
        strengths: transcript.analysis?.agentPerformance?.strengths || [],
        improvements: transcript.analysis?.agentPerformance?.areasForImprovement || []
      };
      
      console.log(JSON.stringify(transcriptMeta, null, 2));
    }
    
  } catch (error) {
    console.error('Error retrieving agent data:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\nDisconnected from MongoDB');
    }
  }
}

// Run the function
getShayPearceData(); 